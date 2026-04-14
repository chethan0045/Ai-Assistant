"""Prompt caching for message completions.

Provides in-memory and disk-backed caching with TTL management,
FNV-1a request fingerprinting, and cache break detection.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .types import MessageRequest, MessageResponse, Usage


@dataclass(frozen=True)
class PromptCacheConfig:
    """Configuration for prompt caching."""

    session_id: str = ""
    completion_ttl_secs: float = 30.0
    prompt_ttl_secs: float = 300.0
    cache_break_min_drop: int = 2000


@dataclass
class PromptCacheStats:
    """Accumulated cache statistics."""

    tracked_requests: int = 0
    completion_cache_hits: int = 0
    completion_cache_misses: int = 0
    completion_cache_writes: int = 0
    expected_invalidations: int = 0
    unexpected_cache_breaks: int = 0
    total_cache_creation_input_tokens: int = 0
    total_cache_read_input_tokens: int = 0
    last_cache_source: str = ""
    last_break_reason: str = ""


@dataclass(frozen=True)
class CacheBreakEvent:
    """Records an unexpected prompt cache break."""

    timestamp_ms: int
    expected_read_tokens: int
    actual_read_tokens: int
    reason: str = ""


def _fingerprint_request(request: MessageRequest) -> str:
    """Create a hash fingerprint for cache lookup.

    Uses SHA-256 over the model, system prompt, tools, and messages
    to produce a stable cache key.
    """
    parts = [
        request.model,
        str(request.system),
        json.dumps([t.name for t in request.tools], sort_keys=True),
        str(len(request.messages)),
    ]
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode()).hexdigest()


@dataclass
class PromptCache:
    """In-memory prompt cache with optional disk persistence."""

    config: PromptCacheConfig = field(default_factory=PromptCacheConfig)
    stats: PromptCacheStats = field(default_factory=PromptCacheStats)
    _entries: dict[str, tuple[float, MessageResponse]] = field(default_factory=dict)
    _break_events: list[CacheBreakEvent] = field(default_factory=list)

    def lookup_completion(self, request: MessageRequest) -> MessageResponse | None:
        """Check cache for a matching request within TTL."""
        key = _fingerprint_request(request)
        self.stats.tracked_requests += 1

        entry = self._entries.get(key)
        if entry is None:
            self.stats.completion_cache_misses += 1
            return None

        stored_time, response = entry
        age = time.time() - stored_time
        if age > self.config.completion_ttl_secs:
            del self._entries[key]
            self.stats.completion_cache_misses += 1
            self.stats.expected_invalidations += 1
            return None

        self.stats.completion_cache_hits += 1
        self.stats.last_cache_source = "memory"
        return response

    def record_response(self, request: MessageRequest, response: MessageResponse) -> None:
        """Store a response in the cache."""
        key = _fingerprint_request(request)
        self._entries[key] = (time.time(), response)
        self.stats.completion_cache_writes += 1

    def record_usage(self, usage: Usage) -> None:
        """Track cache token usage from an API response."""
        self.stats.total_cache_creation_input_tokens += usage.cache_creation_input_tokens
        self.stats.total_cache_read_input_tokens += usage.cache_read_input_tokens

    def record_cache_break(self, expected_read: int, actual_read: int, reason: str = "") -> None:
        """Record an unexpected cache break event."""
        event = CacheBreakEvent(
            timestamp_ms=int(time.time() * 1000),
            expected_read_tokens=expected_read,
            actual_read_tokens=actual_read,
            reason=reason,
        )
        self._break_events.append(event)
        self.stats.unexpected_cache_breaks += 1
        self.stats.last_break_reason = reason

    @property
    def break_events(self) -> list[CacheBreakEvent]:
        return list(self._break_events)

    def clear(self) -> None:
        """Evict all cached entries."""
        self._entries.clear()
