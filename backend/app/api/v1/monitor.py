"""System Monitor endpoint — recent query logs (app.query_history)."""
from fastapi import APIRouter, Query

from app.db.postgres import dict_rows, get_conn

router = APIRouter()


@router.get("/logs")
def logs(limit: int = Query(100, le=500)):
    # SELECT * so it works whether or not observability.sql has added the extra columns.
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM app.query_history ORDER BY created_at DESC LIMIT %s", (limit,))
        return dict_rows(cur)
