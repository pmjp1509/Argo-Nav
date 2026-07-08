"""Floats + profiles + per-parameter stats.

Replaces notebook cells 7 (file_info) and 8 (process_profile_metadata),
adapted to the normalized schema (argo.floats / argo.profiles /
argo.profile_param_stats) with surrogate profile_id.
"""
import numpy as np

from etl import parser
from etl.config import log

# Parameters we compute stats for, if present in the file.
STAT_PARAMS = ["PRES", "TEMP", "PSAL", "DOXY", "CHLA", "BBP700", "NITRATE", "PH_IN_SITU_TOTAL"]


# ---------------------------------------------------------------------------
# file_info  (notebook cell 7)
# ---------------------------------------------------------------------------
def insert_file(cur, ds, filename: str, content_hash: str) -> str:
    row = {
        "file_name": filename,
        "data_type": str(ds.attrs.get("DATA_TYPE", "Argo profile")),
        "format_version": str(ds.attrs.get("FORMAT_VERSION", "3.1")),
        "handbook_version": str(ds.attrs.get("HANDBOOK_VERSION", "")),
        "reference_date_time": parser.reference_datetime(ds).isoformat(),
        "date_creation": parser.parse_argo_date(ds.attrs.get("DATE_CREATION")) or parser.utc_now_iso(),
        "date_update": parser.parse_argo_date(ds.attrs.get("DATE_UPDATE")) or parser.utc_now_iso(),
        "data_centre": str(ds.attrs.get("DATA_CENTRE", "")),
        "float_count": int(len(set(ds.PLATFORM_NUMBER.values.ravel().astype(str)))),
        "profile_count": int(ds.sizes.get("N_PROF", 0)),
        "content_hash": content_hash,
    }
    cur.execute(
        """
        insert into argo.files
          (file_name, data_type, format_version, handbook_version, reference_date_time,
           date_creation, date_update, data_centre, float_count, profile_count, content_hash)
        values
          (%(file_name)s, %(data_type)s, %(format_version)s, %(handbook_version)s, %(reference_date_time)s,
           %(date_creation)s, %(date_update)s, %(data_centre)s, %(float_count)s, %(profile_count)s, %(content_hash)s)
        on conflict (file_name, content_hash) do update set date_update = excluded.date_update
        returning file_id
        """,
        row,
    )
    return cur.fetchone()[0]


# ---------------------------------------------------------------------------
# floats  (platform-level upsert)
# ---------------------------------------------------------------------------
def upsert_float(cur, platform_number, ds, is_bgc: bool):
    cur.execute(
        """
        insert into argo.floats (platform_number, platform_type, pi_name, project_name, data_centre, float_type)
        values (%s, %s, %s, %s, %s, %s)
        on conflict (platform_number) do update set
          platform_type = coalesce(excluded.platform_type, argo.floats.platform_type),
          pi_name       = coalesce(excluded.pi_name, argo.floats.pi_name),
          float_type    = case when excluded.float_type = 'bgc' then 'bgc' else argo.floats.float_type end,
          updated_at    = now()
        """,
        (
            platform_number,
            str(ds.attrs.get("PLATFORM_TYPE", "")) or None,
            None,  # pi_name filled per-profile below via update if desired
            str(ds.attrs.get("PROJECT_NAME", "Argo")) or None,
            str(ds.attrs.get("DATA_CENTRE", "")) or None,
            "bgc" if is_bgc else "core",
        ),
    )


# ---------------------------------------------------------------------------
# profiles  (returns surrogate id used to link stats/calib/history/parquet)
# ---------------------------------------------------------------------------
def insert_profile(cur, profile, ds, file_id, juld_ref) -> tuple:
    float_id = parser.safe_str(profile.PLATFORM_NUMBER)
    cycle_number = int(profile.CYCLE_NUMBER.values.item())
    direction = parser.safe_str(profile.DIRECTION) or "A"
    direction = direction[0]

    juld = parser.decode_juld(profile.JULD.values.item(), juld_ref) if parser.has_var(profile, "JULD") else None
    profile_date = (juld.date().isoformat() if juld is not None else parser.DEFAULT_DATE.isoformat())

    lat = parser.safe_float(profile.LATITUDE) if parser.has_var(profile, "LATITUDE") else None
    lon = parser.safe_float(profile.LONGITUDE) if parser.has_var(profile, "LONGITUDE") else None

    pres = profile.PRES.values if parser.has_var(profile, "PRES") else np.array([])
    valid_pres = pres[~np.isnan(pres)] if pres.size else np.array([])

    row = {
        "platform_number": float_id,
        "cycle_number": cycle_number,
        "direction": direction,
        "file_id": file_id,
        "juld": juld.isoformat() if juld is not None else None,
        "profile_date": profile_date,
        "latitude": lat,
        "longitude": lon,
        "position_qc": parser.safe_str(profile.POSITION_QC) if parser.has_var(profile, "POSITION_QC") else None,
        "juld_qc": parser.safe_str(profile.JULD_QC) if parser.has_var(profile, "JULD_QC") else None,
        "data_mode": parser.safe_str(profile.DATA_MODE) if parser.has_var(profile, "DATA_MODE") else None,
        "has_adjusted": any("_ADJUSTED" in v for v in profile.data_vars),
        "positioning_system": parser.safe_str(profile.POSITIONING_SYSTEM) if parser.has_var(profile, "POSITIONING_SYSTEM") else None,
        "vertical_sampling_scheme": parser.safe_str(profile.VERTICAL_SAMPLING_SCHEME) if parser.has_var(profile, "VERTICAL_SAMPLING_SCHEME") else None,
        "config_mission_number": int(profile.CONFIG_MISSION_NUMBER.values.item()) if parser.has_var(profile, "CONFIG_MISSION_NUMBER") else None,
        "n_levels": int(valid_pres.size),
        "max_pres": float(valid_pres.max()) if valid_pres.size else None,
    }

    cur.execute(
        """
        insert into argo.profiles
          (platform_number, cycle_number, direction, file_id, juld, profile_date,
           latitude, longitude, position_qc, juld_qc, data_mode, has_adjusted,
           positioning_system, vertical_sampling_scheme, config_mission_number, n_levels, max_pres)
        values
          (%(platform_number)s, %(cycle_number)s, %(direction)s, %(file_id)s, %(juld)s, %(profile_date)s,
           %(latitude)s, %(longitude)s, %(position_qc)s, %(juld_qc)s, %(data_mode)s, %(has_adjusted)s,
           %(positioning_system)s, %(vertical_sampling_scheme)s, %(config_mission_number)s, %(n_levels)s, %(max_pres)s)
        on conflict (platform_number, cycle_number, direction, profile_date) do update set
          juld = excluded.juld, latitude = excluded.latitude, longitude = excluded.longitude,
          data_mode = excluded.data_mode, max_pres = excluded.max_pres, n_levels = excluded.n_levels,
          file_id = excluded.file_id
        returning profile_id, profile_date
        """,
        row,
    )
    profile_id, pdate = cur.fetchone()
    return profile_id, pdate, float_id, cycle_number, direction, juld, lat, lon, row["position_qc"]


# ---------------------------------------------------------------------------
# per-parameter stats  (long format; replaces min_temp/max_temp/... columns)
# ---------------------------------------------------------------------------
def insert_param_stats(cur, profile, profile_id, profile_date):
    for param in STAT_PARAMS:
        if not parser.has_var(profile, param):
            continue
        arr = profile[param].values
        valid = arr[~np.isnan(arr)] if arr.size else np.array([])
        if valid.size == 0:
            continue
        profile_qc = parser.safe_str(profile[f"PROFILE_{param}_QC"]) if parser.has_var(profile, f"PROFILE_{param}_QC") else None
        cur.execute(
            """
            insert into argo.profile_param_stats
              (profile_id, profile_date, parameter, min_value, max_value, mean_value, n_valid, profile_qc)
            values (%s,%s,%s,%s,%s,%s,%s,%s)
            on conflict (profile_id, profile_date, parameter) do update set
              min_value = excluded.min_value, max_value = excluded.max_value,
              mean_value = excluded.mean_value, n_valid = excluded.n_valid, profile_qc = excluded.profile_qc
            """,
            (profile_id, profile_date, param,
             float(valid.min()), float(valid.max()), float(valid.mean()),
             int(valid.size), (profile_qc or None) and profile_qc[:1]),
        )
