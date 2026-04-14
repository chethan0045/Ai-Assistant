"""Model registry, provider configuration, and token limits.

Consolidates model aliases, provider routing, token context windows,
and pricing data extracted from the Rust API crate and Python sources.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto


class ProviderKind(Enum):
    """Supported LLM provider backends."""

    ANTHROPIC = auto()
    XAI = auto()
    OPENAI = auto()


@dataclass(frozen=True)
class ProviderMetadata:
    """Connection metadata for a provider."""

    provider: ProviderKind
    auth_env: str
    base_url_env: str
    default_base_url: str


@dataclass(frozen=True)
class ModelAlias:
    """Maps a short alias to a canonical model identifier."""

    alias: str
    canonical: str
    provider: ProviderKind


@dataclass(frozen=True)
class ModelTokenLimit:
    """Context window and max output tokens for a model."""

    max_output_tokens: int
    context_window_tokens: int


@dataclass(frozen=True)
class ModelPricing:
    """Per-million-token pricing used for cost estimation."""

    input_cost_per_million: float
    output_cost_per_million: float
    cache_creation_cost_per_million: float
    cache_read_cost_per_million: float

    @classmethod
    def default_sonnet_tier(cls) -> ModelPricing:
        return cls(
            input_cost_per_million=15.0,
            output_cost_per_million=75.0,
            cache_creation_cost_per_million=18.75,
            cache_read_cost_per_million=1.5,
        )


# ---------------------------------------------------------------------------
# Default base URLs
# ---------------------------------------------------------------------------

DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com"
DEFAULT_XAI_BASE_URL = "https://api.x.ai/v1"
DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"
DEFAULT_DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

# ---------------------------------------------------------------------------
# Model alias table
# ---------------------------------------------------------------------------

MODEL_ALIASES: tuple[ModelAlias, ...] = (
    ModelAlias("opus", "claude-opus-4-6", ProviderKind.ANTHROPIC),
    ModelAlias("sonnet", "claude-sonnet-4-6", ProviderKind.ANTHROPIC),
    ModelAlias("haiku", "claude-haiku-4-5-20251213", ProviderKind.ANTHROPIC),
    ModelAlias("grok", "grok-3", ProviderKind.XAI),
    ModelAlias("grok-3", "grok-3", ProviderKind.XAI),
    ModelAlias("grok-mini", "grok-3-mini", ProviderKind.XAI),
    ModelAlias("grok-3-mini", "grok-3-mini", ProviderKind.XAI),
    ModelAlias("grok-2", "grok-2", ProviderKind.XAI),
)

# ---------------------------------------------------------------------------
# Provider registry (alias -> metadata)
# ---------------------------------------------------------------------------

MODEL_REGISTRY: dict[str, ProviderMetadata] = {
    "opus": ProviderMetadata(ProviderKind.ANTHROPIC, "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", DEFAULT_ANTHROPIC_BASE_URL),
    "sonnet": ProviderMetadata(ProviderKind.ANTHROPIC, "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", DEFAULT_ANTHROPIC_BASE_URL),
    "haiku": ProviderMetadata(ProviderKind.ANTHROPIC, "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", DEFAULT_ANTHROPIC_BASE_URL),
    "grok": ProviderMetadata(ProviderKind.XAI, "XAI_API_KEY", "XAI_BASE_URL", DEFAULT_XAI_BASE_URL),
    "grok-3": ProviderMetadata(ProviderKind.XAI, "XAI_API_KEY", "XAI_BASE_URL", DEFAULT_XAI_BASE_URL),
    "grok-mini": ProviderMetadata(ProviderKind.XAI, "XAI_API_KEY", "XAI_BASE_URL", DEFAULT_XAI_BASE_URL),
    "grok-3-mini": ProviderMetadata(ProviderKind.XAI, "XAI_API_KEY", "XAI_BASE_URL", DEFAULT_XAI_BASE_URL),
    "grok-2": ProviderMetadata(ProviderKind.XAI, "XAI_API_KEY", "XAI_BASE_URL", DEFAULT_XAI_BASE_URL),
}

# ---------------------------------------------------------------------------
# Token limits per canonical model
# ---------------------------------------------------------------------------

_TOKEN_LIMITS: dict[str, ModelTokenLimit] = {
    "claude-opus-4-6": ModelTokenLimit(max_output_tokens=32_000, context_window_tokens=200_000),
    "claude-sonnet-4-6": ModelTokenLimit(max_output_tokens=64_000, context_window_tokens=200_000),
    "claude-haiku-4-5-20251213": ModelTokenLimit(max_output_tokens=64_000, context_window_tokens=200_000),
    "grok-3": ModelTokenLimit(max_output_tokens=64_000, context_window_tokens=131_072),
    "grok-3-mini": ModelTokenLimit(max_output_tokens=64_000, context_window_tokens=131_072),
    "grok-2": ModelTokenLimit(max_output_tokens=64_000, context_window_tokens=131_072),
}

# ---------------------------------------------------------------------------
# Pricing table per model family
# ---------------------------------------------------------------------------

PRICING_TABLE: dict[str, ModelPricing] = {
    "haiku": ModelPricing(
        input_cost_per_million=1.0,
        output_cost_per_million=5.0,
        cache_creation_cost_per_million=1.25,
        cache_read_cost_per_million=0.1,
    ),
    "opus": ModelPricing(
        input_cost_per_million=15.0,
        output_cost_per_million=75.0,
        cache_creation_cost_per_million=18.75,
        cache_read_cost_per_million=1.5,
    ),
    "sonnet": ModelPricing.default_sonnet_tier(),
}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def resolve_model_alias(model: str) -> str:
    """Resolve a short alias (e.g. 'opus') to a canonical model ID."""
    lower = model.strip().lower()
    for alias in MODEL_ALIASES:
        if alias.alias == lower:
            return alias.canonical
    return model.strip()


def metadata_for_model(model: str) -> ProviderMetadata | None:
    """Return provider metadata for a model name or alias."""
    canonical = resolve_model_alias(model)
    if canonical.startswith("claude"):
        return ProviderMetadata(ProviderKind.ANTHROPIC, "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", DEFAULT_ANTHROPIC_BASE_URL)
    if canonical.startswith("grok"):
        return ProviderMetadata(ProviderKind.XAI, "XAI_API_KEY", "XAI_BASE_URL", DEFAULT_XAI_BASE_URL)
    if canonical.startswith("openai/") or canonical.startswith("gpt-"):
        return ProviderMetadata(ProviderKind.OPENAI, "OPENAI_API_KEY", "OPENAI_BASE_URL", DEFAULT_OPENAI_BASE_URL)
    if canonical.startswith("qwen/") or canonical.startswith("qwen-"):
        return ProviderMetadata(ProviderKind.OPENAI, "DASHSCOPE_API_KEY", "DASHSCOPE_BASE_URL", DEFAULT_DASHSCOPE_BASE_URL)
    return None


def detect_provider_kind(model: str) -> ProviderKind:
    """Determine the provider for a model, falling back to env-var sniffing."""
    import os

    meta = metadata_for_model(model)
    if meta is not None:
        return meta.provider
    if os.environ.get("OPENAI_BASE_URL") and os.environ.get("OPENAI_API_KEY"):
        return ProviderKind.OPENAI
    if os.environ.get("ANTHROPIC_API_KEY"):
        return ProviderKind.ANTHROPIC
    if os.environ.get("OPENAI_API_KEY"):
        return ProviderKind.OPENAI
    if os.environ.get("XAI_API_KEY"):
        return ProviderKind.XAI
    if os.environ.get("OPENAI_BASE_URL"):
        return ProviderKind.OPENAI
    return ProviderKind.ANTHROPIC


def model_token_limit(model: str) -> ModelTokenLimit | None:
    """Return token limits for a known model."""
    canonical = resolve_model_alias(model)
    return _TOKEN_LIMITS.get(canonical)


def max_tokens_for_model(model: str) -> int:
    """Return the max output tokens for a model, with sensible defaults."""
    limit = model_token_limit(model)
    if limit is not None:
        return limit.max_output_tokens
    canonical = resolve_model_alias(model)
    return 32_000 if "opus" in canonical else 64_000


def pricing_for_model(model: str) -> ModelPricing | None:
    """Return pricing for a known model family."""
    normalized = model.lower()
    if "haiku" in normalized:
        return PRICING_TABLE["haiku"]
    if "opus" in normalized:
        return PRICING_TABLE["opus"]
    if "sonnet" in normalized:
        return PRICING_TABLE["sonnet"]
    return None
