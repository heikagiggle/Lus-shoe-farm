"""Inventory engine: validation on order creation, deduction on payment, sold-out automation."""
import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import Order, Product, ProductVariant

log = logging.getLogger("lsf.inventory")


def resolve_cart(db: Session, lines) -> list[tuple[ProductVariant, int]]:
    """Validate every line against live stock. Raises 409 with a user-readable message."""
    merged: dict[int, int] = {}
    for line in lines:
        merged[line.variant_id] = merged.get(line.variant_id, 0) + line.quantity
    variants = db.query(ProductVariant).filter(ProductVariant.id.in_(merged.keys())).all()
    by_id = {v.id: v for v in variants}
    resolved = []
    for vid, qty in merged.items():
        v = by_id.get(vid)
        if not v or not v.product.is_active:
            raise HTTPException(409, "An item in your cart is no longer available.")
        if v.stock < qty:
            left = f"only {v.stock} left" if v.stock > 0 else "sold out"
            raise HTTPException(409, f"{v.product.name} (size {v.size}, {v.color}): {left}.")
        resolved.append((v, qty))
    return resolved


def refresh_sold_out(product: Product) -> None:
    product.is_sold_out = sum(v.stock for v in product.variants) <= 0


def deduct_stock(db: Session, order: Order) -> None:
    """Idempotent. Called once when payment is confirmed."""
    if order.stock_deducted:
        return
    oversold = []
    for item in order.items:
        if not item.variant_id:
            continue
        v = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).with_for_update().one_or_none()
        if not v:
            continue
        if v.stock < item.quantity:
            oversold.append(f"{item.name} ({item.size}/{item.color}) short by {item.quantity - v.stock}")
        v.stock = max(0, v.stock - item.quantity)
        refresh_sold_out(v.product)
    order.stock_deducted = True
    if oversold:
        order.notes = (order.notes + "\nOVERSOLD - review/refund: " + "; ".join(oversold)).strip()
        log.warning("Order %s oversold: %s", order.reference, oversold)
