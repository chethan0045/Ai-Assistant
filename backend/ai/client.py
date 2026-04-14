"""Provider client abstractions and authentication.

Defines client configurations for Anthropic, OpenAI-compatible, and
xAI providers with retry logic, auth management, and request dispatch.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Generator

from .models import (
    DEFAULT_ANTHROPIC_BASE_URL,
    DEFAULT_DASHSCOPE_BASE_URL,
    DEFAULT_OPENAI_BASE_URL,
    DEFAULT_XAI_BASE_URL,
    ProviderKind,
)
from .types import MessageRequest, MessageResponse, StreamEvent, Usage


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


class AuthSource(Enum):
    """How a provider client authenticates."""

    API_KEY = auto()
    BEARER_TOKEN = auto()
    API_KEY_AND_BEARER = auto()
    NONE = auto()


@dataclass(frozen=True)
class OAuthTokenSet:
    """OAuth token pair for bearer-based authentication."""

    access_token: str
    refresh_token: str = ""
    expires_at_ms: int = 0


# ---------------------------------------------------------------------------
# Retry policy
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class RetryPolicy:
    """Retry configuration with exponential backoff."""

    max_retries: int = 8
    initial_backoff_secs: float = 1.0
    max_backoff_secs: float = 128.0
    jitter: bool = True

    def backoff_seconds(self, attempt: int) -> float:
        """Calculate backoff for a given attempt (0-indexed)."""
        delay = min(self.initial_backoff_secs * (2 ** attempt), self.max_backoff_secs)
        return delay


DEFAULT_RETRY_POLICY = RetryPolicy()


# ---------------------------------------------------------------------------
# Provider client configurations
# ---------------------------------------------------------------------------


@dataclass
class AnthropicClientConfig:
    """Configuration for the Anthropic API client."""

    api_key: str = ""
    bearer_token: str = ""
    base_url: str = DEFAULT_ANTHROPIC_BASE_URL
    retry_policy: RetryPolicy = field(default_factory=lambda: DEFAULT_RETRY_POLICY)
    betas: list[str] = field(default_factory=list)
    extra_body: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_env(cls) -> AnthropicClientConfig:
        """Build config from environment variables."""
        return cls(
            api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
            bearer_token=os.environ.get("ANTHROPIC_AUTH_TOKEN", ""),
            base_url=os.environ.get("ANTHROPIC_BASE_URL", DEFAULT_ANTHROPIC_BASE_URL),
        )

    @property
    def auth_source(self) -> AuthSource:
        if self.api_key and self.bearer_token:
            return AuthSource.API_KEY_AND_BEARER
        if self.api_key:
            return AuthSource.API_KEY
        if self.bearer_token:
            return AuthSource.BEARER_TOKEN
        return AuthSource.NONE


@dataclass
class OpenAiCompatConfig:
    """Configuration for OpenAI-compatible API clients."""

    provider_name: str = "openai"
    api_key_env: str = "OPENAI_API_KEY"
    base_url: str = DEFAULT_OPENAI_BASE_URL
    retry_policy: RetryPolicy = field(default_factory=lambda: DEFAULT_RETRY_POLICY)

    @classmethod
    def xai(cls) -> OpenAiCompatConfig:
        return cls(
            provider_name="xai",
            api_key_env="XAI_API_KEY",
            base_url=os.environ.get("XAI_BASE_URL", DEFAULT_XAI_BASE_URL),
        )

    @classmethod
    def openai(cls) -> OpenAiCompatConfig:
        return cls(
            provider_name="openai",
            api_key_env="OPENAI_API_KEY",
            base_url=os.environ.get("OPENAI_BASE_URL", DEFAULT_OPENAI_BASE_URL),
        )

    @classmethod
    def dashscope(cls) -> OpenAiCompatConfig:
        return cls(
            provider_name="dashscope",
            api_key_env="DASHSCOPE_API_KEY",
            base_url=os.environ.get("DASHSCOPE_BASE_URL", DEFAULT_DASHSCOPE_BASE_URL),
        )

    @property
    def api_key(self) -> str:
        return os.environ.get(self.api_key_env, "")


# ---------------------------------------------------------------------------
# Unified provider client
# ---------------------------------------------------------------------------


@dataclass
class ProviderClient:
    """Unified provider client that dispatches to the correct backend.

    This is a structural placeholder — actual HTTP calls would be
    implemented against the real APIs. The interface mirrors the Rust
    Provider trait for send_message / stream_message.
    """

    provider: ProviderKind
    anthropic_config: AnthropicClientConfig | None = None
    openai_compat_config: OpenAiCompatConfig | None = None

    @classmethod
    def for_anthropic(cls, config: AnthropicClientConfig | None = None) -> ProviderClient:
        return cls(
            provider=ProviderKind.ANTHROPIC,
            anthropic_config=config or AnthropicClientConfig.from_env(),
        )

    @classmethod
    def for_openai(cls, config: OpenAiCompatConfig | None = None) -> ProviderClient:
        return cls(
            provider=ProviderKind.OPENAI,
            openai_compat_config=config or OpenAiCompatConfig.openai(),
        )

    @classmethod
    def for_xai(cls, config: OpenAiCompatConfig | None = None) -> ProviderClient:
        return cls(
            provider=ProviderKind.XAI,
            openai_compat_config=config or OpenAiCompatConfig.xai(),
        )

    def send_message(self, request: MessageRequest) -> MessageResponse:
        """Send a non-streaming message request.

        Placeholder — real implementation would perform HTTP POST.
        """
        raise NotImplementedError(
            f"send_message not yet wired for {self.provider.name}. "
            "Implement HTTP dispatch against the provider's messages endpoint."
        )

    def stream_message(self, request: MessageRequest) -> Generator[StreamEvent, None, None]:
        """Send a streaming message request yielding SSE events.

        Placeholder — real implementation would parse SSE stream.
        """
        raise NotImplementedError(
            f"stream_message not yet wired for {self.provider.name}. "
            "Implement SSE parsing against the provider's streaming endpoint."
        )
