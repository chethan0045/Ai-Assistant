"""Python AI Module Server.

Exposes the extracted AI module as REST endpoints that the Node.js
backend (terminal-server.js) proxies to. Runs on port 5100.

Endpoints:
  GET  /api/ai-module/status         — Module status and available providers
  GET  /api/ai-module/models         — List all models, aliases, and pricing
  GET  /api/ai-module/models/:alias  — Resolve a model alias to canonical ID
  POST /api/ai-module/session        — Create a new AI session
  GET  /api/ai-module/session/:id    — Get session metadata
  POST /api/ai-module/session/:id/message — Submit a message to a session
  POST /api/ai-module/session/:id/stream  — Stream-submit a message (SSE)
  POST /api/ai-module/prompt/build   — Build a system prompt
  POST /api/ai-module/usage/estimate — Estimate token cost
  GET  /api/ai-module/cache/stats    — Get prompt cache statistics
  POST /api/ai-module/analyze        — Analyze code with AI context
"""

from __future__ import annotations

import json
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Ensure the ai package is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai.models import (
    MODEL_ALIASES,
    PRICING_TABLE,
    ProviderKind,
    resolve_model_alias,
    metadata_for_model,
    model_token_limit,
    max_tokens_for_model,
    pricing_for_model,
    detect_provider_kind,
)
from ai.types import ContentBlock, MessageRequest, MessageResponse, ToolDefinition, Usage
from ai.client import AnthropicClientConfig, OpenAiCompatConfig, ProviderClient
from ai.prompt import SystemPromptBuilder, ProjectContext, ContextFile, discover_instruction_files
from ai.session import (
    Session,
    MessageRole,
    CompactionConfig,
    compact_session,
    should_compact,
    estimate_session_tokens,
)
from ai.cache import PromptCache, PromptCacheConfig
from ai.usage import TokenUsage, UsageTracker, CostTracker, format_usd
from ai.engine import QueryEngine, QueryEngineConfig, PermissionDenial
from ai.telemetry import ClientIdentity, AnthropicRequestProfile

# ---------------------------------------------------------------------------
# In-memory state
# ---------------------------------------------------------------------------

_sessions: dict[str, Session] = {}
_engines: dict[str, QueryEngine] = {}
_cache = PromptCache(config=PromptCacheConfig(session_id="global"))
_usage_tracker = UsageTracker()
_cost_tracker = CostTracker()


def _json_response(handler: AIModuleHandler, data: dict, status: int = 200) -> None:
    body = json.dumps(data, default=str).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _read_body(handler: AIModuleHandler) -> dict:
    length = int(handler.headers.get("Content-Length", 0))
    if length == 0:
        return {}
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))


class AIModuleHandler(BaseHTTPRequestHandler):
    """HTTP request handler for the AI module REST API."""

    def log_message(self, format, *args):
        print(f"[ai-server] {args[0]}")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/api/ai-module/status":
            return self._handle_status()
        if path == "/api/ai-module/models":
            return self._handle_models_list()
        if path.startswith("/api/ai-module/models/"):
            alias = path.split("/")[-1]
            return self._handle_model_resolve(alias)
        if path.startswith("/api/ai-module/session/"):
            session_id = path.split("/")[-1]
            return self._handle_session_get(session_id)
        if path == "/api/ai-module/cache/stats":
            return self._handle_cache_stats()

        _json_response(self, {"error": "Not found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/api/ai-module/session":
            return self._handle_session_create()
        if path.endswith("/message"):
            session_id = path.split("/")[-2]
            return self._handle_session_message(session_id)
        if path.endswith("/stream"):
            session_id = path.split("/")[-2]
            return self._handle_session_stream(session_id)
        if path == "/api/ai-module/prompt/build":
            return self._handle_prompt_build()
        if path == "/api/ai-module/usage/estimate":
            return self._handle_usage_estimate()
        if path == "/api/ai-module/analyze":
            return self._handle_analyze()

        _json_response(self, {"error": "Not found"}, 404)

    # ---- Status ----

    def _handle_status(self):
        has_anthropic = bool(os.environ.get("ANTHROPIC_API_KEY"))
        has_openai = bool(os.environ.get("OPENAI_API_KEY"))
        has_xai = bool(os.environ.get("XAI_API_KEY"))
        has_dashscope = bool(os.environ.get("DASHSCOPE_API_KEY"))

        _json_response(self, {
            "module": "ai",
            "version": "1.0.0",
            "status": "ready",
            "providers": {
                "anthropic": {"configured": has_anthropic, "models": ["opus", "sonnet", "haiku"]},
                "openai": {"configured": has_openai, "models": ["gpt-4", "gpt-3.5"]},
                "xai": {"configured": has_xai, "models": ["grok-3", "grok-3-mini"]},
                "dashscope": {"configured": has_dashscope, "models": ["qwen-max", "qwen-plus"]},
            },
            "sessions_active": len(_sessions),
            "cache_stats": {
                "hits": _cache.stats.completion_cache_hits,
                "misses": _cache.stats.completion_cache_misses,
            },
            "usage": {
                "total_turns": _usage_tracker.turns,
                "total_cost_events": len(_cost_tracker.events),
            },
        })

    # ---- Models ----

    def _handle_models_list(self):
        models = []
        for alias in MODEL_ALIASES:
            limit = model_token_limit(alias.alias)
            pricing = pricing_for_model(alias.canonical)
            models.append({
                "alias": alias.alias,
                "canonical": alias.canonical,
                "provider": alias.provider.name.lower(),
                "max_output_tokens": limit.max_output_tokens if limit else None,
                "context_window": limit.context_window_tokens if limit else None,
                "pricing": {
                    "input_per_million": pricing.input_cost_per_million,
                    "output_per_million": pricing.output_cost_per_million,
                    "cache_write_per_million": pricing.cache_creation_cost_per_million,
                    "cache_read_per_million": pricing.cache_read_cost_per_million,
                } if pricing else None,
            })
        _json_response(self, {"models": models})

    def _handle_model_resolve(self, alias: str):
        canonical = resolve_model_alias(alias)
        meta = metadata_for_model(canonical)
        limit = model_token_limit(alias)
        pricing = pricing_for_model(canonical)
        _json_response(self, {
            "alias": alias,
            "canonical": canonical,
            "provider": meta.provider.name.lower() if meta else "unknown",
            "auth_env": meta.auth_env if meta else None,
            "base_url_env": meta.base_url_env if meta else None,
            "default_base_url": meta.default_base_url if meta else None,
            "max_output_tokens": limit.max_output_tokens if limit else max_tokens_for_model(alias),
            "context_window": limit.context_window_tokens if limit else None,
            "pricing": {
                "input_per_million": pricing.input_cost_per_million,
                "output_per_million": pricing.output_cost_per_million,
            } if pricing else None,
        })

    # ---- Sessions ----

    def _handle_session_create(self):
        body = _read_body(self)
        model = body.get("model", "sonnet")
        session = Session.new()
        session.model = resolve_model_alias(model)

        engine = QueryEngine(
            session_id=session.session_id,
            config=QueryEngineConfig(
                max_turns=body.get("max_turns", 8),
                max_budget_tokens=body.get("max_budget_tokens", 2000),
            ),
        )

        _sessions[session.session_id] = session
        _engines[session.session_id] = engine

        _json_response(self, {
            "session_id": session.session_id,
            "model": session.model,
            "created_at_ms": session.created_at_ms,
        }, 201)

    def _handle_session_get(self, session_id: str):
        session = _sessions.get(session_id)
        if not session:
            return _json_response(self, {"error": f"Session {session_id} not found"}, 404)

        engine = _engines.get(session_id)
        _json_response(self, {
            **session.to_dict(),
            "estimated_tokens": estimate_session_tokens(session),
            "needs_compaction": should_compact(session),
            "engine_turns": len(engine.messages) if engine else 0,
        })

    def _handle_session_message(self, session_id: str):
        session = _sessions.get(session_id)
        engine = _engines.get(session_id)
        if not session or not engine:
            return _json_response(self, {"error": f"Session {session_id} not found"}, 404)

        body = _read_body(self)
        prompt = body.get("prompt", "")
        if not prompt:
            return _json_response(self, {"error": "prompt required"}, 400)

        matched_commands = tuple(body.get("matched_commands", []))
        matched_tools = tuple(body.get("matched_tools", []))

        result = engine.submit(prompt, matched_commands, matched_tools)
        session.add_user_prompt(prompt)
        session.add_message(MessageRole.ASSISTANT, result.output)

        _cost_tracker.record("turn", result.usage.input_tokens + result.usage.output_tokens)

        _json_response(self, {
            "output": result.output,
            "stop_reason": result.stop_reason,
            "usage": {
                "input_tokens": result.usage.input_tokens,
                "output_tokens": result.usage.output_tokens,
            },
            "matched_commands": list(result.matched_commands),
            "matched_tools": list(result.matched_tools),
            "session_tokens": estimate_session_tokens(session),
        })

    def _handle_session_stream(self, session_id: str):
        engine = _engines.get(session_id)
        session = _sessions.get(session_id)
        if not engine or not session:
            return _json_response(self, {"error": f"Session {session_id} not found"}, 404)

        body = _read_body(self)
        prompt = body.get("prompt", "")
        if not prompt:
            return _json_response(self, {"error": "prompt required"}, 400)

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        matched_commands = tuple(body.get("matched_commands", []))
        matched_tools = tuple(body.get("matched_tools", []))

        for event in engine.stream_submit(prompt, matched_commands, matched_tools):
            data = json.dumps(event, default=str)
            self.wfile.write(f"data: {data}\n\n".encode())
            self.wfile.flush()

        session.add_user_prompt(prompt)
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()

    # ---- Prompt ----

    def _handle_prompt_build(self):
        body = _read_body(self)
        builder = SystemPromptBuilder()

        if body.get("os"):
            builder.with_os(body["os"])
        if body.get("output_style"):
            builder.with_output_style(body["output_style"])

        if body.get("project_context"):
            ctx_data = body["project_context"]
            ctx = ProjectContext(
                cwd=ctx_data.get("cwd", ""),
                current_date=ctx_data.get("current_date", ""),
                git_status=ctx_data.get("git_status", ""),
                git_diff=ctx_data.get("git_diff", ""),
            )
            builder.with_project_context(ctx)

        for section in body.get("sections", []):
            builder.append_section(section.get("title", ""), section.get("content", ""))

        prompt = builder.build()
        _json_response(self, {"prompt": prompt, "length": len(prompt)})

    # ---- Usage ----

    def _handle_usage_estimate(self):
        body = _read_body(self)
        usage = TokenUsage(
            input_tokens=body.get("input_tokens", 0),
            output_tokens=body.get("output_tokens", 0),
            cache_creation_input_tokens=body.get("cache_creation_input_tokens", 0),
            cache_read_input_tokens=body.get("cache_read_input_tokens", 0),
        )
        model = body.get("model")
        cost = usage.estimate_cost_usd(model)
        lines = usage.summary_lines("estimate", model)

        _json_response(self, {
            "total_tokens": usage.total_tokens(),
            "total_cost_usd": cost.total_cost_usd(),
            "formatted_cost": format_usd(cost.total_cost_usd()),
            "breakdown": {
                "input": format_usd(cost.input_cost_usd),
                "output": format_usd(cost.output_cost_usd),
                "cache_write": format_usd(cost.cache_creation_cost_usd),
                "cache_read": format_usd(cost.cache_read_cost_usd),
            },
            "summary": lines,
        })

    # ---- Cache ----

    def _handle_cache_stats(self):
        _json_response(self, {
            "tracked_requests": _cache.stats.tracked_requests,
            "hits": _cache.stats.completion_cache_hits,
            "misses": _cache.stats.completion_cache_misses,
            "writes": _cache.stats.completion_cache_writes,
            "unexpected_breaks": _cache.stats.unexpected_cache_breaks,
            "total_cache_creation_tokens": _cache.stats.total_cache_creation_input_tokens,
            "total_cache_read_tokens": _cache.stats.total_cache_read_input_tokens,
        })

    # ---- Analyze ----

    def _handle_analyze(self):
        body = _read_body(self)
        code = body.get("code", "")
        file_path = body.get("filePath", "")
        command = body.get("command", "analyze")

        # Build context-aware analysis
        analysis = {
            "file": file_path,
            "command": command,
            "code_length": len(code),
            "line_count": code.count("\n") + 1 if code else 0,
        }

        # Detect patterns
        patterns = {
            "functions": [],
            "classes": [],
            "imports": [],
            "routes": [],
            "issues": [],
        }

        for i, line in enumerate(code.split("\n"), 1):
            stripped = line.strip()
            if stripped.startswith("def ") or stripped.startswith("async def "):
                name = stripped.split("(")[0].replace("def ", "").replace("async ", "")
                patterns["functions"].append({"name": name, "line": i})
            elif stripped.startswith("class "):
                name = stripped.split("(")[0].split(":")[0].replace("class ", "")
                patterns["classes"].append({"name": name, "line": i})
            elif stripped.startswith("import ") or stripped.startswith("from "):
                patterns["imports"].append({"statement": stripped, "line": i})
            elif "router." in stripped or "app." in stripped:
                for method in ["get", "post", "put", "delete", "patch"]:
                    if f".{method}(" in stripped.lower():
                        patterns["routes"].append({"method": method.upper(), "line": i})
            # Issue detection
            if "eval(" in stripped:
                patterns["issues"].append({"line": i, "severity": "error", "message": "eval() is a security risk"})
            if "TODO" in stripped or "FIXME" in stripped:
                patterns["issues"].append({"line": i, "severity": "info", "message": stripped.strip()})

        analysis["patterns"] = patterns
        analysis["summary"] = (
            f"Found {len(patterns['functions'])} functions, "
            f"{len(patterns['classes'])} classes, "
            f"{len(patterns['imports'])} imports, "
            f"{len(patterns['routes'])} routes, "
            f"{len(patterns['issues'])} issues"
        )

        _json_response(self, analysis)


def main():
    port = int(os.environ.get("AI_MODULE_PORT", "5100"))
    server = HTTPServer(("0.0.0.0", port), AIModuleHandler)
    print(f"[ai-server] AI Module server running on http://localhost:{port}")
    print(f"[ai-server] Endpoints: /api/ai-module/status, /models, /session, /prompt/build, /usage/estimate, /analyze")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[ai-server] Shutting down...")
        server.server_close()


if __name__ == "__main__":
    main()
