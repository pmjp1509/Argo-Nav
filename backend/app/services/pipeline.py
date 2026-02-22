from app.services.embeddings import embed_query
from app.services.vector_search import search_vectors
from app.services.text_to_sql import text_to_sql
from app.services.sql_executor import execute_sql
from app.services.llm_services import generate_llm_explanation, refine_user_query
from app.services.parquet_reader import (
    load_profiles,
    apply_qc,
    compute_stats,
    compute_stats_from_rows,
)
from app.services.query_classifier import is_depth_query

async def run_pipeline(query: str):
    refined_query = refine_user_query(query)
    embedding = embed_query(refined_query)
    matches = search_vectors(embedding)
    context = "\n".join(
        f"{m[0]}-{m[1]}: {m[2]}" for m in matches
    )
    sql = text_to_sql(query, context)
    rows = execute_sql(sql)

    if is_depth_query(query):
        profile_dfs = load_profiles(rows)
        profile_dfs = apply_qc(profile_dfs)
        stats = compute_stats(profile_dfs)
        if stats.get("total_rows", 0) == 0 and rows:
            stats = compute_stats_from_rows(rows)
    else:
        stats = compute_stats_from_rows(rows)

    float_ids = stats.get("float_ids", [])
    if not float_ids and rows:
        seen = set()
        for r in rows:
            fid = r.get("float_id") if isinstance(r, dict) else (r[0] if r else None)
            if fid is not None and fid not in seen:
                seen.add(fid)
                float_ids.append(str(fid))
        stats["float_ids"] = float_ids

    explanation = generate_llm_explanation(
        user_query=query,
        stats=stats
    )

    return {
        "sql": sql,
        "context": explanation,
        "data_preview": stats,
        "refined_query": refined_query,
        "float_ids": float_ids,
    }
