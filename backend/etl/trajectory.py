"""Trajectory points.

`*_prof.nc` files carry one surfacing position per profile (LAT/LON/JULD), which
is exactly one trajectory vertex per cycle. We derive the float's surface track
from those. (Full high-rate trajectories live in `*_Rtraj.nc`; add a dedicated
reader later if you ingest those.)
"""


def insert_trajectory_point(cur, platform_number, cycle_number, juld, lat, lon, position_qc, file_id):
    if juld is None or lat is None or lon is None:
        return
    cur.execute(
        """
        insert into argo.trajectory
          (platform_number, cycle_number, ts, ts_date, latitude, longitude, position_qc, file_id)
        values (%s,%s,%s,%s,%s,%s,%s,%s)
        on conflict (platform_number, cycle_number, ts_date) do nothing
        """,
        (platform_number, cycle_number, juld.isoformat(), juld.date().isoformat(),
         lat, lon, (position_qc or None), file_id),
    )
