"""Provider-agnostic LLM client (Gemini primary, Groq fallback).

Swap providers/models via .env only — the rest of the backend calls the same
three methods regardless of provider:

    llm.complete(prompt, system=...)          -> str
    llm.json_object(prompt, system=...)       -> dict          (structured JSON)
    llm.call_with_tools(messages, tools=...)  -> LLMResponse   (function calling)

Adapters translate the normalized Message / ToolSpec / ToolCall contracts to and
from each provider's native format. Clients are created lazily so importing this
module never requires API keys.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Protocol

from app.core.config import settings
from app.models.contracts import LLMResponse, Message, ToolCall, ToolSpec

log = logging.getLogger(__name__)


# ===========================================================================
# Adapter protocol
# ===========================================================================
class _Adapter(Protocol):
    name: str
    def generate(self, messages: list[Message], tools: list[ToolSpec] | None,
                 json_mode: bool, temperature: float, model: str | None) -> LLMResponse: ...


# ===========================================================================
# Gemini adapter  (google-genai SDK)
# ===========================================================================
class GeminiAdapter:
    name = "gemini"

    def __init__(self):
        self._client = None

    def _client_(self):
        if self._client is None:
            from google import genai
            if not settings.GEMINI_API_KEY:
                raise RuntimeError("GEMINI_API_KEY not set")
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    def generate(self, messages, tools, json_mode, temperature, model) -> LLMResponse:
        from google.genai import types

        model = model or settings.GEMINI_MODEL
        system = "\n".join(m.content for m in messages if m.role == "system") or None
        contents = self._to_contents(messages, types)

        cfg_kwargs: dict = {"temperature": temperature}
        if system:
            cfg_kwargs["system_instruction"] = system
        if json_mode:
            cfg_kwargs["response_mime_type"] = "application/json"
        if tools:
            cfg_kwargs["tools"] = [types.Tool(function_declarations=[
                types.FunctionDeclaration(name=t.name, description=t.description,
                                          parameters=t.parameters)
                for t in tools
            ])]

        resp = self._client_().models.generate_content(
            model=model, contents=contents,
            config=types.GenerateContentConfig(**cfg_kwargs),
        )

        text_parts, calls = [], []
        cand = (resp.candidates or [None])[0]
        if cand and cand.content and cand.content.parts:
            for i, part in enumerate(cand.content.parts):
                if getattr(part, "function_call", None):
                    fc = part.function_call
                    calls.append(ToolCall(id=f"gemini-{i}", name=fc.name,
                                          args=dict(fc.args or {})))
                elif getattr(part, "text", None):
                    text_parts.append(part.text)

        return LLMResponse(text="".join(text_parts) or None, tool_calls=calls,
                           provider=self.name, model=model)

    @staticmethod
    def _to_contents(messages, types):
        """Map normalized messages to Gemini Content list (system handled separately)."""
        contents = []
        for m in messages:
            if m.role == "system":
                continue
            if m.role == "user":
                contents.append(types.Content(role="user",
                                              parts=[types.Part(text=m.content)]))
            elif m.role == "assistant":
                parts = []
                if m.content:
                    parts.append(types.Part(text=m.content))
                for tc in m.tool_calls:
                    parts.append(types.Part(function_call=types.FunctionCall(
                        name=tc.name, args=tc.args)))
                contents.append(types.Content(role="model", parts=parts or [types.Part(text="")]))
            elif m.role == "tool":
                contents.append(types.Content(role="user", parts=[types.Part(
                    function_response=types.FunctionResponse(
                        name=m.name or "tool", response={"result": m.content}))]))
        return contents


# ===========================================================================
# Groq adapter  (OpenAI-compatible)
# ===========================================================================
class GroqAdapter:
    name = "groq"

    def __init__(self):
        self._client = None

    def _client_(self):
        if self._client is None:
            from groq import Groq
            if not settings.GROQ_API_KEY:
                raise RuntimeError("GROQ_API_KEY not set")
            self._client = Groq(api_key=settings.GROQ_API_KEY)
        return self._client

    def generate(self, messages, tools, json_mode, temperature, model) -> LLMResponse:
        model = model or settings.GROQ_MODEL
        payload_msgs = [self._to_openai(m) for m in messages]

        kwargs: dict = {"model": model, "messages": payload_msgs, "temperature": temperature}
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        if tools:
            kwargs["tools"] = [{"type": "function", "function": {
                "name": t.name, "description": t.description, "parameters": t.parameters}}
                for t in tools]
            kwargs["tool_choice"] = "auto"

        try:
            resp = self._client_().chat.completions.create(**kwargs)
        except Exception as exc:  # noqa: BLE001
            # Groq/Llama sometimes emit a tool call in a non-standard format that
            # Groq's parser rejects (400 tool_use_failed). Recover the intended
            # tool call from `failed_generation` instead of failing the request.
            recovered = _recover_groq_tool_calls(exc)
            if recovered:
                log.warning("recovered %d tool call(s) from Groq tool_use_failed", len(recovered))
                return LLMResponse(tool_calls=recovered, finish_reason="tool_calls",
                                   provider=self.name, model=model)
            raise

        choice = resp.choices[0]
        msg = choice.message
        calls = []
        for tc in (msg.tool_calls or []):
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            calls.append(ToolCall(id=tc.id, name=tc.function.name, args=args))

        return LLMResponse(text=msg.content, tool_calls=calls,
                           finish_reason=choice.finish_reason,
                           provider=self.name, model=model)

    @staticmethod
    def _to_openai(m: Message) -> dict:
        if m.role == "assistant" and m.tool_calls:
            return {"role": "assistant", "content": m.content or "",
                    "tool_calls": [{"id": tc.id, "type": "function",
                                    "function": {"name": tc.name,
                                                 "arguments": json.dumps(tc.args)}}
                                   for tc in m.tool_calls]}
        if m.role == "tool":
            return {"role": "tool", "tool_call_id": m.tool_call_id or "",
                    "name": m.name, "content": m.content}
        return {"role": m.role, "content": m.content}


# ---------------------------------------------------------------------------
# Groq tool_use_failed recovery (provider-compatibility normalization)
# ---------------------------------------------------------------------------
_FN_RE = re.compile(r"<function=([A-Za-z_]\w*)\s*>?\s*(\{.*?\})\s*(?:</function>|>)", re.DOTALL)


def _recover_groq_tool_calls(exc: Exception):
    """Parse Groq's `failed_generation` (e.g. `<function=sql_query{...}>`) into
    proper ToolCalls. Returns a list or None if it isn't a recoverable case."""
    body = getattr(exc, "body", None)
    fg = None
    if isinstance(body, dict):
        err = body.get("error") or {}
        if err.get("code") == "tool_use_failed" or "failed_generation" in err:
            fg = err.get("failed_generation")
    if fg is None:
        s = str(exc)
        if "tool_use_failed" not in s and "failed_generation" not in s:
            return None
        m = re.search(r"failed_generation['\"]?\s*[:=]\s*['\"](.+?)['\"]\s*[,}]", s, re.DOTALL)
        if m:
            try:
                fg = m.group(1).encode().decode("unicode_escape")
            except (UnicodeDecodeError, ValueError):
                fg = m.group(1)
        else:
            fg = s
    if not fg:
        return None

    calls = []
    for i, match in enumerate(_FN_RE.finditer(fg)):
        try:
            args = json.loads(match.group(2))
        except json.JSONDecodeError:
            continue
        calls.append(ToolCall(id=f"groq-recover-{i}", name=match.group(1), args=args))
    return calls or None


# ===========================================================================
# Public client with provider routing + fallback
# ===========================================================================
_ADAPTERS = {"gemini": GeminiAdapter, "groq": GroqAdapter}


class LLMClient:
    def __init__(self):
        self._cache: dict[str, _Adapter] = {}

    def _adapter(self, provider: str | None) -> _Adapter:
        provider = (provider or settings.LLM_PROVIDER).lower()
        if provider not in _ADAPTERS:
            raise ValueError(f"Unknown LLM provider: {provider}")
        if provider not in self._cache:
            self._cache[provider] = _ADAPTERS[provider]()
        return self._cache[provider]

    def _run(self, messages, tools, json_mode, temperature, model, provider) -> LLMResponse:
        try:
            return self._adapter(provider).generate(messages, tools, json_mode, temperature, model)
        except Exception as exc:  # noqa: BLE001
            fb = settings.LLM_FALLBACK_PROVIDER
            if fb and (provider or settings.LLM_PROVIDER) != fb:
                log.warning("LLM primary failed (%s); falling back to %s", exc, fb)
                return self._adapter(fb).generate(messages, tools, json_mode, temperature, None)
            raise

    # -- convenience API ---------------------------------------------------
    def complete(self, prompt: str, system: str | None = None, temperature: float = 0.2,
                 model: str | None = None, provider: str | None = None) -> str:
        msgs = ([Message(role="system", content=system)] if system else []) + \
               [Message(role="user", content=prompt)]
        return self._run(msgs, None, False, temperature, model, provider).text or ""

    def json_object(self, prompt: str, system: str | None = None,
                    model: str | None = None, provider: str | None = None) -> dict:
        sys = (system or "") + "\nRespond with a single valid JSON object and nothing else."
        msgs = [Message(role="system", content=sys), Message(role="user", content=prompt)]
        raw = self._run(msgs, None, True, 0.0, model, provider).text or "{}"
        return _loads_lenient(raw)

    def call_with_tools(self, messages: list[Message], tools: list[ToolSpec],
                        temperature: float = 0.1, model: str | None = None,
                        provider: str | None = None) -> LLMResponse:
        return self._run(messages, tools, False, temperature, model, provider)


def _loads_lenient(raw: str) -> dict:
    """Parse JSON, tolerating markdown fences or leading prose."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw[raw.find("{"):]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(raw[start:end + 1])
            except json.JSONDecodeError:
                pass
    return {}


# Singleton used across the backend.
llm = LLMClient()
