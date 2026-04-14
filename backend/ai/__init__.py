"""Consolidated AI module.

Extracts all AI-related data structures, provider configurations,
message types, session management, cost tracking, prompt caching,
telemetry, and inference engine into a single reusable package.
"""

from .models import (
    ModelAlias,
    ModelPricing,
    ModelTokenLimit,
    ProviderKind,
    ProviderMetadata,
    resolve_model_alias,
    metadata_for_model,
    detect_provider_kind,
    model_token_limit,
    max_tokens_for_model,
    pricing_for_model,
    MODEL_REGISTRY,
    MODEL_ALIASES,
    PRICING_TABLE,
)
from .types import (
    ContentBlock,
    InputMessage,
    MessageRequest,
    MessageResponse,
    OutputContentBlock,
    StreamEvent,
    ToolDefinition,
    ToolChoice,
    Usage,
    StopReason,
)
from .client import (
    AuthSource,
    RetryPolicy,
    ProviderClient,
    AnthropicClientConfig,
    OpenAiCompatConfig,
)
from .prompt import (
    ContextFile,
    ProjectContext,
    SystemPromptBuilder,
    INSTRUCTION_FILENAMES,
    FRONTIER_MODEL_NAME,
)
from .session import (
    MessageRole,
    ConversationMessage,
    Session,
    SessionCompaction,
    CompactionConfig,
    CompactionResult,
    should_compact,
    compact_session,
    estimate_session_tokens,
)
from .cache import (
    PromptCacheConfig,
    PromptCacheStats,
    CacheBreakEvent,
    PromptCache,
)
from .usage import (
    TokenUsage,
    UsageCostEstimate,
    UsageTracker,
    CostTracker,
    format_usd,
)
from .engine import (
    QueryEngineConfig,
    TurnResult,
    QueryEngine,
    QueryRequest,
    QueryResponse,
)
from .telemetry import (
    ClientIdentity,
    AnthropicRequestProfile,
    AnalyticsEvent,
    TelemetryEvent,
    SessionTraceRecord,
    DEFAULT_ANTHROPIC_VERSION,
    DEFAULT_APP_NAME,
    DEFAULT_AGENTIC_BETA,
    DEFAULT_PROMPT_CACHING_SCOPE_BETA,
)

__all__ = [
    # models
    "ModelAlias",
    "ModelPricing",
    "ModelTokenLimit",
    "ProviderKind",
    "ProviderMetadata",
    "resolve_model_alias",
    "metadata_for_model",
    "detect_provider_kind",
    "model_token_limit",
    "max_tokens_for_model",
    "pricing_for_model",
    "MODEL_REGISTRY",
    "MODEL_ALIASES",
    "PRICING_TABLE",
    # types
    "ContentBlock",
    "InputMessage",
    "MessageRequest",
    "MessageResponse",
    "OutputContentBlock",
    "StreamEvent",
    "ToolDefinition",
    "ToolChoice",
    "Usage",
    "StopReason",
    # client
    "AuthSource",
    "RetryPolicy",
    "ProviderClient",
    "AnthropicClientConfig",
    "OpenAiCompatConfig",
    # prompt
    "ContextFile",
    "ProjectContext",
    "SystemPromptBuilder",
    "INSTRUCTION_FILENAMES",
    "FRONTIER_MODEL_NAME",
    # session
    "MessageRole",
    "ConversationMessage",
    "Session",
    "SessionCompaction",
    "CompactionConfig",
    "CompactionResult",
    "should_compact",
    "compact_session",
    "estimate_session_tokens",
    # cache
    "PromptCacheConfig",
    "PromptCacheStats",
    "CacheBreakEvent",
    "PromptCache",
    # usage
    "TokenUsage",
    "UsageCostEstimate",
    "UsageTracker",
    "CostTracker",
    "format_usd",
    # engine
    "QueryEngineConfig",
    "TurnResult",
    "QueryEngine",
    "QueryRequest",
    "QueryResponse",
    # telemetry
    "ClientIdentity",
    "AnthropicRequestProfile",
    "AnalyticsEvent",
    "TelemetryEvent",
    "SessionTraceRecord",
    "DEFAULT_ANTHROPIC_VERSION",
    "DEFAULT_APP_NAME",
    "DEFAULT_AGENTIC_BETA",
    "DEFAULT_PROMPT_CACHING_SCOPE_BETA",
]
