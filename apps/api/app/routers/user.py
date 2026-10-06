from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Order, User
from ..schemas import OrderOut, ProfileOut, ProfilePatch
from ..security import get_current_user
from .auth import profile_out

router = APIRouter(prefix="/user", tags=["customer"])


@router.get("/profile", response_model=ProfileOut)
def get_profile(user: User = Depends(get_current_user)):
    return profile_out(user)


@router.patch("/profile", response_model=ProfileOut)
def patch_profile(body: ProfilePatch, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is None:
            continue
        setattr(user, k, v.strip() if isinstance(v, str) else v)
    db.commit()
    return profile_out(user)


@router.get("/orders", response_model=list[OrderOut])
def my_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Paid orders placed with this (OTP-verified) email, including ones made as a guest before signing up."""
    return (
        db.query(Order).options(selectinload(Order.items))
        .filter(Order.email == user.email, Order.payment_status == "paid")
        .order_by(Order.id.desc()).all()
    )
