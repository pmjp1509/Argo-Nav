from app.llm.client import call_llm
from app.llm.prompts import argo_scientific_summary_prompt, query_refinement_prompt


def refine_user_query(user_query: str) -> str:
    """
    Refine user query: fix spelling/grammar and clarify for Argo context.
    Falls back to original if LLM fails.
    """
    if not (user_query or "").strip():
        return user_query or ""
    try:
        prompt = query_refinement_prompt(user_query.strip())
        refined = call_llm(prompt, temperature=0.1).strip().strip('"')
        return refined if refined else user_query
    except Exception:
        return user_query


def generate_llm_explanation(
    user_query: str,
    stats: dict
) -> str:
    """
    Generates final natural-language explanation for the user.
    """
    prompt = argo_scientific_summary_prompt(
        user_query=user_query,
        stats=stats
    )

    return call_llm(prompt)


def summarize_data(user_query: str, rows: list, matches: list) -> dict:
    """
    Summarize query results with LLM explanation.
    """
    # Build stats dict from rows
    stats = {
        "total_rows": len(rows),
        "columns": list(rows[0].keys()) if rows else [],
        "rows": rows[:10]  # First 10 rows for context
    }
    
    explanation = generate_llm_explanation(user_query, stats)
    
    return {
        "explanation": explanation,
        "data": rows,
        "match_count": len(matches)
    }
