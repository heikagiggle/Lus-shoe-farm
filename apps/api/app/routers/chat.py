import asyncio
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..db import SessionLocal, get_db
from ..models import ChatMessage, User
from ..schemas import ChatIn, ChatOut, ChatReplyIn, ChatThreadOut
from ..security import get_optional_user, require_admin, user_from_token
from ..services.realtime import hub

GUEST_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")
customer = APIRouter(prefix="/chat", tags=["chat"])
admin = APIRouter(prefix="/admin/chat", tags=["admin-chat"], dependencies=[Depends(require_admin)])
ws_router = APIRouter()


def _payload(m: ChatMessage) -> dict:
    return {"type": "message", "thread_key": m.thread_key, "message": ChatOut.model_validate(m).model_dump(mode="json")}


def thread_for(user: User | None, guest_id: str | None) -> str:
    if user:
        return f"u{user.id}"
    if guest_id and GUEST_RE.match(guest_id):
        return f"g{guest_id}"
    raise HTTPException(400, "Missing chat identity")


# ---------------- customer REST ----------------
@customer.get("/history", response_model=list[ChatOut])
def history(guest_id: str | None = None, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    key = thread_for(user, guest_id)
    db.query(ChatMessage).filter(ChatMessage.thread_key == key, ChatMessage.sender == "admin").update({"read_by_customer": True})
    db.commit()
    return db.query(ChatMessage).filter(ChatMessage.thread_key == key).order_by(ChatMessage.id).limit(200).all()


@customer.post("/messages", response_model=ChatOut)
def send(body: ChatIn, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    key = thread_for(user, body.guest_id)
    since = datetime.now(timezone.utc) - timedelta(minutes=1)
    if db.query(ChatMessage).filter(ChatMessage.thread_key == key, ChatMessage.sender == "customer", ChatMessage.created_at > since).count() >= 20:
        raise HTTPException(429, "You're sending messages too quickly. Wait a moment.")
    m = ChatMessage(thread_key=key, user_id=user.id if user else None, sender="customer", body=body.body.strip(), read_by_customer=True)
    db.add(m)
    db.commit()
    hub.push_admin(_payload(m))
    hub.push_thread(key, _payload(m))
    return m


# ---------------- admin REST ----------------
@admin.get("/unread")
def unread(db: Session = Depends(get_db)):
    n = db.query(ChatMessage).filter(ChatMessage.sender == "customer", ChatMessage.read_by_admin.is_(False)).count()
    return {"unread": n}


@admin.get("/threads", response_model=list[ChatThreadOut])
def threads(db: Session = Depends(get_db)):
    rows = (
        db.query(
            ChatMessage.thread_key, func.max(ChatMessage.id).label("last_id"),
            func.sum(case((((ChatMessage.sender == "customer") & (ChatMessage.read_by_admin.is_(False))), 1), else_=0)).label("unread"),
        ).group_by(ChatMessage.thread_key).order_by(func.max(ChatMessage.id).desc()).limit(100).all()
    )
    out = []
    for key, last_id, unread_n in rows:
        last = db.get(ChatMessage, last_id)
        user = db.get(User, int(key[1:])) if key.startswith("u") else None
        name = (f"{user.first_name} {user.last_name}".strip() or user.email) if user else f"Guest ····{key[-4:]}"
        out.append(ChatThreadOut(thread_key=key, name=name, email=user.email if user else None,
                                 last_message=last.body[:80], last_at=last.created_at, unread=int(unread_n or 0)))
    return out


@admin.get("/threads/{key}", response_model=list[ChatOut])
def thread(key: str, db: Session = Depends(get_db)):
    return db.query(ChatMessage).filter(ChatMessage.thread_key == key).order_by(ChatMessage.id).limit(500).all()


@admin.post("/threads/{key}/read")
def mark_thread_read(key: str, db: Session = Depends(get_db)):
    db.query(ChatMessage).filter(ChatMessage.thread_key == key, ChatMessage.sender == "customer").update({"read_by_admin": True})
    db.commit()
    return {"ok": True}


@admin.post("/threads/{key}/messages", response_model=ChatOut)
def reply(key: str, body: ChatReplyIn, db: Session = Depends(get_db)):
    if not db.query(ChatMessage).filter(ChatMessage.thread_key == key).first():
        raise HTTPException(404, "Conversation not found")
    m = ChatMessage(thread_key=key, sender="admin", body=body.body.strip(), read_by_admin=True)
    db.add(m)
    db.query(ChatMessage).filter(ChatMessage.thread_key == key, ChatMessage.sender == "customer").update({"read_by_admin": True})
    db.commit()
    hub.push_thread(key, _payload(m))
    hub.push_admin(_payload(m))
    return m


# ---------------- WebSockets (auth is the first frame, so tokens never appear in URLs) ----------------
async def _first_frame(ws: WebSocket) -> dict | None:
    await ws.accept()
    try:
        data = await asyncio.wait_for(ws.receive_json(), timeout=8)
        return data if isinstance(data, dict) else None
    except Exception:
        return None


@ws_router.websocket("/ws/chat/{thread_key}")
async def customer_socket(ws: WebSocket, thread_key: str):
    first = await _first_frame(ws)
    if first is None:
        return await ws.close(code=4400)
    if thread_key.startswith("u"):
        db = SessionLocal()
        try:
            user = user_from_token(db, first.get("token"), "customer")
            if f"u{user.id}" != thread_key:
                raise HTTPException(403)
        except Exception:
            return await ws.close(code=4401)
        finally:
            db.close()
    elif not (thread_key.startswith("g") and GUEST_RE.match(thread_key[1:])):
        return await ws.close(code=4400)
    hub.threads.setdefault(thread_key, set()).add(ws)
    await ws.send_json({"type": "ready"})
    try:
        while True:
            await ws.receive_text()  # keep-alive pings; sending goes through REST
    except WebSocketDisconnect:
        pass
    finally:
        hub.threads.get(thread_key, set()).discard(ws)


@ws_router.websocket("/ws/admin")
async def admin_socket(ws: WebSocket):
    first = await _first_frame(ws)
    if first is None:
        return await ws.close(code=4400)
    db = SessionLocal()
    try:
        user_from_token(db, first.get("token"), "admin")
    except Exception:
        return await ws.close(code=4401)
    finally:
        db.close()
    hub.admins.add(ws)
    await ws.send_json({"type": "ready"})
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        hub.admins.discard(ws)
