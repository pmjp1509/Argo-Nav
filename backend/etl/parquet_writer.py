"""Profile arrays -> Parquet + argo.profile_parquet_index (replaces notebook cell 14).

Key change vs the old notebook: we do NOT write one tiny file per profile.
Within an ingest run we group a float's profiles into a single Parquet file
(`float_id=<id>/<source_stem>.parquet`) carrying identifying columns so DuckDB
can filter to one cycle. The manifest row (per profile) points at that file.

Backends:
  PARQUET_BACKEND=local     -> writes under PARQUET_LOCAL_DIR; uri = absolute path
  PARQUET_BACKEND=supabase  -> uploads to Storage bucket; uri = s3://<bucket>/<key>
"""
import json
import os

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

from etl.config import (PARQUET_BACKEND, PARQUET_LOCAL_DIR, SUPABASE_STORAGE_BUCKET,
                        get_supabase, log)

DEPTH_VARS = ["PRES", "PRES_QC", "PRES_ADJUSTED", "PRES_ADJUSTED_QC", "PRES_ADJUSTED_ERROR"]
CORE_VARS = ["TEMP", "PSAL", "CNDC", "DOXY", "CHLA", "BBP700", "NITRATE", "PH_IN_SITU_TOTAL"]


def _wanted_vars():
    out = list(DEPTH_VARS)
    for v in CORE_VARS:
        out += [v, f"{v}_QC", f"{v}_ADJUSTED", f"{v}_ADJUSTED_QC", f"{v}_ADJUSTED_ERROR"]
    return out


class ProfileParquetCollector:
    """Accumulate per-profile arrays for one source file, then flush per float."""

    def __init__(self, source_stem: str):
        self.source_stem = source_stem
        self._by_float: dict[str, list[dict]] = {}

    def add(self, profile, profile_id, profile_date, float_id, cycle_number, direction):
        wanted = [v for v in _wanted_vars() if v in profile]
        if not wanted:
            return
        df = pd.DataFrame({v: profile[v].values for v in wanted})

        measure_cols = [v for v in wanted if "QC" not in v and "ERROR" not in v]
        if measure_cols:
            df = df.dropna(how="all", subset=measure_cols)
        if df.empty:
            return

        df.insert(0, "profile_id", profile_id)
        df.insert(1, "cycle_number", cycle_number)
        df.insert(2, "direction", direction)
        df.insert(3, "level", range(len(df)))

        self._by_float.setdefault(float_id, []).append({
            "profile_id": profile_id,
            "profile_date": profile_date,
            "cycle_number": cycle_number,
            "df": df,
            "vars": [v for v in wanted],
        })

    def flush(self, cur) -> dict:
        inserted, errors = 0, 0
        for float_id, entries in self._by_float.items():
            key = f"float_id={float_id}/{self.source_stem}.parquet"
            combined = pd.concat([e["df"] for e in entries], ignore_index=True)
            try:
                uri, size = self._write(key, combined)
            except Exception as exc:  # noqa: BLE001
                log.error("parquet write failed for %s: %s", float_id, exc)
                errors += len(entries)
                continue

            for e in entries:
                pres = e["df"]["PRES"] if "PRES" in e["df"].columns else pd.Series(dtype=float)
                pres = pres.dropna()
                cur.execute(
                    """
                    insert into argo.profile_parquet_index
                      (profile_id, profile_date, parquet_uri, row_count,
                       min_pres, max_pres, max_depth, variables, file_size_bytes, storage_status)
                    values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    on conflict (profile_id, profile_date) do update set
                      parquet_uri = excluded.parquet_uri, row_count = excluded.row_count,
                      min_pres = excluded.min_pres, max_pres = excluded.max_pres,
                      max_depth = excluded.max_depth, variables = excluded.variables,
                      file_size_bytes = excluded.file_size_bytes
                    """,
                    (
                        e["profile_id"], e["profile_date"], uri, int(len(e["df"])),
                        float(pres.min()) if not pres.empty else None,
                        float(pres.max()) if not pres.empty else None,
                        float(pres.max()) if not pres.empty else None,
                        json.dumps(e["vars"]), size, "uploaded",
                    ),
                )
                inserted += 1
        return {"parquet_indexed": inserted, "parquet_errors": errors}

    # -- backends --------------------------------------------------------
    def _write(self, key: str, df: pd.DataFrame) -> tuple[str, int]:
        table = pa.Table.from_pandas(df, preserve_index=False)
        if PARQUET_BACKEND == "supabase":
            tmp = os.path.join(os.environ.get("TEMP", "."), key.replace("/", "_"))
            pq.write_table(table, tmp)
            size = os.path.getsize(tmp)
            with open(tmp, "rb") as fh:
                get_supabase().storage.from_(SUPABASE_STORAGE_BUCKET).upload(
                    key, fh, {"upsert": "true", "content-type": "application/octet-stream"})
            os.unlink(tmp)
            return f"s3://{SUPABASE_STORAGE_BUCKET}/{key}", size
        # local
        path = os.path.join(PARQUET_LOCAL_DIR, key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        pq.write_table(table, path)
        return os.path.abspath(path), os.path.getsize(path)
