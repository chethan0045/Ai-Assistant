"""Query/inference engine for AI conversation orchestration.

Manages multi-turn conversations with token budgets, automatic
compaction, streaming event generation, and session persistence.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Generator
from uuid import uuid4

from .usage import TokenUsage


@dataclass(frozen=True)
class QueryRequest:
    """Minimal inference request."""

    prompt: str


@dataclass(frozen=True)
class QueryResponse:
    """Minimal inference response."""

    text: str


@dataclass(frozen=True)
class PermissionDenial:
    """Records a denied tool access attempt."""

    tool_name: str
    reason: str


@dataclass(frozen=True)
class QueryEngineConfig:
    """Configuration for the query engine."""

    max_turns: int = 8
    max_budget_tokens: int = 2000
    compact_after_turns: int = 12
    structured_output: bool = False
    structured_retry_limit: int = 2


@dataclass(frozen=True)
class TurnResult:
    """Result of a single conversation turn."""

    prompt: str
    output: str
    matched_commands: tuple[str, ...] = ()
    matched_tools: tuple[str, ...] = ()
    permission_denials: tuple[PermissionDenial, ...] = ()
    usage: TokenUsage = field(default_factory=TokenUsage)
    stop_reason: str = "completed"


@dataclass
class TranscriptStore:
    """In-memory conversation transcript with compaction."""

    entries: list[str] = field(default_factory=list)
    flushed: bool = False

    def append(self, entry: str) -> None:
        self.entries.append(entry)
        self.flushed = False

    def compact(self, keep_last: int = 10) -> None:
        if len(self.entries) > keep_last:
            self.entries[:] = self.entries[-keep_last:]

    def replay(self) -> tuple[str, ...]:
        return tuple(self.entries)

    def flush(self) -> None:
        self.flushed = True


@dataclass
class QueryEngine:
    """Multi-turn AI conversation engine.

    Manages message history, token budgets, transcript storage,
    and session persistence. Supports both synchronous and streaming
    submission of prompts.
    """

    config: QueryEngineConfig = field(default_factory=QueryEngineConfig)
    session_id: str = field(default_factory=lambda: uuid4().hex)
    messages: list[str] = field(default_factory=list)
    permission_denials: list[PermissionDenial] = field(default_factory=list)
    total_usage: TokenUsage = field(default_factory=TokenUsage)
    transcript: TranscriptStore = field(default_factory=TranscriptStore)

    def submit(
        self,
        prompt: str,
        matched_commands: tuple[str, ...] = (),
        matched_tools: tuple[str, ...] = (),
        denied_tools: tuple[PermissionDenial, ...] = (),
    ) -> TurnResult:
        """Process a single user message and return a turn result."""
        if len(self.messages) >= self.config.max_turns:
            return TurnResult(
                prompt=prompt,
                output=f"Max turns reached before processing prompt: {prompt}",
                matched_commands=matched_commands,
                matched_tools=matched_tools,
                permission_denials=denied_tools,
                usage=self.total_usage,
                stop_reason="max_turns_reached",
            )

        summary_lines = [
            f"Prompt: {prompt}",
            f"Matched commands: {', '.join(matched_commands) if matched_commands else 'none'}",
            f"Matched tools: {', '.join(matched_tools) if matched_tools else 'none'}",
            f"Permission denials: {len(denied_tools)}",
        ]
        output = self._format_output(summary_lines)
        projected_usage = self.total_usage.add_turn(prompt, output)

        stop_reason = "completed"
        if projected_usage.input_tokens + projected_usage.output_tokens > self.config.max_budget_tokens:
            stop_reason = "max_budget_reached"

        self.messages.append(prompt)
        self.transcript.append(prompt)
        self.permission_denials.extend(denied_tools)
        self.total_usage = projected_usage
        self._compact_if_needed()

        return TurnResult(
            prompt=prompt,
            output=output,
            matched_commands=matched_commands,
            matched_tools=matched_tools,
            permission_denials=denied_tools,
            usage=self.total_usage,
            stop_reason=stop_reason,
        )

    def stream_submit(
        self,
        prompt: str,
        matched_commands: tuple[str, ...] = (),
        matched_tools: tuple[str, ...] = (),
        denied_tools: tuple[PermissionDenial, ...] = (),
    ) -> Generator[dict[str, Any], None, None]:
        """Submit a prompt and yield streaming events."""
        yield {"type": "message_start", "session_id": self.session_id, "prompt": prompt}
        if matched_commands:
            yield {"type": "command_match", "commands": matched_commands}
        if matched_tools:
            yield {"type": "tool_match", "tools": matched_tools}
        if denied_tools:
            yield {"type": "permission_denial", "denials": [d.tool_name for d in denied_tools]}

        result = self.submit(prompt, matched_commands, matched_tools, denied_tools)
        yield {"type": "message_delta", "text": result.output}
        yield {
            "type": "message_stop",
            "usage": {
                "input_tokens": result.usage.input_tokens,
                "output_tokens": result.usage.output_tokens,
            },
            "stop_reason": result.stop_reason,
            "transcript_size": len(self.transcript.entries),
        }

    def run_turns(
        self,
        prompt: str,
        max_turns: int = 3,
        matched_commands: tuple[str, ...] = (),
        matched_tools: tuple[str, ...] = (),
    ) -> list[TurnResult]:
        """Run multiple turns of conversation."""
        results: list[TurnResult] = []
        for turn in range(max_turns):
            turn_prompt = prompt if turn == 0 else f"{prompt} [turn {turn + 1}]"
            result = self.submit(turn_prompt, matched_commands, matched_tools, ())
            results.append(result)
            if result.stop_reason != "completed":
                break
        return results

    def _compact_if_needed(self) -> None:
        if len(self.messages) > self.config.compact_after_turns:
            self.messages[:] = self.messages[-self.config.compact_after_turns:]
        self.transcript.compact(self.config.compact_after_turns)

    def _format_output(self, summary_lines: list[str]) -> str:
        if self.config.structured_output:
            payload = {"summary": summary_lines, "session_id": self.session_id}
            return self._render_structured(payload)
        return "\n".join(summary_lines)

    def _render_structured(self, payload: dict[str, Any]) -> str:
        last_error: Exception | None = None
        for _ in range(self.config.structured_retry_limit):
            try:
                return json.dumps(payload, indent=2)
            except (TypeError, ValueError) as exc:
                last_error = exc
                payload = {"summary": ["structured output retry"], "session_id": self.session_id}
        raise RuntimeError("structured output rendering failed") from last_error
