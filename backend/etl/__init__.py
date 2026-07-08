"""ARGO Float AI — ETL package.

Replaces the old Colab notebook (preprocessing/Argo_float.ipynb) with a
reproducible pipeline that ingests NetCDF profile files into the new schema:

    NetCDF (*_prof.nc)
      -> floats + profiles + per-parameter stats   (Postgres: argo.*)
      -> trajectory points                          (Postgres: argo.trajectory)
      -> calibration + history                      (Postgres: argo.calibration_info / history_info)
      -> profile arrays                             (Parquet + argo.profile_parquet_index)

Knowledge docs (DATA_MODE, QC flags, variables, handbook, schema) are seeded
separately by `etl.knowledge` — they are NOT per-profile metadata.

Entry point:  python -m etl.ingest --path <folder-with-.nc-files>
"""
