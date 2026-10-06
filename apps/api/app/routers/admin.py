# import shutil
import uuid
from pathlib import Path
from supabase import create_client

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Collection, HeroSlide, Order, Product, ProductVariant, User
from ..schemas import (AdminUserOut, BulkDeleteIn, CollectionIn, CollectionOut, InventoryPatch, OrderOut, OrderStatusIn,
                       ProductIn, ProductOut, SlideIn, SlideOut)
from ..security import require_admin
from ..services import email as mail
from ..services.inventory import refresh_sold_out
from ..utils import slugify, unique_slug
from ..config import settings


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])
# UPLOAD_DIR = Path("uploads")
SUPABASE_URL = settings.supabase_url
SUPABASE_SERVICE_ROLE_KEY = settings.supabase_service_role_key
SUPABASE_BUCKET = settings.supabase_bucket

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)



# ---------- uploads ----------
# @router.post("/upload")
# def upload(file: UploadFile = File(...)):
#     ext = Path(file.filename or "").suffix.lower()
#     if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
#         raise HTTPException(422, "Upload a JPG, PNG, WEBP or GIF image.")
#     UPLOAD_DIR.mkdir(exist_ok=True)
#     name = f"{uuid.uuid4().hex}{ext}"
#     with open(UPLOAD_DIR / name, "wb") as out:
#         shutil.copyfileobj(file.file, out)
#     return {"url": f"/uploads/{name}"}

@router.post("/upload")
def upload(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()

    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        raise HTTPException(422, "Upload a JPG, PNG, WEBP or GIF image.")

    name = f"{uuid.uuid4().hex}{ext}"

    try:
        file_bytes = file.file.read()

        supabase.storage.from_(SUPABASE_BUCKET).upload(
            name,
            file_bytes,
            {
                "content-type": file.content_type or "application/octet-stream",
                "upsert": "false",
            },
        )

        public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(name)

        return {"url": public_url}

    except Exception as exc:
        raise HTTPException(500, "Image upload failed: {exc}")



# ---------- hero slides ----------
@router.get("/hero", response_model=list[SlideOut])
def list_slides(db: Session = Depends(get_db)):
    return db.query(HeroSlide).order_by(HeroSlide.position).all()


@router.post("/hero", response_model=SlideOut)
def create_slide(body: SlideIn, db: Session = Depends(get_db)):
    if db.query(HeroSlide).count() >= 3:
        raise HTTPException(409, "The homepage carousel supports 3 slides. Edit or delete an existing slide.")
    s = HeroSlide(**body.model_dump())
    db.add(s)
    db.commit()
    return s


@router.put("/hero/{slide_id}", response_model=SlideOut)
def update_slide(slide_id: int, body: SlideIn, db: Session = Depends(get_db)):
    s = db.get(HeroSlide, slide_id)
    if not s:
        raise HTTPException(404, "Slide not found")
    for k, v in body.model_dump().items():
        setattr(s, k, v)
    db.commit()
    return s


@router.delete("/hero/{slide_id}", status_code=204)
def delete_slide(slide_id: int, db: Session = Depends(get_db)):
    s = db.get(HeroSlide, slide_id)
    if s:
        db.delete(s)
        db.commit()


# ---------- collections ----------
@router.get("/collections", response_model=list[CollectionOut])
def list_collections(db: Session = Depends(get_db)):
    return db.query(Collection).order_by(Collection.id).all()


@router.post("/collections", response_model=CollectionOut)
def create_collection(body: CollectionIn, db: Session = Depends(get_db)):
    slug = unique_slug(db, Collection, slugify(body.slug or body.name))
    c = Collection(name=body.name, slug=slug, description=body.description, show_on_homepage=body.show_on_homepage)
    db.add(c)
    db.commit()
    return c


@router.put("/collections/{cid}", response_model=CollectionOut)
def update_collection(cid: int, body: CollectionIn, db: Session = Depends(get_db)):
    c = db.get(Collection, cid)
    if not c:
        raise HTTPException(404, "Collection not found")
    c.name, c.description, c.show_on_homepage = body.name, body.description, body.show_on_homepage
    # Renaming never changes the URL unless a custom slug is supplied.
    if body.slug and slugify(body.slug) != c.slug:
        c.slug = unique_slug(db, Collection, slugify(body.slug), exclude_id=c.id)
    db.commit()
    return c


@router.delete("/collections/{cid}", status_code=204)
def delete_collection(cid: int, db: Session = Depends(get_db)):
    c = db.get(Collection, cid)
    if c:
        db.delete(c)
        db.commit()


# ---------- products & inventory matrix ----------
def _apply_variants(p: Product, variants):
    existing = {(v.size, v.color.lower()): v for v in p.variants}
    keep = set()
    for vin in variants:
        key = (vin.size, vin.color.lower())
        keep.add(key)
        if key in existing:
            existing[key].price, existing[key].stock = vin.price, vin.stock
        else:
            p.variants.append(ProductVariant(size=vin.size, color=vin.color, price=vin.price, stock=vin.stock))
    for key, v in existing.items():
        if key not in keep:
            p.variants.remove(v)
    refresh_sold_out(p)


@router.get("/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).options(selectinload(Product.variants), selectinload(Product.collections)).order_by(Product.id.desc()).all()


@router.post("/products", response_model=ProductOut)
def create_product(body: ProductIn, db: Session = Depends(get_db)):
    p = Product(
        name=body.name, slug=unique_slug(db, Product, slugify(body.slug or body.name)), description=body.description,
        category=body.category, images=body.images, is_new_arrival=body.is_new_arrival, is_active=body.is_active,
    )
    p.collections = db.query(Collection).filter(Collection.id.in_(body.collection_ids)).all()
    _apply_variants(p, body.variants)
    db.add(p)
    db.commit()
    return p


@router.put("/products/{pid}", response_model=ProductOut)
def update_product(pid: int, body: ProductIn, db: Session = Depends(get_db)):
    p = db.get(Product, pid)
    if not p:
        raise HTTPException(404, "Product not found")
    p.name, p.description, p.category, p.images = body.name, body.description, body.category, body.images
    p.is_new_arrival, p.is_active = body.is_new_arrival, body.is_active
    if body.slug and slugify(body.slug) != p.slug:
        p.slug = unique_slug(db, Product, slugify(body.slug), exclude_id=p.id)
    p.collections = db.query(Collection).filter(Collection.id.in_(body.collection_ids)).all()
    _apply_variants(p, body.variants)
    db.commit()
    return p


@router.delete("/products/{pid}", status_code=204)
def delete_product(pid: int, db: Session = Depends(get_db)):
    p = db.get(Product, pid)
    if p:
        db.delete(p)
        db.commit()


@router.post("/products/bulk-delete")
def bulk_delete(body: BulkDeleteIn, db: Session = Depends(get_db)):
    n = 0
    for p in db.query(Product).filter(Product.id.in_(body.ids)).all():
        db.delete(p)
        n += 1
    db.commit()
    return {"deleted": n}


@router.patch("/inventory/batch")
def batch_inventory(patches: list[InventoryPatch], db: Session = Depends(get_db)):
    touched: dict[int, Product] = {}
    for patch in patches:
        v = db.get(ProductVariant, patch.variant_id)
        if not v:
            continue
        if patch.price is not None:
            v.price = patch.price
        if patch.stock is not None:
            v.stock = patch.stock
        touched[v.product_id] = v.product
    for p in touched.values():
        refresh_sold_out(p)
    db.commit()
    return {"updated": len(patches)}


# ---------- orders ----------
@router.get("/orders", response_model=list[OrderOut])
def list_orders(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Order).options(selectinload(Order.items)).filter(Order.payment_status == "paid")
    if status:
        q = q.filter(Order.status == status)
    return q.order_by(Order.id.desc()).all()


@router.post("/orders/mark-read")
def mark_read(db: Session = Depends(get_db)):
    db.query(Order).filter(Order.is_read.is_(False)).update({"is_read": True})
    db.commit()
    return {"ok": True}


ORDER_FLOW = {"pending": "shipped", "shipped": "received"}


@router.patch("/orders/{oid}/status", response_model=OrderOut)
def update_order_status(oid: int, body: OrderStatusIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    o = db.get(Order, oid)
    if not o or o.payment_status != "paid":
        raise HTTPException(404, "Order not found")
    if ORDER_FLOW.get(o.status) != body.status:
        raise HTTPException(409, f"Cannot move an order from {o.status} to {body.status}.")
    o.status = body.status
    o.is_read = True
    if body.status == "shipped":
        o.tracking_number = body.tracking_number
        subject, text = mail.order_shipped(o)
    else:
        subject, text = mail.order_received(o)
    db.commit()
    background.add_task(mail.send_email, o.email, subject, text)
    return o


# ---------- registered users (module 5) ----------
@router.get("/users", response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_admin.is_(False), User.deleted_at.is_(None)).order_by(User.id.desc()).all()
    return [
        AdminUserOut(
            id=u.id, email=u.email, full_name=f"{u.first_name} {u.last_name}".strip(), created_at=u.created_at,
            default_address=", ".join(x for x in [u.address, u.city, u.state, u.postal_code] if x),
            marketing_opt_in=u.marketing_opt_in,
        ) for u in users
    ]
