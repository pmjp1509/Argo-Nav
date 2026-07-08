"""Live schema introspection (real argo.* tables) — powers the SQL Playground schema browser."""
from fastapi import APIRouter

from app.db.postgres import get_conn

router = APIRouter()


@router.get("/schema")
def schema():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'argo'
            ORDER BY table_name, ordinal_position
        """)
        tables: dict[str, list] = {}
        for table, column, dtype in cur.fetchall():
            tables.setdefault(table, []).append({"name": column, "type": dtype})
    return {"schema": "argo",
            "tables": [{"name": t, "columns": cols} for t, cols in tables.items()]}
