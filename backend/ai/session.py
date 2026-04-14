"""Session persistence, compaction, and conversation management.

Manages conversation state, message history, automatic compaction
when context grows too large, and session serialization.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any
from uuid import uuid4

from .types import ContentBlock, Usage


class MessageRole(Enum):
    """Role of a conversation participant."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


@dataclass
class ConversationMessage:
    """A single message in a persisted conversation."""

    role: MessageRole
    blocks: list[ContentBlock] = field(default_factory=list)
    usage: Usage | None = None

    def text(self) -> str:
        parts = [b.text for b in self.blocks if b.type == "text" and b.text]
        return "".join(parts)


@dataclass
class SessionCompaction:
    """Metadata about a compaction event."""

    count: int = 0
    removed_message_count: int = 0
    summary: str = ""


@dataclass
class SessionFork:
    """Provenance for a forked session."""

    parent_session_id: str = ""
    fork_point_index: int = 0


@dataclass
class SessionPromptEntry:
    """A user prompt with timestamp."""

    prompt: str = ""
    timestamp_ms: int = 0


@dataclass
class Session:
    """Persisted conversation state."""

    session_id: str = field(default_factory=lambda: uuid4().hex)
    created_at_ms: int = field(default_factory=lambda: int(time.time() * 1000))
    updated_at_ms: int = field(default_factory=lambda: int(time.time() * 1000))
    messages: list[ConversationMessage] = field(default_factory=list)
    compaction: SessionCompaction = field(default_factory=SessionCompaction)
    fork: SessionFork | None = None
    workspace_root: str = ""
    prompt_history: list[SessionPromptEntry] = field(default_factory=list)
    model: str = ""

    def add_message(self, role: MessageRole, text: str, usage: Usage | None = None) -> None:
        self.messages.append(ConversationMessage(
            role=role,
            blocks=[ContentBlock.text_block(text)],
            usage=usage,
        ))
        self.updated_at_ms = int(time.time() * 1000)

    def add_user_prompt(self, prompt: str) -> None:
        self.prompt_history.append(SessionPromptEntry(
            prompt=prompt,
            timestamp_ms=int(time.time() * 1000),
        ))
        self.add_message(MessageRole.USER, prompt)

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "created_at_ms": self.created_at_ms,
            "updated_at_ms": self.updated_at_ms,
            "message_count": len(self.messages),
            "compaction_count": self.compaction.count,
            "model": self.model,
        }

    @classmethod
    def new(cls) -> Session:
        return cls()


# ---------------------------------------------------------------------------
# Compaction
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CompactionConfig:
    """Thresholds for automatic session compaction."""

    preserve_recent_messages: int = 4
    max_estimated_tokens: int = 10_000


@dataclass(frozen=True)
class CompactionResult:
    """Output of a compaction operation."""

    summary: str
    formatted_summary: str
    compacted_session: Session
    removed_message_count: int


def estimate_session_tokens(session: Session) -> int:
    """Rough token estimate based on character count / 4."""
    total_chars = sum(
        len(msg.text()) for msg in session.messages
    )
    return total_chars // 4


def should_compact(session: Session, config: CompactionConfig | None = None) -> bool:
    """Determine if a session needs compaction."""
    cfg = config or CompactionConfig()
    return estimate_session_tokens(session) > cfg.max_estimated_tokens


def compact_session(session: Session, config: CompactionConfig | None = None) -> CompactionResult:
    """Summarize old messages, keeping recent ones intact."""
    cfg = config or CompactionConfig()
    preserve = cfg.preserve_recent_messages
    if len(session.messages) <= preserve:
        return CompactionResult(
            summary="",
            formatted_summary="No compaction needed.",
            compacted_session=session,
            removed_message_count=0,
        )

    old_messages = session.messages[:-preserve]
    kept_messages = session.messages[-preserve:]

    summary_parts = []
    for msg in old_messages:
        text = msg.text()
        if text:
            summary_parts.append(f"[{msg.role.value}] {text[:160]}")

    summary = "\n".join(summary_parts)
    formatted = f"Compacted {len(old_messages)} messages into summary.\n{summary}"

    compacted = Session(
        session_id=session.session_id,
        created_at_ms=session.created_at_ms,
        updated_at_ms=int(time.time() * 1000),
        messages=[
            ConversationMessage(
                role=MessageRole.SYSTEM,
                blocks=[ContentBlock.text_block(f"[Conversation summary]\n{summary}")],
            ),
            *kept_messages,
        ],
        compaction=SessionCompaction(
            count=session.compaction.count + 1,
            removed_message_count=session.compaction.removed_message_count + len(old_messages),
            summary=summary,
        ),
        model=session.model,
    )

    return CompactionResult(
        summary=summary,
        formatted_summary=formatted,
        compacted_session=compacted,
        removed_message_count=len(old_messages),
    )


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

DEFAULT_SESSION_DIR = Path(".ai_sessions")


def save_session(session: Session, directory: Path | None = None) -> Path:
    """Persist a session to disk as JSON."""
    target_dir = directory or DEFAULT_SESSION_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / f"{session.session_id}.json"
    path.write_text(json.dumps(session.to_dict(), indent=2))
    return path


def load_session_metadata(session_id: str, directory: Path | None = None) -> dict[str, Any]:
    """Load session metadata from disk."""
    target_dir = directory or DEFAULT_SESSION_DIR
    data = json.loads((target_dir / f"{session_id}.json").read_text())
    return data
