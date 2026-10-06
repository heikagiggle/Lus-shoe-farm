import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Order
from ..schemas import OrderOut
from ..services import paystack

router = APIRouter(prefix="/payments/paystack", tags=["payments"])
log = logging.getLogger("lsf.payments")


def _order(db: Session, ref: str) -> Order | None:
    return db.query(Order).filter(Order.reference == ref).one_or_none()


@router.post("/webhook")
async def webhook(request: Request, background: BackgroundTasks, db: Session = Depends(get_db)):
    raw = await request.body()
    if not paystack.verify_signature(raw, request.headers.get("x-paystack-signature")):
        raise HTTPException(401, "Invalid signature")
    event = json.loads(raw)
    if event.get("event") == "charge.success":
        data = event["data"]
        order = _order(db, data.get("reference", ""))
        if order and data.get("status") == "success" and paystack.amount_ok(order, data):
            paystack.mark_paid(db, order, background)
        elif order:
            log.warning("Webhook amount/status mismatch for %s", order.reference)
    return {"status": "ok"}  # always 200 so Paystack stops retrying


@router.get("/verify/{reference}", response_model=OrderOut)
def verify(reference: str, background: BackgroundTasks, db: Session = Depends(get_db)):
    order = _order(db, reference)
    if not order:
        raise HTTPException(404, "Order not found")
    if order.payment_status == "paid":
        return order
    if paystack.use_mock():
        return paystack.mark_paid(db, order, background)  # local dev only
    try:
        data = paystack.fetch_verification(reference)
    except Exception as exc:
        raise HTTPException(502, "Could not reach Paystack to verify payment.") from exc
    if data.get("status") == "success" and paystack.amount_ok(order, data):
        paystack.mark_paid(db, order, background)
    return order
