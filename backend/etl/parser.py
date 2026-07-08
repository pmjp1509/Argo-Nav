"""NetCDF opening + safe value extraction.

Consolidates the duplicated helpers from the old notebook
(`get_safe_string_from_xarray_var`, JULD decoding, safe float) into one place.
"""
from datetime import date, datetime, timezone

import numpy as np
import pandas as pd
import xarray as xr

FILL_STRINGS = {"", "_FillValue", "nan", "NaN", "--", "n/a"}
DEFAULT_DATE = date(1900, 1, 1)


def open_netcdf(path: str) -> xr.Dataset:
    """Open an Argo NetCDF file. Times are decoded manually from JULD."""
    return xr.open_dataset(path, decode_cf=True, decode_times=False)


def safe_str(var) -> str | None:
    """Extract a clean string from an xarray var / char array / bytes / scalar."""
    if var is None:
        return None
    if hasattr(var, "values"):
        val = var.values
        if getattr(val, "ndim", 0) == 0:
            val = val.item()
        elif val.dtype.kind in ("S", "U"):
            val = "".join(val.astype(str))
        else:
            try:
                val = val.flatten()[0]
            except Exception:
                return None
    else:
        val = var
    if isinstance(val, bytes):
        val = val.decode("utf-8", errors="ignore")
    s = str(val).strip()
    return None if s in FILL_STRINGS else s


def safe_float(var) -> float | None:
    if var is None:
        return None
    try:
        v = var.values.item() if hasattr(var, "values") else float(var)
    except Exception:
        return None
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    return float(v)


def has_var(profile, name: str) -> bool:
    return name in getattr(profile, "data_vars", {}) or name in getattr(profile, "variables", {})


def reference_datetime(ds) -> pd.Timestamp:
    ref = ds.attrs.get("REFERENCE_DATE_TIME", "19500101000000")
    try:
        return pd.to_datetime(ref, format="%Y%m%d%H%M%S")
    except Exception:
        return pd.to_datetime("1950-01-01")


def decode_juld(raw_juld, juld_ref: pd.Timestamp):
    """Convert a raw JULD (days since reference) to a tz-aware timestamp or None."""
    try:
        raw = float(raw_juld)
    except Exception:
        return None
    if pd.isna(raw) or raw >= 999999.0 or raw < 0:
        return None
    ts = juld_ref + pd.Timedelta(days=raw)
    return ts.tz_localize("UTC") if ts.tzinfo is None else ts


def parse_argo_date(value, fmt="%Y%m%d%H%M%S"):
    """Parse strings like '20231231120000' -> ISO string, else None."""
    s = safe_str(value)
    if not s:
        return None
    try:
        ts = pd.to_datetime(s, format=fmt, errors="coerce")
        return None if pd.isna(ts) else ts.isoformat()
    except Exception:
        return None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
