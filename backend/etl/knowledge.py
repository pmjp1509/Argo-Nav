"""Seed the KNOWLEDGE base for RAG (Step 7).

Embeds *knowledge*, not per-profile metadata:
  - DATA_MODE / QC flag / variable definitions (from the reference tables)
  - Argo handbook snippets
  - schema documentation (table + column meanings) for the SQL agent
  - curated NL -> SQL few-shot examples

Idempotent: upserts on (source, title) / nl_question.
Run:  python -m etl.knowledge
"""
from pgvector.psycopg2 import register_vector

from etl.config import get_conn, log
from etl.embeddings import embed

# ---------------------------------------------------------------------------
# Static handbook + schema documentation
# ---------------------------------------------------------------------------
HANDBOOK_DOCS = [
    ("handbook", "What is an Argo float",
     "An Argo float is an autonomous profiling instrument that drifts at a parking "
     "depth (usually ~1000 dbar), periodically descends to ~2000 dbar, then ascends "
     "to the surface measuring pressure, temperature and salinity. Each ascent is a "
     "'cycle'. Positions are fixed by GPS/Argos at the surface, then data is transmitted."),
    ("handbook", "Cycle and profile",
     "A cycle_number identifies one dive-and-surface sequence of a float. Each cycle "
     "yields a vertical profile: measurements at many pressure (depth) levels. "
     "direction 'A' = ascending profile, 'D' = descending."),
    ("handbook", "Pressure as depth",
     "Argo reports PRES in decibars (dbar). In seawater 1 dbar ≈ 1 metre of depth, so "
     "pressure is used as a depth proxy. 'below 500 m' ≈ 'PRES >= 500 dbar'."),
    ("handbook", "Adjusted vs real-time values",
     "Variables have raw (e.g. TEMP) and adjusted (e.g. TEMP_ADJUSTED) forms. Adjusted "
     "values include delayed-mode scientific corrections and are preferred for research "
     "when available (has_adjusted = true / data_mode = 'D')."),
    ("schema_doc", "Table argo.floats",
     "argo.floats: one row per physical float, keyed by platform_number (WMO id). "
     "Columns: platform_type, pi_name, project_name, data_centre, float_type "
     "('core'|'bgc'), deploy_date, is_active, n_cycles. Join to argo.profiles on "
     "platform_number."),
    ("schema_doc", "Table argo.profiles",
     "argo.profiles: one row per float cycle (profile). Keyed by profile_id. Columns: "
     "platform_number (FK floats), cycle_number, direction, juld (timestamp), geom "
     "(PostGIS geography point), latitude, longitude, region_id, data_mode, max_pres, "
     "n_levels. Use ST_DWithin(geom, ST_MakePoint(lon,lat)::geography, metres) for "
     "'near a place'. Filter time with juld."),
    ("schema_doc", "Table argo.profile_param_stats",
     "argo.profile_param_stats: long-format per-parameter summary for each profile. "
     "Columns: profile_id, parameter ('TEMP','PSAL','PRES','DOXY',...), min_value, "
     "max_value, mean_value, n_valid, profile_qc. To filter 'max temperature > 25', "
     "join where parameter='TEMP' and max_value > 25."),
    ("schema_doc", "Table argo.profile_parquet_index",
     "argo.profile_parquet_index: manifest pointing to Parquet files with the full "
     "depth arrays (PRES/TEMP/PSAL per level). Postgres holds only summaries; raw "
     "vertical arrays are read from Parquet with DuckDB. Do NOT reference TEMP/PRES/PSAL "
     "level arrays directly in SQL."),
    ("schema_doc", "Joins and rules",
     "Common joins: profiles.platform_number = floats.platform_number; "
     "profile_param_stats.profile_id = profiles.profile_id. Always SELECT only, always "
     "LIMIT. For a specific parameter's stats, filter profile_param_stats.parameter."),
]


def _reference_docs(cur):
    docs = []
    cur.execute("select code, name, description from argo.data_modes")
    for code, name, desc in cur.fetchall():
        docs.append(("data_mode_def", f"DATA_MODE '{code}' ({name})",
                     f"DATA_MODE '{code}' means {name}: {desc}"))
    cur.execute("select flag, name, description, is_usable from argo.qc_flags")
    for flag, name, desc, usable in cur.fetchall():
        docs.append(("qc_def", f"QC flag '{flag}' ({name})",
                     f"Quality control flag '{flag}' = {name}: {desc} "
                     f"{'Usable for science.' if usable else 'Not recommended for science.'}"))
    cur.execute("select code, long_name, unit, description from argo.parameters")
    for code, long_name, unit, desc in cur.fetchall():
        docs.append(("param_def", f"Variable {code}",
                     f"{code} = {long_name}"
                     f"{f' (unit: {unit})' if unit else ''}. {desc or ''}"))
    return docs


# ---------------------------------------------------------------------------
# Curated NL -> SQL few-shot examples (new schema)
# ---------------------------------------------------------------------------
SQL_EXAMPLES = [
    ("Show floats near Chennai after 2022",
     "SELECT DISTINCT f.platform_number, p.latitude, p.longitude, p.juld "
     "FROM argo.profiles p JOIN argo.floats f ON f.platform_number = p.platform_number "
     "WHERE ST_DWithin(p.geom, ST_SetSRID(ST_MakePoint(80.27, 13.08),4326)::geography, 300000) "
     "AND p.juld >= '2022-01-01' LIMIT 1000;",
     ["spatial", "time"]),
    ("List floats deployed in the Indian Ocean with maximum temperature above 25 degrees",
     "SELECT DISTINCT f.platform_number, s.max_value AS max_temp "
     "FROM argo.profiles p JOIN argo.floats f ON f.platform_number = p.platform_number "
     "JOIN argo.profile_param_stats s ON s.profile_id = p.profile_id "
     "WHERE s.parameter = 'TEMP' AND s.max_value > 25 LIMIT 1000;",
     ["stats", "join"]),
    ("How many profiles does float 2902746 have",
     "SELECT COUNT(*) AS n_profiles FROM argo.profiles WHERE platform_number = '2902746';",
     ["count"]),
    ("Average salinity by float in December 2023",
     "SELECT p.platform_number, AVG(s.mean_value) AS avg_psal "
     "FROM argo.profiles p JOIN argo.profile_param_stats s ON s.profile_id = p.profile_id "
     "WHERE s.parameter = 'PSAL' AND EXTRACT(MONTH FROM p.juld) = 12 "
     "AND EXTRACT(YEAR FROM p.juld) = 2023 GROUP BY p.platform_number LIMIT 1000;",
     ["stats", "time", "groupby"]),
    ("Which profiles of float 2902746 reach below 1500 metres",
     "SELECT profile_id, cycle_number, max_pres FROM argo.profiles "
     "WHERE platform_number = '2902746' AND max_pres >= 1500 ORDER BY cycle_number LIMIT 1000;",
     ["depth"]),
]


def seed_knowledge():
    conn = get_conn()
    register_vector(conn)
    cur = conn.cursor()

    docs = HANDBOOK_DOCS + _reference_docs(cur)
    for source, title, content in docs:
        cur.execute(
            """
            insert into argo.knowledge_docs (source, title, content, embedding)
            values (%s,%s,%s,%s)
            on conflict (source, title) do update set
              content = excluded.content, embedding = excluded.embedding
            """,
            (source, title, content, embed(content)),
        )
    log.info("Seeded %d knowledge_docs", len(docs))

    for q, sql, tags in SQL_EXAMPLES:
        cur.execute(
            """
            insert into argo.sql_examples (nl_question, sql, tags, embedding)
            values (%s,%s,%s,%s)
            on conflict (nl_question) do update set
              sql = excluded.sql, tags = excluded.tags, embedding = excluded.embedding
            """,
            (q, sql, tags, embed(q)),
        )
    log.info("Seeded %d sql_examples", len(SQL_EXAMPLES))

    conn.commit()
    cur.close()
    conn.close()


if __name__ == "__main__":
    seed_knowledge()
