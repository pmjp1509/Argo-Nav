from typing import Optional
from app.core.config import settings

ALLOWED_TABLES = {
    "argo_metadata",
    "argo_embeddings",
    "profile_parquet_index",
    "file_info",
    "history_info",
    "calibration_info",
}


def _sanitize_sql(sql: str) -> Optional[str]:
    s = sql.strip().strip('"')
    # basic safety checks
    s_lower = s.lower()
    if not s_lower.startswith("select"):
        return None
    # disallow dangerous keywords
    for bad in ("drop", "delete", "update", "insert", "alter", "create", "truncate", "grant", "revoke"):
        if bad in s_lower:
            return None
    # ensure only allowed tables are used
    if not any(tbl in s_lower for tbl in ALLOWED_TABLES):
        return None
    return s


def text_to_sql(query: str, context: str) -> str:
    """Use PremSQL generator to convert a natural language query into a safe SQL SELECT.

    Falls back to a safe default SQL if generation fails or produced unsafe SQL.
    """
    try:
        from premsql.generators import Text2SQLGeneratorHF

        model_name = settings.PREMSQL_MODEL
        device = settings.PREMSQL_DEVICE
        gen = Text2SQLGeneratorHF(
            model_or_name_or_path=model_name,
            experiment_name="argo_text2sql",
            type="inference",
            device=device,
        )

        schema = """
        Tables:
        - argo_metadata(float_id, cycle_number, latitude, longitude, mean_temp, mean_psal, mean_pres, profile_temp_qc, profile_psal_qc, profile_pres_qc, created_at)
        - argo_embeddings(float_id, cycle_number, summary, created_at)
        - profile_parquet_index(float_id, cycle_number, parquet_uri, row_count, min_pres, max_pres, variables)
        - file_info(file_id, file_name, format_version, reference_date_time)
        - history_info(...)
        - calibration_info(...)

        Note: When returning profile data, apply QC filter: profile_temp_qc = '1'. Use only SELECT queries, and limit rows to a sensible amount (e.g., LIMIT 10000).
        """

        prompt = f"""
        You are a SQL generator for a PostgreSQL database. Convert the user's question into a single, safe, read-only SQL SELECT statement.

        Schema:
        {schema}

        VDB context (short summaries of likely matching profiles):
        {context}

        User question: {query}

        Requirements:
        - Return ONLY the SQL query (no explanation).
        - Use only the allowed tables: {', '.join(sorted(ALLOWED_TABLES))}.
        - Prefer to apply profile_temp_qc = '1' if temperature is requested.
        - Limit results appropriately and avoid expensive operations.
        """

        sql = gen.generate({"prompt": prompt}, temperature=0.0, max_new_tokens=512)
        safe = _sanitize_sql(sql)
        if safe:
            return safe
    except Exception:
        pass

    # fallback
    return "SELECT * FROM argo_metadata WHERE profile_temp_qc = '1' LIMIT 100;"
