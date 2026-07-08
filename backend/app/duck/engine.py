"""DuckDB access to profile Parquet in Supabase Storage.

Stored parquet_uri looks like `s3://argo-parquet/<key>`. We turn that into a
short-lived signed HTTPS URL (using the service-role key we already have) and let
DuckDB read it over httpfs — no separate S3 access keys required. Local absolute
paths (from a PARQUET_BACKEND=local run) are read directly.
"""
from __future__ import annotations

import logging
import threading
from functools import lru_cache
from urllib.parse import urlparse

from app.core.config import settings
from app.db.postgres import get_conn

log = logging.getLogger(__name__)
_lock = threading.Lock()


@lru_cache(maxsize=1)
def _con():
    import duckdb
    con = duckdb.connect(database=":memory:")
    con.execute("INSTALL httpfs; LOAD httpfs;")
    return con


@lru_cache(maxsize=1)
def _supabase():
    from supabase import create_client
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _signed_url(key: str, expires: int = 3600) -> str:
    res = _supabase().storage.from_(settings.SUPABASE_STORAGE_BUCKET).create_signed_url(key, expires)
    url = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")
    if not url:
        raise RuntimeError(f"could not sign {key}: {res}")
    if url.startswith("/"):                       # some client versions return a path
        url = settings.SUPABASE_URL.rstrip("/") + url
    return url


def _duck_source(parquet_uri: str) -> str:
    if parquet_uri.startswith("s3://"):
        key = urlparse(parquet_uri).path.lstrip("/")     # bucket is the netloc
        return _signed_url(key)
    return parquet_uri                                    # local path


def _lookup(profile_ids: list[int]) -> dict[str, list[int]]:
    """profile_id -> parquet_uri, grouped by uri (many profiles share a day-file)."""
    groups: dict[str, list[int]] = {}
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT profile_id, parquet_uri FROM argo.profile_parquet_index "
            "WHERE profile_id = ANY(%s)", (profile_ids,))
        for pid, uri in cur.fetchall():
            groups.setdefault(uri, []).append(pid)
    return groups


def read_profiles(profile_ids: list[int], columns: list[str] | None = None):
    """Return a pandas DataFrame of the requested profiles' level data."""
    import pandas as pd
    if not profile_ids:
        return pd.DataFrame()

    col_sql = ", ".join(columns) if columns else "*"
    frames = []
    for uri, pids in _lookup(profile_ids).items():
        src = _duck_source(uri).replace("'", "''")
        ids_csv = ",".join(str(int(p)) for p in pids)
        q = (f"SELECT {col_sql} FROM read_parquet('{src}') "
             f"WHERE profile_id IN ({ids_csv})")
        try:
            with _lock:
                frames.append(_con().execute(q).df())
        except Exception as exc:  # noqa: BLE001
            log.warning("duckdb read failed for %s: %s", uri, exc)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
