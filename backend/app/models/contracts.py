"""Typed contracts shared across the AI backend.

These are the stable interfaces between the LLM client, the tool registry, the
orchestrator, and the API layer. Keeping them here avoids circular imports and
gives every component strong typing.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


# ===========================================================================
# LLM message + tool-calling primitives (provider-agnostic; MCP-compatible)
# ===========================================================================
Role = Literal["system", "user", "assistant", "tool"]


class ToolCall(BaseModel):
    """A single tool invocation requested by the model."""
    id: str = ""                    # provider call id (OpenAI/Groq); synthetic for Gemini
    name: str
    args: dict[str, Any] = Field(default_factory=dict)


class Message(BaseModel):
    """Normalized chat message. `tool` messages carry a tool result back."""
    role: Role
    content: str = ""
    tool_calls: list[ToolCall] = Field(default_factory=list)   # assistant -> tools
    tool_call_id: str | None = None                            # tool -> which call
    name: str | None = None                                    # tool name (tool role)


class ToolSpec(BaseModel):
    """Declaration of a callable tool (name + JSON-schema parameters).

    Shape is intentionally MCP-compatible so the same registry can later be
    exposed via an MCP server without changing tool code.
    """
    name: str
    description: str
    parameters: dict[str, Any]      # JSON Schema (type=object, properties, required)


class LLMResponse(BaseModel):
    """Normalized single-turn model response."""
    text: str | None = None
    tool_calls: list[ToolCall] = Field(default_factory=list)
    finish_reason: str | None = None
    provider: str | None = None
    model: str | None = None

    @property
    def wants_tools(self) -> bool:
        return bool(self.tool_calls)


# ===========================================================================
# Tool execution results
# ===========================================================================
class ToolResult(BaseModel):
    """Return value of a tool, fed back to the model and used by the synthesizer."""
    tool: str
    ok: bool = True
    data: dict[str, Any] = Field(default_factory=dict)   # structured payload
    error: str | None = None

    def to_model_text(self) -> str:
        """Compact text the LLM sees as the tool result."""
        import json
        if not self.ok:
            return f"ERROR from {self.tool}: {self.error}"
        return json.dumps(self.data, default=str)[:6000]


# ===========================================================================
# Domain output contracts (final API response)
# ===========================================================================
class ChartKind(str, Enum):
    profile_line = "profile_line"     # value vs depth (y inverted)
    depth_temp = "depth_temp"
    by_float_bar = "by_float_bar"
    timeseries = "timeseries"
    map = "map"


class ChartSpec(BaseModel):
    kind: ChartKind
    title: str
    x_label: str = ""
    y_label: str = ""
    series: list[dict[str, Any]] = Field(default_factory=list)   # [{label, points:[{x,y}]}]
    meta: dict[str, Any] = Field(default_factory=dict)


class Citation(BaseModel):
    doc_id: int | str
    title: str
    source: str | None = None
    snippet: str | None = None


class AgentRequest(BaseModel):
    query: str
    history: list[Message] = Field(default_factory=list)
    user_id: str | None = None


class AgentResponse(BaseModel):
    # Fields the existing frontend already reads (kept compatible):
    context: str                                   # the scientific explanation
    sql: str | None = None
    refined_query: str | None = None
    data_preview: dict[str, Any] | None = None
    float_ids: list[str] = Field(default_factory=list)
    chart_data: ChartSpec | None = None
    # New richer fields (frontend ignores unknown keys until we redesign it):
    sources: list[Citation] = Field(default_factory=list)
    confidence: float | None = None
    warnings: list[str] = Field(default_factory=list)
    follow_ups: list[str] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)
    # Set only when the request failed; a stable code the UI maps to a friendly
    # message (never leaks raw provider/tool errors). One of:
    # 'credits' | 'network' | 'unavailable' | 'unknown'.
    error_code: str | None = None
