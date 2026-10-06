from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from ..config import settings
from ..db import get_db
from ..models import Collection, HeroSlide, Order, OrderItem, Product, ProductVariant
from ..schemas import (CartLine, CartSyncLine, CheckoutIn, CheckoutOut, CollectionOut, CollectionWithProducts,
                       OrderOut, ProductOut, ProductPage, QuoteIn, QuoteOut, SlideOut)
from ..services import paystack
from ..services.inventory import resolve_cart
from ..services.pricing import compute_totals
from ..utils import new_reference

router = APIRouter(tags=["storefront"])
CATEGORIES = ["Flat Slippers", "Sandals", "Boots", "Flat Shoes", "Heel Sandals", "Stilettos"]


def _active_products(db: Session):
    return db.query(Product).options(selectinload(Product.variants), selectinload(Product.collections)).filter(
        Product.is_active.is_(True)
    )


@router.get("/categories")
def categories():
    return CATEGORIES


@router.get("/hero", response_model=list[SlideOut])
def hero(db: Session = Depends(get_db)):
    return db.query(HeroSlide).filter(HeroSlide.is_active.is_(True)).order_by(HeroSlide.position).limit(3).all()


@router.get("/products", response_model=ProductPage)
def products(
    category: str | None = None,
    collection: str | None = None,
    q: str | None = None,
    new_arrivals: bool = False,
    cursor: int | None = Query(None, description="id of the last item seen"),
    limit: int = Query(12, ge=1, le=48),
    db: Session = Depends(get_db),
):
    """Cursor-based pagination (keyset on id DESC) for infinite scroll."""
    query = _active_products(db)
    if category:
        query = query.filter(Product.category == category)
    if collection:
        query = query.filter(Product.collections.any(Collection.slug == collection))
    if new_arrivals:
        query = query.filter(Product.is_new_arrival.is_(True))
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(Product.name.ilike(like), Product.category.ilike(like), Product.description.ilike(like)))
    if cursor:
        query = query.filter(Product.id < cursor)
    rows = query.order_by(Product.id.desc()).limit(limit + 1).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    return ProductPage(items=rows, next_cursor=rows[-1].id if has_more and rows else None)


@router.get("/products/{slug}", response_model=ProductOut)
def product(slug: str, db: Session = Depends(get_db)):
    p = _active_products(db).filter(Product.slug == slug).one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    return p


@router.get("/collections", response_model=list[CollectionWithProducts])
def collections(homepage: bool = False, limit: int = Query(4, ge=0, le=24), db: Session = Depends(get_db)):
    """Homepage sections: first N active products tagged to each collection."""
    q = db.query(Collection)
    if homepage:
        q = q.filter(Collection.show_on_homepage.is_(True))
    out = []
    for c in q.order_by(Collection.id).all():
        items = (
            _active_products(db).filter(Product.collections.any(Collection.id == c.id))
            .order_by(Product.id.desc()).limit(limit).all()
        )
        out.append(CollectionWithProducts(**CollectionOut.model_validate(c).model_dump(),
                                          products=[ProductOut.model_validate(p) for p in items]))
    return out


@router.get("/collections/{slug}", response_model=CollectionOut)
def collection(slug: str, db: Session = Depends(get_db)):
    c = db.query(Collection).filter(Collection.slug == slug).one_or_none()
    if not c:
        raise HTTPException(404, "Collection not found")
    return c


@router.post("/cart/sync", response_model=list[CartSyncLine])
def cart_sync(variant_ids: list[int], db: Session = Depends(get_db)):
    """Lets the persisted client cart re-sync with live stock and prices."""
    found = {v.id: v for v in db.query(ProductVariant).filter(ProductVariant.id.in_(variant_ids)).all()}
    return [
        CartSyncLine(
            variant_id=i,
            available=bool(i in found and found[i].stock > 0 and found[i].product.is_active),
            stock=found[i].stock if i in found else 0,
            price=found[i].price if i in found else 0,
        )
        for i in variant_ids
    ]


def _subtotal(resolved) -> int:
    return sum(v.price * qty for v, qty in resolved)


@router.post("/orders/quote", response_model=QuoteOut)
def quote(body: QuoteIn, db: Session = Depends(get_db)):
    resolved = resolve_cart(db, body.items)
    return compute_totals(_subtotal(resolved), body.delivery_method, body.shipping_tier, body.state)


@router.post("/orders", response_model=CheckoutOut)
def create_order(body: CheckoutIn, db: Session = Depends(get_db)):
    if body.delivery_method == "ship" and not all([body.name, body.phone, body.address, body.city, body.state]):
        raise HTTPException(422, "Name, phone, address, city and state are required for delivery.")
    resolved = resolve_cart(db, body.items)  # server-side stock validation
    totals = compute_totals(_subtotal(resolved), body.delivery_method, body.shipping_tier, body.state)
    order = Order(
        reference=new_reference(), email=body.email.lower(), marketing_opt_in=body.marketing_opt_in,
        delivery_method=body.delivery_method, shipping_tier=body.shipping_tier, name=body.name, phone=body.phone,
        address=body.address if body.delivery_method == "ship" else settings.pickup_address,
        city=body.city, state=body.state, **totals,
    )
    for v, qty in resolved:
        order.items.append(OrderItem(
            product_id=v.product_id, variant_id=v.id, name=v.product.name,
            image=(v.product.images or [""])[0], size=v.size, color=v.color, unit_price=v.price, quantity=qty,
        ))
    db.add(order)
    db.commit()
    init = paystack.initialize(order)
    return CheckoutOut(order=order, **init)


@router.get("/orders/{reference}", response_model=OrderOut)
def get_order(reference: str, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.reference == reference).one_or_none()
    if not o:
        raise HTTPException(404, "Order not found")
    return o
