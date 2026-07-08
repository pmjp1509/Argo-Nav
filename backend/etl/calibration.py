"""Scientific calibration info (replaces notebook cell 9).

Linked to the surrogate (profile_id, profile_date) instead of (float_id, cycle).
Call once per profile with its N_PARAM slice.
"""
import json

from etl import parser


def insert_calibration(cur, ds, prof_index, profile_id, profile_date):
    if "N_PARAM" not in ds.sizes or ds.sizes["N_PARAM"] == 0:
        return
    for p in range(ds.sizes["N_PARAM"]):
        sl = ds.isel(N_PROF=prof_index, N_PARAM=p)

        param = parser.safe_str(sl.PARAMETER) if parser.has_var(sl, "PARAMETER") else None
        if not param:
            continue

        coeffs = {}
        if parser.has_var(sl, "SCIENTIFIC_CALIB_COEFFICIENTS"):
            raw = parser.safe_str(sl.SCIENTIFIC_CALIB_COEFFICIENTS)
            if raw:
                try:
                    coeffs = json.loads(raw)
                except Exception:
                    coeffs = {"raw": raw}

        cur.execute(
            """
            insert into argo.calibration_info
              (profile_id, profile_date, parameter, parameter_sensor,
               calib_equation, calib_coefficients, calib_comment, calib_date)
            values (%s,%s,%s,%s,%s,%s,%s,%s)
            on conflict (profile_id, profile_date, parameter) do update set
              calib_equation = excluded.calib_equation,
              calib_coefficients = excluded.calib_coefficients,
              calib_comment = excluded.calib_comment,
              calib_date = excluded.calib_date
            """,
            (
                profile_id, profile_date, param,
                parser.safe_str(sl.PARAMETER_SENSOR) if parser.has_var(sl, "PARAMETER_SENSOR") else None,
                parser.safe_str(sl.SCIENTIFIC_CALIB_EQUATION) if parser.has_var(sl, "SCIENTIFIC_CALIB_EQUATION") else None,
                json.dumps(coeffs),
                parser.safe_str(sl.SCIENTIFIC_CALIB_COMMENT) if parser.has_var(sl, "SCIENTIFIC_CALIB_COMMENT") else None,
                parser.parse_argo_date(sl.SCIENTIFIC_CALIB_DATE) if parser.has_var(sl, "SCIENTIFIC_CALIB_DATE") else None,
            ),
        )
