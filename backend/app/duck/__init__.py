"""DuckDB engine for querying profile arrays stored as Parquet (Supabase Storage).
Bulk depth arrays never enter Postgres; DuckDB reads them on demand."""
