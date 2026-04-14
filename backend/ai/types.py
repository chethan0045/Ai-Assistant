"""AI message types, content blocks, and tool definitions.

Mirrors the Rust API crate's type system for requests, responses,
streaming events, and tool/function calling structures.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class StopReason(Enum):
    """Reason an assistant turn ended."""

    END_TURN = "end_turn"
    MAX_TOKENS = "max_tokens"
    STOP_SEQUENCE = "stop_sequence"
    TOOL_USE = "tool_use"


class ToolChoice(Enum):
    """How the model should select tools."""

    AUTO = "auto"
    ANY = "any"
    NONE = "none"


# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Usage:
    """Token counts for a single API response."""

    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0

    def total_tokens(self) -> int:
        return (
            self.input_tokens
            + self.output_tokens
            + self.cache_creation_input_tokens
            + self.cache_read_input_tokens
        )


# ---------------------------------------------------------------------------
# Content blocks
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ContentBlock:
    """A single block of content in a message (text, tool_use, or tool_result)."""

    type: str  # "text", "tool_use", "tool_result", "thinking", "redacted_thinking"
    text: str | None = None
    id: str | None = None
    name: str | None = None
    input: dict[str, Any] | None = None
    tool_use_id: str | None = None
    content: str | None = None
    thinking: str | None = None
    signature: str | None = None

    @classmethod
    def text_block(cls, text: str) -> ContentBlock:
        return cls(type="text", text=text)

    @classmethod
    def tool_use_block(cls, id: str, name: str, input: dict[str, Any]) -> ContentBlock:
        return cls(type="tool_use", id=id, name=name, input=input)

    @classmethod
    def tool_result_block(cls, tool_use_id: str, content: str) -> ContentBlock:
        return cls(type="tool_result", tool_use_id=tool_use_id, content=content)

    @classmethod
    def thinking_block(cls, thinking: str, signature: str = "") -> ContentBlock:
        return cls(type="thinking", thinking=thinking, signature=signature)


# Aliases matching Rust naming
InputContentBlock = ContentBlock
OutputContentBlock = ContentBlock


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class InputMessage:
    """A single message in a request conversation."""

    role: str  # "user" or "assistant"
    content: list[ContentBlock] | str = ""

    @classmethod
    def user_text(cls, text: str) -> InputMessage:
        return cls(role="user", content=text)

    @classmethod
    def user_tool_result(cls, tool_use_id: str, content: str) -> InputMessage:
        return cls(
            role="user",
            content=[ContentBlock.tool_result_block(tool_use_id, content)],
        )


# ---------------------------------------------------------------------------
# Tool definitions
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ToolDefinition:
    """A tool/function the model can call."""

    name: str
    description: str = ""
    input_schema: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Request / Response
# ---------------------------------------------------------------------------


@dataclass
class MessageRequest:
    """Complete request payload for a message API call."""

    model: str
    max_tokens: int
    messages: list[InputMessage] = field(default_factory=list)
    system: str | list[ContentBlock] = ""
    tools: list[ToolDefinition] = field(default_factory=list)
    tool_choice: ToolChoice | dict[str, str] = ToolChoice.AUTO
    temperature: float | None = None
    top_p: float | None = None
    frequency_penalty: float | None = None
    presence_penalty: float | None = None
    stop: list[str] | None = None
    reasoning_effort: str | None = None
    stream: bool = False


@dataclass(frozen=True)
class MessageResponse:
    """Complete response from a message API call."""

    id: str
    type: str = "message"
    role: str = "assistant"
    content: list[ContentBlock] = field(default_factory=list)
    model: str = ""
    stop_reason: StopReason | str = StopReason.END_TURN
    usage: Usage = field(default_factory=Usage)
    request_id: str = ""

    def text(self) -> str:
        """Extract concatenated text from all text blocks."""
        parts = [block.text for block in self.content if block.type == "text" and block.text]
        return "".join(parts)

    def tool_uses(self) -> list[ContentBlock]:
        """Extract all tool_use blocks."""
        return [block for block in self.content if block.type == "tool_use"]


# ---------------------------------------------------------------------------
# Streaming events
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class StreamEvent:
    """A single server-sent event during streaming."""

    type: str  # message_start, content_block_start, content_block_delta, etc.
    index: int | None = None
    message: MessageResponse | None = None
    content_block: ContentBlock | None = None
    delta: dict[str, Any] | None = None
    usage: Usage | None = None
