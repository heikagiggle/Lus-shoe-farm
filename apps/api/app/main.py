import asyncio
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import Base, engine
from .dev_migrate import ensure_columns
from .routers import admin, auth, chat, notifications, payments, public, user
from .services.realtime import hub
from .seed import run as seed_database


app = FastAPI(title="Lu's Shoe Farm API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
for r in (public.router, auth.router, user.router, payments.router, admin.router, notifications.router, chat.customer, chat.admin):
    app.include_router(r, prefix=PREFIX)

app.include_router(chat.ws_router)  # WebSockets live at /ws/... (outside /api/v1)
Path("uploads").mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# @app.on_event("startup")
# async def startup():
#     # Production: use `alembic upgrade head` instead. This keeps first-run frictionless.
#     Base.metadata.create_all(bind=engine)
#     ensure_columns()  # adds phase-2 columns to an existing users table
#     hub.loop = asyncio.get_running_loop()

@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    ensure_columns()
    seed_database()
    hub.loop = asyncio.get_running_loop()


@app.get("/health")
def health():
    return {"ok": True}
