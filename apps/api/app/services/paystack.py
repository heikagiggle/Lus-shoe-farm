"""Paystack Direct Bank Transfer integration (cards disabled via channels=['bank_transfer'])."""
import hashlib
import hmac
import logging
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Order
from . import email as mail
from .inventory import deduct_stock
from .notify import notify_admins

log = logging.getLogger("lsf.paystack")


def _headers():
    return {"Authorization": f"Bearer {settings.paystack_secret_key}"}


def use_mock() -> bool:
    return settings.paystack_mock or settings.paystack_secret_key.endswith("placeholder")


def initialize(order: Order) -> dict:
    if use_mock():
        return {"mock": True, "access_code": None, "authorization_url": None}
    try:
        r = httpx.post(
            f"{settings.paystack_base_url}/transaction/initialize",
            headers=_headers(),
            json={
                "email": order.email,
                "amount": order.total * 100,  # kobo
                "currency": "NGN",
                "reference": order.reference,
                "channels": ["bank_transfer"],
            },
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()["data"]
    except Exception as exc:
        log.exception("Paystack initialize failed")
        raise HTTPException(502, "Could not start payment. Please try again.") from exc
    return {"mock": False, "access_code": data["access_code"], "authorization_url": data["authorization_url"]}


def verify_signature(raw_body: bytes, signature: str | None) -> bool:
    if not signature:
        return False
    expected = hmac.new(settings.paystack_secret_key.encode(), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(expected, signature)


def fetch_verification(reference: str) -> dict:
    r = httpx.get(f"{settings.paystack_base_url}/transaction/verify/{reference}", headers=_headers(), timeout=20)
    r.raise_for_status()
    return r.json()["data"]


def mark_paid(db: Session, order: Order, background=None) -> Order:
    """Idempotent: awaiting_payment -> pending (paid), deduct stock, send receipt."""
    if order.payment_status == "paid":
        return order
    order.payment_status = "paid"
    order.status = "pending"
    order.paid_at = datetime.now(timezone.utc)
    deduct_stock(db, order)
    db.commit()
    notify_admins(db, "order", f"New paid order {order.reference}", f"NGN {order.total:,} from {order.name or order.email}")
    subject, body = mail.order_receipt(order)
    if background:
        background.add_task(mail.send_email, order.email, subject, body)
    else:
        mail.send_email(order.email, subject, body)
    return order


def amount_ok(order: Order, data: dict) -> bool:
    return data.get("currency", "NGN") == "NGN" and int(data.get("amount", 0)) >= order.total * 100
