from scipy import stats
from app.services.embeddings import embed_query
from app.services.vector_search import search_vectors
from app.services.text_to_sql import text_to_sql
from app.services.sql_executor import execute_sql
from app.services.llm_services import generate_llm_explanation
from app.services.parquet_reader import load_profiles, apply_qc, compute_stats

async def run_pipeline(query: str):
    embedding = embed_query(query)
    matches = search_vectors(embedding)

    context = "\n".join(
        f"{m[0]}-{m[1]}: {m[2]}" for m in matches
    )

    sql = text_to_sql(query, context)
    rows = execute_sql(sql)

    df = load_profiles(rows)
    df = apply_qc(df)

    stats = compute_stats(df)

    explanation = generate_llm_explanation(
        user_query=query,
        stats=stats
    )

    return {
        "sql": sql,
        "stats": stats,
        "explanation": explanation
    }
