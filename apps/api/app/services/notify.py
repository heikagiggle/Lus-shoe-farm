from sqlalchemy.orm import Session

from ..models import Notification
from ..schemas import NotificationOut
from .realtime import hub


def notify_admins(db: Session, type_: str, title: str, body: str = "") -> None:
    n = Notification(type=type_, title=title, body=body)
    db.add(n)
    db.commit()
    hub.push_admin({"type": "notification", "notification": NotificationOut.model_validate(n).model_dump(mode="json")})
