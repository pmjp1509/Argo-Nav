import psycopg2
from app.core.config import settings

def get_conn():
    return psycopg2.connect(settings.DATABASE_URL)


def dict_rows(cur) -> list[dict]:
    """Fetch all rows from a cursor as a list of dicts."""
    cols = [d[0] for d in cur.description] if cur.description else []
    return [dict(zip(cols, row)) for row in cur.fetchall()]
