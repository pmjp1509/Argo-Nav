# using PremSQL (deprecated, replaced by Groq-based approach)
# import psycopg2
# from app.core.config import settings

# ALLOWED_TABLES = {
#     "argo_metadata",
#     "argo_embeddings",
#     "argo_trajectory",
#     "profile_parquet_index",
#     "file_info",
#     "history_info",
#     "calibration_info",
# }


# def get_schema_text() -> str:
#     """
#     Dynamically extract schema from PostgreSQL (Supabase)
#     and return it as structured text for PremSQL.
#     """
#     conn = psycopg2.connect(settings.DATABASE_URL)
#     cur = conn.cursor()

#     cur.execute("""
#         SELECT table_name, column_name, data_type
#         FROM information_schema.columns
#         WHERE table_schema = 'public'
#         ORDER BY table_name, ordinal_position;
#     """)

#     rows = cur.fetchall()
#     cur.close()
#     conn.close()

#     schema_map = {}

#     for table, column, dtype in rows:
#         if table not in ALLOWED_TABLES:
#             continue

#         if table not in schema_map:
#             schema_map[table] = []

#         schema_map[table].append(f"{column} ({dtype})")

#     schema_text = "Tables:\n"
#     for table, columns in schema_map.items():
#         schema_text += f"- {table}({', '.join(columns)})\n"

#     return schema_text


#   using Groq instead of PremSQL
import psycopg2
from app.core.config import settings

ALLOWED_TABLES = {
    "argo_metadata",
    "argo_embeddings",
    "profile_parquet_index",
    "file_info",
    "history_info",
    "calibration_info",
}

def get_schema_text() -> str:
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()

    cur.execute("""
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
    """)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    schema_map = {}

    for table, column, dtype in rows:
        if table not in ALLOWED_TABLES:
            continue

        if table not in schema_map:
            schema_map[table] = []

        schema_map[table].append(f"{column} ({dtype})")

    schema_text = "Tables:\n"
    for table, columns in schema_map.items():
        schema_text += f"- {table}({', '.join(columns)})\n"

    return schema_text