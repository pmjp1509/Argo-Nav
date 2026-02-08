from app.llm.client import call_llm
from app.llm.prompts import scientific_summary_prompt

def explain_with_llm(stats: dict) -> str:
    prompt = scientific_summary_prompt(stats)
    return call_llm(prompt)
