"""Idempotently adds the phase-2 columns to an existing `users` table (create_all only makes new tables).
For production use Alembic instead: `alembic revision --autogenerate -m phase2 && alembic upgrade head`."""
from sqlalchemy import inspect, text

from .db import engine

PG = engine.dialect.name == "postgresql"
TS = "TIMESTAMP WITH TIME ZONE" if PG else "DATETIME"
FALSE = "FALSE" if PG else "0"
COLUMNS = {
    "first_name": "VARCHAR(60) NOT NULL DEFAULT ''",
    "last_name": "VARCHAR(60) NOT NULL DEFAULT ''",
    "marketing_opt_in": f"BOOLEAN NOT NULL DEFAULT {FALSE}",
    "address": "VARCHAR(300) NOT NULL DEFAULT ''",
    "city": "VARCHAR(100) NOT NULL DEFAULT ''",
    "state": "VARCHAR(100) NOT NULL DEFAULT ''",
    "postal_code": "VARCHAR(20) NOT NULL DEFAULT ''",
    "phone": "VARCHAR(40) NOT NULL DEFAULT ''",
    "token_version": "INTEGER NOT NULL DEFAULT 0",
    "deleted_at": TS,
    "last_login_at": TS,
}


def ensure_columns() -> list[str]:
    have = {c["name"] for c in inspect(engine).get_columns("users")}
    added = []
    with engine.begin() as conn:
        for name, ddl in COLUMNS.items():
            if name not in have:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {ddl}"))
                added.append(name)
    return added
