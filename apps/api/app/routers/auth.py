from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ChatMessage, OtpCode, User
from ..schemas import LoginIn, OtpRequestIn, OtpVerifyIn, ProfileOut, TokenOut, VerifyOut
from ..security import create_token, get_current_user, verify_password
from ..services import email as mail
from ..services import otp
from ..services.notify import notify_admins

router = APIRouter(prefix="/auth", tags=["auth"])


def display_name(u: User) -> str:
    full = f"{u.first_name} {u.last_name}".strip()
    return full or u.email.split("@")[0].replace(".", " ").replace("_", " ").title()


def profile_out(u: User) -> ProfileOut:
    data = {c: getattr(u, c) for c in ProfileOut.model_fields if c != "display_name"}
    return ProfileOut(**data, display_name=display_name(u))


@router.post("/login", response_model=TokenOut)  # admin (password) login
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).one_or_none()
    if not user or not verify_password(body.password, user.hashed_password) or not user.is_admin:
        raise HTTPException(401, "Incorrect email or password")
    return TokenOut(access_token=create_token(user, "admin"))


@router.post("/request-otp")
def request_otp(body: OtpRequestIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    email = body.email.lower()
    code = otp.issue(db, email)
    background.add_task(
        mail.send_email, email, "Your Lu's Shoe Farm sign-in code",
        f"Your code is {code}. It expires in 10 minutes. If you didn't ask for it, ignore this email.\n",
    )
    return {"sent": True}  # same answer whether or not the account exists


@router.post("/verify-otp", response_model=VerifyOut)
def verify_otp(body: OtpVerifyIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if not otp.verify(db, email, body.code):
        raise HTTPException(400, "That code is incorrect or has expired.")
    user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).one_or_none()
    is_new = user is None
    if is_new:
        user = User(email=email, hashed_password="", is_admin=False)
        db.add(user)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    if is_new:
        notify_admins(db, "signup", "New customer signup", email)
    return VerifyOut(access_token=create_token(user, "customer"), is_new=is_new, user=profile_out(user))


@router.delete("/account", status_code=204)
def delete_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Soft delete: PII is scrubbed, every session is revoked, order records stay for accounting."""
    db.query(ChatMessage).filter(ChatMessage.thread_key == f"u{user.id}").delete()
    db.query(OtpCode).filter(OtpCode.email == user.email).delete()
    user.email = f"deleted-{user.id}@deleted.invalid"
    user.first_name = user.last_name = user.address = user.city = user.state = user.postal_code = user.phone = ""
    user.marketing_opt_in = False
    user.deleted_at = datetime.now(timezone.utc)
    user.token_version += 1
    db.commit()
