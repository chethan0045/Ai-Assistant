"""Analytics, telemetry, and request profiling for AI providers.

Extracts client identity, Anthropic request headers, analytics events,
and session tracing from the Rust telemetry crate.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_ANTHROPIC_VERSION = "2023-06-01"
DEFAULT_APP_NAME = "claude-code"
DEFAULT_RUNTIME = "rust"
DEFAULT_AGENTIC_BETA = "claude-code-20250219"
DEFAULT_PROMPT_CACHING_SCOPE_BETA = "prompt-caching-scope-2026-01-05"


# ---------------------------------------------------------------------------
# Client identity
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ClientIdentity:
    """Metadata identifying the client making API requests."""

    app_name: str = DEFAULT_APP_NAME
    app_version: str = ""
    runtime: str = DEFAULT_RUNTIME

    def user_agent(self) -> str:
        version = f"/{self.app_version}" if self.app_version else ""
        return f"{self.app_name}{version} ({self.runtime})"

    def with_runtime(self, runtime: str) -> ClientIdentity:
        return ClientIdentity(
            app_name=self.app_name,
            app_version=self.app_version,
            runtime=runtime,
        )


# ---------------------------------------------------------------------------
# Anthropic request profile
# ---------------------------------------------------------------------------


@dataclass
class AnthropicRequestProfile:
    """Anthropic-specific request metadata and header generation."""

    anthropic_version: str = DEFAULT_ANTHROPIC_VERSION
    client_identity: ClientIdentity = field(default_factory=ClientIdentity)
    betas: list[str] = field(default_factory=lambda: [
        DEFAULT_AGENTIC_BETA,
        DEFAULT_PROMPT_CACHING_SCOPE_BETA,
    ])
    extra_body: dict[str, Any] = field(default_factory=dict)

    def with_beta(self, beta: str) -> AnthropicRequestProfile:
        if beta not in self.betas:
            self.betas.append(beta)
        return self

    def with_extra_body(self, key: str, value: Any) -> AnthropicRequestProfile:
        self.extra_body[key] = value
        return self

    def header_pairs(self) -> list[tuple[str, str]]:
        """Generate HTTP header key-value pairs for an Anthropic request."""
        headers = [
            ("anthropic-version", self.anthropic_version),
            ("user-agent", self.client_identity.user_agent()),
        ]
        if self.betas:
            headers.append(("anthropic-beta", ",".join(self.betas)))
        return headers

    def render_json_body(self, base_body: dict[str, Any]) -> dict[str, Any]:
        """Merge extra_body fields into a request body."""
        merged = dict(base_body)
        merged.update(self.extra_body)
        return merged


# ---------------------------------------------------------------------------
# Analytics events
# ---------------------------------------------------------------------------


@dataclass
class AnalyticsEvent:
    """A telemetry event for tracking."""

    namespace: str
    action: str
    properties: dict[str, Any] = field(default_factory=dict)

    def with_property(self, key: str, value: Any) -> AnalyticsEvent:
        self.properties[key] = value
        return self


class TelemetryEvent(Enum):
    """Categories of telemetry events."""

    HTTP_REQUEST_STARTED = auto()
    HTTP_REQUEST_SUCCEEDED = auto()
    HTTP_REQUEST_FAILED = auto()
    SESSION_TRACED = auto()


# ---------------------------------------------------------------------------
# Session tracing
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SessionTraceRecord:
    """Individual trace entry within a session."""

    session_id: str
    sequence: int
    name: str
    timestamp_ms: int
    attributes: dict[str, Any] = field(default_factory=dict)
