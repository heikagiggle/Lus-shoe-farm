import re
import secrets


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "item"


def unique_slug(db, model, base: str, exclude_id: int | None = None) -> str:
    slug, i = base, 2
    while True:
        q = db.query(model).filter(model.slug == slug)
        if exclude_id:
            q = q.filter(model.id != exclude_id)
        if not db.query(q.exists()).scalar():
            return slug
        slug = f"{base}-{i}"
        i += 1


def new_reference() -> str:
    return "LSF-" + secrets.token_hex(5).upper()
