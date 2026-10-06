from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Notification
from ..schemas import IdsIn, NotificationList
from ..security import require_admin

router = APIRouter(prefix="/notifications", tags=["notifications"], dependencies=[Depends(require_admin)])


@router.get("", response_model=NotificationList)
def list_notifications(db: Session = Depends(get_db)):
    items = db.query(Notification).order_by(Notification.id.desc()).limit(100).all()
    unread = db.query(Notification).filter(Notification.is_read.is_(False)).count()
    return NotificationList(items=items, unread_count=unread)


@router.post("/mark-read")
def mark_read(db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.is_read.is_(False)).update({"is_read": True})
    db.commit()
    return {"ok": True}


@router.delete("/batch")  # declared before /{id}
def delete_batch(body: IdsIn, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id.in_(body.ids)).delete(synchronize_session=False)
    db.commit()
    return {"deleted": n}


@router.delete("/{nid}", status_code=204)
def delete_one(nid: int, db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.id == nid).delete()
    db.commit()
