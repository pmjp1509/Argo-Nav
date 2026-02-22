# using PremSQL (deprecated, replaced by Groq-based approach)
# from typing import Optional
# import psycopg2

# from app.core.config import settings
# from app.db.schema import get_schema_text, ALLOWED_TABLES

# from premsql.generators import Text2SQLGeneratorHF


# # ----------------------------
# # LOAD MODEL ONCE
# # ----------------------------

# _generator = Text2SQLGeneratorHF(
#     model_or_name_or_path=settings.PREMSQL_MODEL,
#     experiment_name="argo_text2sql",
#     type="inference",
#     device=settings.PREMSQL_DEVICE,
# )


# # ----------------------------
# # SAFETY FILTER
# # ----------------------------

# def _sanitize_sql(sql: str) -> Optional[str]:
#     s = sql.strip().strip('"')
#     s_lower = s.lower()

#     if not s_lower.startswith("select"):
#         return None

#     for bad in (
#         "drop", "delete", "update", "insert",
#         "alter", "create", "truncate",
#         "grant", "revoke"
#     ):
#         if bad in s_lower:
#             return None

#     if not any(tbl in s_lower for tbl in ALLOWED_TABLES):
#         return None

#     return s


# # ----------------------------
# # SQL EXECUTION
# # ----------------------------

# def _execute_sql(sql: str):
#     conn = psycopg2.connect(settings.DATABASE_URL)
#     cur = conn.cursor()
#     cur.execute(sql)
#     rows = cur.fetchall()
#     cur.close()
#     conn.close()
#     return rows


# # ----------------------------
# # MAIN FUNCTION
# # ----------------------------

# def text_to_sql(query: str, context: str = "") -> str:
#     """
#     Generate schema-aware SQL using PremSQL with retry logic.
#     """

#     schema_text = get_schema_text()

#     base_prompt = f"""
# You are a PostgreSQL SQL generator.

# Schema:
# {schema_text}

# Vector context:
# {context}

# User question:
# {query}

# Rules:
# - Use only the listed tables.
# - Return only a SELECT query.
# - Apply LIMIT 10000 if no limit provided.
# - Prefer profile_temp_qc = '1' if temperature requested.
# - Return ONLY SQL.
# """

#     max_attempts = 3
#     error_message = ""

#     for attempt in range(max_attempts):
#         try:
#             sql = _generator.generate(
#                 {"prompt": base_prompt},
#                 temperature=0.0,
#                 max_new_tokens=512,
#             )

#             safe_sql = _sanitize_sql(sql)
#             if not safe_sql:
#                 raise ValueError("Unsafe SQL generated.")

#             # Try executing
#             _execute_sql(safe_sql)

#             return safe_sql

#         except Exception as e:
#             error_message = str(e)

#             base_prompt += f"""

# Previous SQL failed with error:
# {error_message}

# Fix the SQL using correct schema.
# Return only corrected SQL.
# """

#     # Fallback
#     return "SELECT * FROM argo_metadata LIMIT 100;"


#   using Groq instead of PremSQL
# app/services/text_to_sql.py

import re
import psycopg2
from typing import Optional

from app.core.config import settings
from app.db.schema import get_schema_text, ALLOWED_TABLES
from app.llm.client import call_llm


# ==========================================================
# 1️⃣ SCHEMA CACHING (LOAD ONCE)
# ==========================================================

_SCHEMA_CACHE = None

def _get_cached_schema():
    global _SCHEMA_CACHE
    if _SCHEMA_CACHE is None:
        _SCHEMA_CACHE = get_schema_text()
    return _SCHEMA_CACHE


# ==========================================================
# 2️⃣ DEPTH EXTRACTION FROM QUERY
# ==========================================================

def _extract_depth(query: str) -> Optional[int]:
    """
    Extract depth like '1000m' or '1000 m' from user query.
    Returns integer depth in meters.
    """
    match = re.search(r'(\d+)\s*m', query.lower())
    if match:
        return int(match.group(1))
    return None


# ==========================================================
# 3️⃣ SQL SAFETY FILTER
# ==========================================================

def _sanitize_sql(sql: str) -> Optional[str]:
    s = sql.strip().strip('"')
    s_lower = s.lower()

    if not s_lower.startswith("select"):
        return None

    for bad in (
        "drop", "delete", "update",
        "insert", "alter", "create",
        "truncate", "grant", "revoke"
    ):
        if bad in s_lower:
            return None

    if not any(tbl in s_lower for tbl in ALLOWED_TABLES):
        return None

    if "limit" not in s_lower:
        s += " LIMIT 10000"

    return s


# ==========================================================
# 4️⃣ SQL EXECUTION (VALIDATION ONLY)
# ==========================================================

def _execute_sql(sql: str):
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()
    cur.execute(sql)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


# ==========================================================
# 5️⃣ MASTER PROMPT BUILDER
# ==========================================================

def _build_prompt(query: str, depth: Optional[int]) -> str:

    schema_text = _get_cached_schema()

    depth_instruction = ""
    if depth:
        depth_instruction = f"""
Depth Handling:
- User requested depth {depth}m.
- Use profile_parquet_index.max_pres >= {depth}
- Do NOT reference TEMP, PRES, or PSAL directly.
"""

    return f"""
You are an expert PostgreSQL SQL generator for an Argo float scientific database.

DATABASE STRUCTURE:

1) argo_metadata:
   - One row per float cycle.
   - Aggregated stats: mean_temp, min_temp, max_temp,
     mean_pres, min_pres, max_pres,
     mean_psal, min_psal, max_psal.
   - Metadata: float_id, cycle_number,
     latitude, longitude, ocean_region,
     juld (timestamp),
     profile_temp_qc, profile_pres_qc, profile_psal_qc.

2) profile_parquet_index:
   - Contains depth data metadata only.
   - float_id, cycle_number,
     parquet_uri, min_pres, max_pres, max_depth.
   - Raw depth TEMP/PSAL/PRES stored only in Parquet.
   - NEVER reference TEMP, PRES, PSAL in SQL.

3) history_info:
   - Processing history metadata only.

4) calibration_info:
   - Sensor calibration metadata only.

5) file_info:
   - File metadata tracking only.

CRITICAL RULES:
- Always generate SELECT queries only.
- Always join argo_metadata and profile_parquet_index
  using float_id AND cycle_number.
- Use EXTRACT(MONTH FROM juld) for month filtering.
- Use ocean_region for ocean filtering.
- Apply profile_temp_qc = '1' if temperature requested.
- Always include LIMIT 10000.
- Return ONLY SQL.

{depth_instruction}

Schema:
{schema_text}

User Question:
{query}
"""


# ==========================================================
# 6️⃣ MAIN TEXT-TO-SQL FUNCTION
# ==========================================================

def text_to_sql(query: str, context: str = "") -> str:

    depth = _extract_depth(query)
    prompt = _build_prompt(query, depth)

    max_attempts = 3
    error_message = ""

    for attempt in range(max_attempts):

        try:
            sql = call_llm(
                prompt,
                temperature=0.0
            )

            safe_sql = _sanitize_sql(sql)
            if not safe_sql:
                raise ValueError("Unsafe SQL generated")

            # Validate by executing
            _execute_sql(safe_sql)

            return safe_sql

        except Exception as e:
            error_message = str(e)

            prompt += f"""

Previous SQL failed with error:
{error_message}

Fix the SQL strictly using correct schema.
Return ONLY corrected SQL.
"""

    # fallback safe query
    return "SELECT float_id, cycle_number FROM argo_metadata LIMIT 100;"



