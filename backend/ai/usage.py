"""Token usage tracking and cost estimation.

Provides token counters, per-model pricing lookups, cost calculation,
and session-level usage aggregation.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .models import ModelPricing, pricing_for_model


@dataclass(frozen=True)
class TokenUsage:
    """Token counts for a single turn or accumulated session."""

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

    def estimate_cost_usd(self, model: str | None = None) -> UsageCostEstimate:
        """Estimate cost using model-specific or default pricing."""
        pricing = None
        if model:
            pricing = pricing_for_model(model)
        if pricing is None:
            pricing = ModelPricing.default_sonnet_tier()
        return UsageCostEstimate(
            input_cost_usd=_cost_for_tokens(self.input_tokens, pricing.input_cost_per_million),
            output_cost_usd=_cost_for_tokens(self.output_tokens, pricing.output_cost_per_million),
            cache_creation_cost_usd=_cost_for_tokens(self.cache_creation_input_tokens, pricing.cache_creation_cost_per_million),
            cache_read_cost_usd=_cost_for_tokens(self.cache_read_input_tokens, pricing.cache_read_cost_per_million),
        )

    def summary_lines(self, label: str, model: str | None = None) -> list[str]:
        """Generate human-readable cost summary lines."""
        cost = self.estimate_cost_usd(model)
        model_suffix = f" model={model}" if model else ""
        pricing_note = ""
        if model and pricing_for_model(model) is None:
            pricing_note = " pricing=estimated-default"
        return [
            (
                f"{label}: total_tokens={self.total_tokens()} "
                f"input={self.input_tokens} output={self.output_tokens} "
                f"cache_write={self.cache_creation_input_tokens} cache_read={self.cache_read_input_tokens} "
                f"estimated_cost={format_usd(cost.total_cost_usd())}{model_suffix}{pricing_note}"
            ),
            (
                f"  cost breakdown: input={format_usd(cost.input_cost_usd)} "
                f"output={format_usd(cost.output_cost_usd)} "
                f"cache_write={format_usd(cost.cache_creation_cost_usd)} "
                f"cache_read={format_usd(cost.cache_read_cost_usd)}"
            ),
        ]

    def add_turn(self, prompt: str, output: str) -> TokenUsage:
        """Accumulate rough word-based token estimate (matches existing UsageSummary)."""
        return TokenUsage(
            input_tokens=self.input_tokens + len(prompt.split()),
            output_tokens=self.output_tokens + len(output.split()),
            cache_creation_input_tokens=self.cache_creation_input_tokens,
            cache_read_input_tokens=self.cache_read_input_tokens,
        )


@dataclass(frozen=True)
class UsageCostEstimate:
    """Estimated dollar cost derived from token usage."""

    input_cost_usd: float = 0.0
    output_cost_usd: float = 0.0
    cache_creation_cost_usd: float = 0.0
    cache_read_cost_usd: float = 0.0

    def total_cost_usd(self) -> float:
        return (
            self.input_cost_usd
            + self.output_cost_usd
            + self.cache_creation_cost_usd
            + self.cache_read_cost_usd
        )


@dataclass
class UsageTracker:
    """Aggregates token usage across conversation turns."""

    latest_turn: TokenUsage = field(default_factory=TokenUsage)
    cumulative: TokenUsage = field(default_factory=TokenUsage)
    turns: int = 0

    def record(self, usage: TokenUsage) -> None:
        self.latest_turn = usage
        self.cumulative = TokenUsage(
            input_tokens=self.cumulative.input_tokens + usage.input_tokens,
            output_tokens=self.cumulative.output_tokens + usage.output_tokens,
            cache_creation_input_tokens=self.cumulative.cache_creation_input_tokens + usage.cache_creation_input_tokens,
            cache_read_input_tokens=self.cumulative.cache_read_input_tokens + usage.cache_read_input_tokens,
        )
        self.turns += 1


@dataclass
class CostTracker:
    """Simple labeled cost accumulator (from existing Python source)."""

    total_units: int = 0
    events: list[str] = field(default_factory=list)

    def record(self, label: str, units: int) -> None:
        self.total_units += units
        self.events.append(f"{label}:{units}")


def _cost_for_tokens(tokens: int, usd_per_million: float) -> float:
    return tokens / 1_000_000.0 * usd_per_million


def format_usd(amount: float) -> str:
    """Format a dollar amount for CLI display."""
    return f"${amount:.4f}"
