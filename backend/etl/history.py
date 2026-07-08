"""Processing history info (replaces notebook cell 10).

Linked to the surrogate (profile_id, profile_date).
"""
import pandas as pd

from etl import parser


def insert_history(cur, ds, prof_index, profile_id, profile_date):
    if "N_HISTORY" not in ds.sizes or ds.sizes["N_HISTORY"] == 0:
        return
    for h in range(ds.sizes["N_HISTORY"]):
        sl = ds.isel(N_PROF=prof_index, N_HISTORY=h)

        institution = parser.safe_str(sl.HISTORY_INSTITUTION) if parser.has_var(sl, "HISTORY_INSTITUTION") else None
        if not institution:
            continue  # empty history slot

        history_date = None
        if parser.has_var(sl, "HISTORY_DATE"):
            history_date = parser.parse_argo_date(sl.HISTORY_DATE)

        cur.execute(
            """
            insert into argo.history_info
              (profile_id, profile_date, history_institution, history_step, history_software,
               history_software_release, history_reference, history_date, history_action,
               history_parameter, history_start_pres, history_stop_pres,
               history_previous_value, history_qctest)
            values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                profile_id, profile_date, institution,
                parser.safe_str(sl.HISTORY_STEP) if parser.has_var(sl, "HISTORY_STEP") else None,
                parser.safe_str(sl.HISTORY_SOFTWARE) if parser.has_var(sl, "HISTORY_SOFTWARE") else None,
                parser.safe_str(sl.HISTORY_SOFTWARE_RELEASE) if parser.has_var(sl, "HISTORY_SOFTWARE_RELEASE") else None,
                parser.safe_str(sl.HISTORY_REFERENCE) if parser.has_var(sl, "HISTORY_REFERENCE") else None,
                history_date,
                parser.safe_str(sl.HISTORY_ACTION) if parser.has_var(sl, "HISTORY_ACTION") else None,
                parser.safe_str(sl.HISTORY_PARAMETER) if parser.has_var(sl, "HISTORY_PARAMETER") else None,
                parser.safe_float(sl.HISTORY_START_PRES) if parser.has_var(sl, "HISTORY_START_PRES") else None,
                parser.safe_float(sl.HISTORY_STOP_PRES) if parser.has_var(sl, "HISTORY_STOP_PRES") else None,
                parser.safe_str(sl.HISTORY_PREVIOUS_VALUE) if parser.has_var(sl, "HISTORY_PREVIOUS_VALUE") else None,
                parser.safe_str(sl.HISTORY_QCTEST) if parser.has_var(sl, "HISTORY_QCTEST") else None,
            ),
        )
