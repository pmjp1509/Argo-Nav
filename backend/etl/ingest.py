"""ETL orchestrator — the ONE command you run.

Usage:
    python -m etl.ingest --path "C:\\path\\to\\folder-with-nc-files"
    python -m etl.ingest --path file.nc --seed-knowledge

Given a folder, it processes every matching NetCDF file:
    file_info -> floats -> profiles -> param stats -> trajectory
              -> calibration -> history -> parquet + manifest
then recomputes float-level aggregates. Re-running is safe (idempotent upserts).
"""
import argparse
import glob
import hashlib
import os

from etl import calibration, history, metadata, trajectory
from etl.config import get_conn, log
from etl.parquet_writer import ProfileParquetCollector
from etl.parser import open_netcdf, reference_datetime

BGC_MARKERS = ("DOXY", "CHLA", "BBP", "NITRATE", "PH_IN_SITU")

# Where the downloader (NetCDF files/get_nc.py) mirrors the archive.
DEFAULT_ROOT = os.getenv("NETCDF_ROOT") or os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "NetCDF files")
)


def discover_nc_files(root: str) -> list[str]:
    """Recursively find every .nc file under a folder (any year/month depth)."""
    if os.path.isfile(root):
        return [root]
    return sorted(glob.glob(os.path.join(root, "**", "*.nc"), recursive=True))


def already_ingested(cur, filename: str) -> bool:
    """A committed argo.files row means the whole file ingested successfully."""
    cur.execute("select 1 from argo.files where file_name = %s limit 1", (filename,))
    return cur.fetchone() is not None


def _hash_file(path: str) -> str:
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _is_bgc(ds) -> bool:
    return any(any(m in v for m in BGC_MARKERS) for v in ds.data_vars)


def ingest_file(path: str) -> dict:
    filename = os.path.basename(path)
    stem = os.path.splitext(filename)[0]
    log.info("── Ingesting %s", filename)

    ds = open_netcdf(path)
    juld_ref = reference_datetime(ds)
    is_bgc = _is_bgc(ds)
    n_prof = int(ds.sizes.get("N_PROF", 0))

    conn = get_conn()
    cur = conn.cursor()
    collector = ProfileParquetCollector(stem)
    counts = {"profiles": 0, "skipped": 0}

    try:
        file_id = metadata.insert_file(cur, ds, filename, _hash_file(path))

        for i in range(n_prof):
            profile = ds.isel(N_PROF=i)
            try:
                metadata.upsert_float(cur, _platform(profile), ds, is_bgc)
                (profile_id, pdate, float_id, cycle, direction,
                 juld, lat, lon, pos_qc) = metadata.insert_profile(cur, profile, ds, file_id, juld_ref)

                metadata.insert_param_stats(cur, profile, profile_id, pdate)
                trajectory.insert_trajectory_point(cur, float_id, cycle, juld, lat, lon, pos_qc, file_id)
                calibration.insert_calibration(cur, ds, i, profile_id, pdate)
                history.insert_history(cur, ds, i, profile_id, pdate)
                collector.add(profile, profile_id, pdate, float_id, cycle, direction)
                counts["profiles"] += 1
            except Exception as exc:  # noqa: BLE001
                log.warning("  profile %d skipped: %s", i, exc)
                counts["skipped"] += 1

        counts.update(collector.flush(cur))
        conn.commit()
        log.info("   done: %s", counts)
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
        ds.close()
    return counts


def _platform(profile):
    from etl.parser import safe_str
    return safe_str(profile.PLATFORM_NUMBER)


def finalize_floats():
    """Recompute per-float aggregates after ingestion."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        update argo.floats f set
          n_cycles = agg.n, first_cycle_at = agg.first, last_cycle_at = agg.last,
          -- deploy_date proxy: launch ~ first profile (true deploy date is in meta files)
          deploy_date = coalesce(f.deploy_date, agg.first),
          is_active = (agg.last >= now() - interval '45 days'), updated_at = now()
        from (
          select platform_number, count(*) n, min(juld) first, max(juld) last
          from argo.profiles group by platform_number
        ) agg
        where agg.platform_number = f.platform_number
        """
    )
    conn.commit()
    cur.close()
    conn.close()
    log.info("Float aggregates recomputed.")


def main():
    ap = argparse.ArgumentParser(description="Ingest Argo NetCDF files into the database.")
    ap.add_argument("--path", default=DEFAULT_ROOT,
                    help=f"Folder (traversed recursively) or single .nc file. Default: {DEFAULT_ROOT}")
    ap.add_argument("--seed-knowledge", action="store_true", help="Also (re)seed the knowledge base")
    ap.add_argument("--force", action="store_true", help="Re-ingest files already in argo.files")
    args = ap.parse_args()

    files = discover_nc_files(args.path)
    total = len(files)
    if not total:
        log.error("No .nc files found under %s", args.path)
        return
    print(f"Found {total:,} NetCDF files\n")

    counts = {"completed": 0, "failed": 0, "skipped": 0, "profiles": 0}
    check_conn = get_conn()
    check_cur = check_conn.cursor()

    for i, path in enumerate(files, 1):
        name = os.path.basename(path)
        rel = os.path.relpath(path, args.path) if os.path.isdir(args.path) else name

        if not args.force and already_ingested(check_cur, name):
            counts["skipped"] += 1
            print(f"[{i}/{total}] skip     {rel}")
            continue

        print(f"[{i}/{total}] Processing {rel}", flush=True)
        try:
            c = ingest_file(path)
            counts["completed"] += 1
            counts["profiles"] += c.get("profiles", 0)
        except Exception as exc:  # noqa: BLE001
            counts["failed"] += 1
            log.error("FAILED %s: %s", name, exc)

    check_cur.close()
    check_conn.close()

    finalize_floats()

    if args.seed_knowledge:
        from etl.knowledge import seed_knowledge
        seed_knowledge()

    print("\n════════ Completed ════════")
    print(f"Failed:   {counts['failed']}")
    print(f"Skipped:  {counts['skipped']}")
    print(f"Inserted: {counts['completed']}   (profiles: {counts['profiles']:,})")


if __name__ == "__main__":
    main()
