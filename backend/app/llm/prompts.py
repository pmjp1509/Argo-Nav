def query_refinement_prompt(user_query: str) -> str:
    """
    Strictly correct spelling/grammar while preserving exact user intent.
    No added assumptions, constraints, or extra details.
    """
    return f"""
You are an assistant that cleans up user questions about oceanographic and Argo float data.

User question:
{user_query}

Rules:
1. Correct spelling and grammar only.
2. Improve clarity slightly if needed.
3. DO NOT add new details, assumptions, filters, ranges, numbers, or constraints.
4. DO NOT expand the scope of the question.
5. Keep the original intent exactly the same.
6. Output ONLY the corrected question.

If the question is already clear, return it unchanged.
"""

def argo_scientific_summary_prompt(
    user_query: str,
    stats: dict,
) -> str:
    """
    Prompt for scientific explanation of ARGO float results.
    """

    return f"""
You are an expert oceanography research assistant.

A user asked the following question:
\"\"\"{user_query}\"\"\"

You are given a PRE-COMPUTED statistical summary derived from ARGO float data.
The numbers are authoritative. Do NOT invent new values.

Rules you MUST follow:
- Do NOT hallucinate data
- Do NOT infer trends not supported by numbers
- Use cautious scientific language (e.g., "suggests", "indicates")
- If uncertainty exists, state it
- Do NOT mention machine learning or AI
- Do NOT output SQL or code

Statistical summary:
{stats}

Write a clear, concise scientific explanation suitable for a research dashboard.
"""


def scientific_summary_prompt(stats: dict) -> str:
    """Alias for backward compatibility (e.g. explainer.py)."""
    return argo_scientific_summary_prompt(user_query="Summarize the data.", stats=stats)
