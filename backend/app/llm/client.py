from groq import Groq
from app.core.config import settings

_client = None

def get_groq_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def call_llm(prompt: str, temperature: float = 0.2) -> str:
    """
    Calls Groq LLM safely.
    Used ONLY for explanation / summarization.
    """
    client = get_groq_client()

    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an oceanography research assistant. "
                    "You explain ARGO float data accurately and cautiously."
                )
            },
            {"role": "user", "content": prompt}
        ],
        temperature=temperature,
        max_tokens=700,
    )

    return response.choices[0].message.content.strip()
