from app.llm.client import call_llm
from app.llm.prompts import argo_scientific_summary_prompt

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
