"""python -m app.seed  — idempotent demo data + admin user."""
from .config import settings
from .db import Base, SessionLocal, engine
from .models import Collection, HeroSlide, Product, ProductVariant, User
from .security import hash_password
from .services.inventory import refresh_sold_out
from .utils import slugify

U = "https://images.unsplash.com/"
Q = "?auto=format&fit=crop&w=1200&q=80"
IMG = {
    "heel": [U + "photo-1543163521-1bf539c55dd2" + Q, U + "photo-1515347619252-60a4bf4fff4f" + Q, U + "photo-1535043934128-cf0b28d52f95" + Q],
    "sneaker": [U + "photo-1542291026-7eec264c27ff" + Q, U + "photo-1549298916-b41d501d3772" + Q, U + "photo-1560343090-f0409e92791a" + Q],
    "flat": [U + "photo-1491553895911-0055eca6402d" + Q, U + "photo-1525966222134-fcfa99b8ae77" + Q, U + "photo-1608256246200-53e635b5b65f" + Q],
    "boot": [U + "photo-1608256246200-53e635b5b65f" + Q, U + "photo-1595950653106-6c9ebd614d3a" + Q, U + "photo-1549298916-b41d501d3772" + Q],
}
PRODUCTS = [
    ("Rosé Stiletto", "Stilettos", "heel", 59750, ["Red", "Black"], True, ["best-sellers"]),
    ("Palm Court Heel Sandal", "Heel Sandals", "heel", 47500, ["Brown", "Black"], True, ["best-sellers", "mature-woman"]),
    ("Lagos Evening Flat", "Flat Shoes", "flat", 38000, ["Black", "Red"], False, ["mature-woman"]),
    ("Harmattan Ankle Boot", "Boots", "boot", 72000, ["Brown", "Black"], False, ["best-sellers"]),
    ("Sunday Slide", "Flat Slippers", "flat", 22500, ["Brown", "Blue"], True, ["mature-woman"]),
    ("Coral Strap Sandal", "Sandals", "sneaker", 31000, ["Red", "Brown"], False, ["best-sellers"]),
    ("Velvet Stiletto", "Stilettos", "heel", 65000, ["Black"], True, ["mature-woman"]),
    ("Market Day Flat", "Flat Shoes", "flat", 29500, ["Blue", "Brown"], False, ["best-sellers"]),
    ("Island Block Heel", "Heel Sandals", "heel", 54000, ["Red", "Black"], True, ["mature-woman"]),
    ("Cedar Chelsea Boot", "Boots", "boot", 84000, ["Brown"], False, []),
    ("Cloud Slipper", "Flat Slippers", "flat", 18500, ["Black", "Blue"], False, []),
    ("Weekend Sandal", "Sandals", "sneaker", 27500, ["Brown"], True, []),
]


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if not db.query(User).filter(User.email == settings.admin_email).first():
        db.add(User(email=settings.admin_email.lower(), hashed_password=hash_password(settings.admin_password), is_admin=True))
    if not db.query(HeroSlide).count():
        for i, (h, sub, url, img) in enumerate([
            ("Spring LSF Collection", "Soft colours, sharper heels.", "/new-arrivals/spring", IMG["heel"][0]),
            ("Made to Walk Lagos", "Flats and sandals for every day.", "/shop?category=Flat%20Shoes", IMG["flat"][0]),
            ("The Mature Woman Edit", "Elegant, comfortable, unfussy.", "/collections/mature-woman", IMG["heel"][2]),
        ]):
            db.add(HeroSlide(position=i, headline=h, subtext=sub, cta_url=url, image_url=img))
    cols = {}
    for name in ("Best Sellers", "Mature Woman", "Spring"):
        c = db.query(Collection).filter(Collection.slug == slugify(name)).first() or Collection(
            name=name, slug=slugify(name), description=f"{name} at Lu's Shoe Farm", show_on_homepage=name != "Spring")
        db.add(c)
        cols[c.slug] = c
    db.flush()
    if not db.query(Product).count():
        for name, cat, img, price, colors, new, slugs in PRODUCTS:
            p = Product(name=name, slug=slugify(name), category=cat, images=IMG[img], is_new_arrival=new,
                        description=f"{name}: handcrafted comfort with a finish that lasts.")
            for size in range(37, 44):
                for color in colors:
                    p.variants.append(ProductVariant(size=size, color=color, price=price, stock=(size * 3 + len(color)) % 9 + 1))
            p.collections = [cols[s] for s in slugs] + ([cols["spring"]] if new else [])
            refresh_sold_out(p)
            db.add(p)
        # demo: one fully sold-out product to exercise the disabled state
        sold = db.query(Product).filter(Product.slug == "velvet-stiletto").one_or_none()
        if sold:
            for v in sold.variants:
                v.stock = 0
            refresh_sold_out(sold)
    db.commit()


if __name__ == "__main__":
    run()
