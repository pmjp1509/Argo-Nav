# app/services/parquet_reader.py

import os
import tempfile
import psycopg2
import pandas as pd
import pyarrow.parquet as pq
import requests
from app.core.config import settings


def get_parquet_uri(float_id: str, cycle_number: int):
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()

    cur.execute("""
        SELECT parquet_uri
        FROM profile_parquet_index
        WHERE float_id = %s AND cycle_number = %s
    """, (float_id, cycle_number))

    result = cur.fetchone()

    cur.close()
    conn.close()

    return result[0] if result else None


def read_parquet_from_storage(uri: str):
    """Fetch parquet from URL and return as pandas DataFrame. Uses OS temp dir (Windows-safe)."""
    response = requests.get(uri)
    fd, local_path = tempfile.mkstemp(suffix=".parquet")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(response.content)
        return pq.read_table(local_path).to_pandas()
    finally:
        try:
            os.unlink(local_path)
        except OSError:
            pass


def _row_float_cycle(row):
    """Get (float_id, cycle_number) from a row (dict from execute_sql or tuple)."""
    if isinstance(row, dict):
        return row.get("float_id"), row.get("cycle_number")
    return row[0], row[1]


def load_profiles(rows):
    """
    Load parquet data for selected profiles.
    rows: list of dicts (from execute_sql) or list of tuples; must have float_id and cycle_number.
    Returns list of DataFrames (one per profile).
    """
    dfs = []

    for row in rows:
        float_id, cycle_number = _row_float_cycle(row)
        if float_id is None or cycle_number is None:
            continue

        uri = get_parquet_uri(str(float_id), int(cycle_number))
        if not uri:
            continue

        try:
            df = read_parquet_from_storage(uri)
            dfs.append(df)
        except Exception:
            continue

    return dfs


def apply_qc(profile_dfs):
    """
    Apply quality control to profile DataFrames. Pass-through for now; can filter by QC flags later.
    """
    return profile_dfs


def compute_stats(profile_dfs):
    """
    Compute summary statistics from a list of profile DataFrames (Parquet-loaded).
    Returns a dict suitable for the LLM and frontend (data_preview).
    """
    if not profile_dfs:
        return {
            "total_rows": 0,
            "columns": [],
            "rows": [],
            "profile_count": 0,
            "message": "No profile data loaded.",
        }

    combined = pd.concat(profile_dfs, ignore_index=True)
    cols = list(combined.columns)
    total = len(combined)

    # Sample rows for display (convert to list of dicts for JSON)
    sample = combined.head(15)
    rows_preview = sample.to_dict(orient="records")
    # Convert non-JSON-serializable types
    for r in rows_preview:
        for k, v in r.items():
            if hasattr(v, "isoformat"):
                r[k] = v.isoformat()
            elif isinstance(v, (float,)) and (v != v):  # NaN
                r[k] = None

    stats = {
        "total_rows": total,
        "columns": cols,
        "rows": rows_preview,
        "profile_count": len(profile_dfs),
    }
    if "TEMP" in cols:
        stats["mean_temp"] = float(combined["TEMP"].mean()) if total else None
    if "PRES" in cols:
        stats["mean_pres"] = float(combined["PRES"].mean()) if total else None
    if "PSAL" in cols:
        stats["mean_psal"] = float(combined["PSAL"].mean()) if total else None
    return stats


def compute_stats_from_rows(rows):
    """
    Build stats from SQL result rows (list of dicts) when Parquet is not used.
    Use this for metadata-only queries (e.g. floats in Indian Ocean).
    """
    if not rows:
        return {
            "total_rows": 0,
            "columns": [],
            "rows": [],
            "float_ids": [],
            "message": "No rows returned.",
        }

    cols = list(rows[0].keys())
    # First 15 rows for preview; make JSON-serializable
    preview = []
    for r in rows[:15]:
        row_copy = {}
        for k, v in r.items():
            if hasattr(v, "isoformat"):
                row_copy[k] = v.isoformat()
            elif hasattr(v, "item"):  # numpy scalar
                row_copy[k] = v.item() if hasattr(v, "item") else v
            else:
                row_copy[k] = v
        preview.append(row_copy)

    float_ids = []
    seen = set()
    for r in rows:
        fid = r.get("float_id") if isinstance(r, dict) else (r[0] if len(r) > 0 else None)
        if fid is not None and fid not in seen:
            seen.add(fid)
            float_ids.append(str(fid))

    return {
        "total_rows": len(rows),
        "columns": cols,
        "rows": preview,
        "float_ids": float_ids,
    }


def compute_depth_average(dfs, depth: int):
    values = []

    for df in dfs:
        if "PRES" in df.columns and "TEMP" in df.columns:
            nearest = df.iloc[(df["PRES"] - depth).abs().argsort()[:1]]
            if not nearest.empty:
                values.append(nearest["TEMP"].values[0])

    if not values:
        return None

    return sum(values) / len(values)