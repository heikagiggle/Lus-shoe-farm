import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..models import OtpCode


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _hash(email: str, code: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), f"{email}:{code}".encode(), hashlib.sha256).hexdigest()


def issue(db: Session, email: str) -> str:
    now = datetime.now(timezone.utc)
    last = db.query(OtpCode).filter(OtpCode.email == email).order_by(OtpCode.id.desc()).first()
    if last:
        wait = settings.otp_resend_seconds - (now - _aware(last.created_at)).total_seconds()
        if wait > 0:
            raise HTTPException(429, f"Please wait {int(wait) + 1}s before requesting another code.")
    recent = db.query(OtpCode).filter(OtpCode.email == email, OtpCode.created_at > now - timedelta(minutes=15)).count()
    if recent >= settings.otp_max_per_15min:
        raise HTTPException(429, "Too many code requests. Try again in a few minutes.")
    db.query(OtpCode).filter(OtpCode.email == email, OtpCode.used.is_(False)).update({"used": True})
    code = f"{secrets.randbelow(10**6):06d}"
    db.add(OtpCode(email=email, code_hash=_hash(email, code), expires_at=now + timedelta(minutes=settings.otp_ttl_minutes)))
    db.commit()
    return code


def verify(db: Session, email: str, code: str) -> bool:
    otp = db.query(OtpCode).filter(OtpCode.email == email, OtpCode.used.is_(False)).order_by(OtpCode.id.desc()).first()
    if not otp or _aware(otp.expires_at) < datetime.now(timezone.utc):
        return False
    otp.attempts += 1
    if otp.attempts > settings.otp_max_attempts:
        otp.used = True
        db.commit()
        return False
    ok = hmac.compare_digest(otp.code_hash, _hash(email, code))
    if ok:
        otp.used = True
    db.commit()
    return ok
