"""Agent orchestrator — the LLM-driven tool loop.

The model decides which tools to call (native function calling). We execute each
call, feed a compact result back, and iterate until the model stops requesting
tools or we hit the iteration cap. The loop only GATHERS evidence; the synthesizer
(Component 6) turns the typed evidence into the final grounded answer.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

from app.llm.client import llm
from app.models.contracts import Message, ToolResult
from app.tools.registry import TOOL_SPECS, compact_for_llm, execute_tool

log = logging.getLogger(__name__)

MAX_ITERS = 4

SYSTEM = """You are an Argo float oceanography research assistant.

You answer using TOOLS — never invent data, numbers, or definitions.
Choose tools by intent:
- Definitions / "what is" / "explain" / QC-flag or variable meaning -> knowledge_search
- Counts / filters / "how many / show / list / which / near <place> / after <year>" -> sql_query
- Depth profiles, "profile of float X", "below N m", comparing floats -> profile_query
  (call it once per float when comparing two floats)
Mixed questions may need several tools (e.g. profile_query + knowledge_search).

Call the fewest tools needed. Never call the same tool twice with identical
arguments. When you have enough evidence, STOP calling tools and
reply with a one-line note that you are ready to answer (the detailed answer is
composed separately). Do not fabricate results if a tool fails."""


@dataclass
class AgentRun:
    question: str
    evidence: list[ToolResult] = field(default_factory=list)
    tools_used: list[str] = field(default_factory=list)
    draft_answer: str | None = None
    iterations: int = 0


def run_agent(question: str, history: list[Message] | None = None,
              max_iters: int = MAX_ITERS) -> AgentRun:
    messages: list[Message] = [Message(role="system", content=SYSTEM)]
    if history:
        messages.extend(history)
    messages.append(Message(role="user", content=question))

    run = AgentRun(question=question)
    cache: dict[tuple[str, str], ToolResult] = {}   # dedupe identical calls within a run

    for i in range(max_iters):
        run.iterations = i + 1
        resp = llm.call_with_tools(messages, TOOL_SPECS)

        if not resp.wants_tools:
            run.draft_answer = resp.text
            return run

        # Record the assistant's tool-call turn, then execute each call.
        messages.append(Message(role="assistant", content=resp.text or "",
                                tool_calls=resp.tool_calls))
        for tc in resp.tool_calls:
            key = (tc.name, json.dumps(tc.args, sort_keys=True, default=str))
            if key in cache:
                result = cache[key]                 # reuse; don't re-run or re-record
            else:
                result = execute_tool(tc.name, tc.args)
                cache[key] = result
                run.evidence.append(result)
                run.tools_used.append(tc.name)
                log.info("tool %s(%s) -> ok=%s", tc.name, tc.args, result.ok)
            # Every tool_call id still needs a matching tool message for the provider.
            messages.append(Message(role="tool", name=tc.name, tool_call_id=tc.id,
                                    content=compact_for_llm(result)))

    # Iteration cap reached: ask once more for a wrap-up (no further tools needed).
    try:
        run.draft_answer = llm.complete(
            "Based on the tool results above, give a one-line readiness note.",
            system=SYSTEM)
    except Exception:  # noqa: BLE001
        run.draft_answer = None
    return run
