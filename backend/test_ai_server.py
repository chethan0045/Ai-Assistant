"""Tests for the AI module server endpoints.

Run with: python -m unittest test_ai_server -v
"""

from __future__ import annotations

import json
import sys
import os
import unittest
from http.client import HTTPConnection
from threading import Thread
from http.server import HTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai.models import resolve_model_alias, pricing_for_model
from ai.usage import TokenUsage, format_usd
from ai.engine import QueryEngine, QueryEngineConfig
from ai.session import Session, MessageRole, estimate_session_tokens
from ai.cache import PromptCache
from ai.telemetry import ClientIdentity, AnthropicRequestProfile


class TestAIModuleUnit(unittest.TestCase):
    """Unit tests for the AI module within the C:\\AI project."""

    def test_model_aliases(self):
        self.assertEqual(resolve_model_alias('opus'), 'claude-opus-4-6')
        self.assertEqual(resolve_model_alias('sonnet'), 'claude-sonnet-4-6')
        self.assertEqual(resolve_model_alias('haiku'), 'claude-haiku-4-5-20251213')
        self.assertEqual(resolve_model_alias('grok'), 'grok-3')

    def test_pricing_lookup(self):
        p = pricing_for_model('claude-opus-4-6')
        self.assertIsNotNone(p)
        self.assertAlmostEqual(p.input_cost_per_million, 15.0)
        self.assertAlmostEqual(p.output_cost_per_million, 75.0)

    def test_cost_estimation(self):
        usage = TokenUsage(input_tokens=1_000_000, output_tokens=500_000)
        cost = usage.estimate_cost_usd('claude-sonnet-4-6')
        self.assertEqual(format_usd(cost.input_cost_usd), '$15.0000')
        self.assertEqual(format_usd(cost.output_cost_usd), '$37.5000')

    def test_query_engine_submit(self):
        engine = QueryEngine(config=QueryEngineConfig(max_turns=5))
        result = engine.submit('hello world')
        self.assertEqual(result.stop_reason, 'completed')
        self.assertIn('hello world', result.output)

    def test_query_engine_max_turns(self):
        engine = QueryEngine(config=QueryEngineConfig(max_turns=2))
        engine.submit('first')
        engine.submit('second')
        result = engine.submit('third')
        self.assertEqual(result.stop_reason, 'max_turns_reached')

    def test_query_engine_streaming(self):
        engine = QueryEngine()
        events = list(engine.stream_submit('test prompt'))
        types = [e['type'] for e in events]
        self.assertIn('message_start', types)
        self.assertIn('message_delta', types)
        self.assertIn('message_stop', types)

    def test_session_lifecycle(self):
        session = Session.new()
        session.model = 'claude-sonnet-4-6'
        session.add_user_prompt('hello')
        session.add_message(MessageRole.ASSISTANT, 'hi there')
        self.assertEqual(len(session.messages), 2)
        self.assertGreater(estimate_session_tokens(session), 0)

    def test_cache_operations(self):
        from ai.types import MessageRequest, MessageResponse, ContentBlock
        cache = PromptCache()
        req = MessageRequest(model='sonnet', max_tokens=100)
        resp = MessageResponse(id='r1', content=[ContentBlock.text_block('cached')])
        cache.record_response(req, resp)
        hit = cache.lookup_completion(req)
        self.assertIsNotNone(hit)
        self.assertEqual(hit.id, 'r1')

    def test_telemetry_headers(self):
        profile = AnthropicRequestProfile()
        headers = dict(profile.header_pairs())
        self.assertIn('anthropic-version', headers)
        self.assertIn('anthropic-beta', headers)
        self.assertIn('user-agent', headers)

    def test_client_identity(self):
        identity = ClientIdentity(app_name='code-assistant', app_version='1.0')
        self.assertEqual(identity.user_agent(), 'code-assistant/1.0 (rust)')


class TestAIServer(unittest.TestCase):
    """Integration tests for the ai-server.py HTTP server."""

    server: HTTPServer
    thread: Thread
    port: int = 5199  # Use a test port

    @classmethod
    def setUpClass(cls):
        import importlib
        mod = importlib.import_module('ai-server')
        AIModuleHandler = mod.AIModuleHandler
        cls.server = HTTPServer(('localhost', cls.port), AIModuleHandler)
        cls.thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def _get(self, path: str) -> tuple[int, dict]:
        conn = HTTPConnection('localhost', self.port)
        conn.request('GET', path)
        resp = conn.getresponse()
        data = json.loads(resp.read().decode())
        status = resp.status
        conn.close()
        return status, data

    def _post(self, path: str, body: dict) -> tuple[int, dict]:
        conn = HTTPConnection('localhost', self.port)
        payload = json.dumps(body).encode()
        conn.request('POST', path, payload, {'Content-Type': 'application/json'})
        resp = conn.getresponse()
        raw = resp.read().decode()
        status = resp.status
        conn.close()
        # Handle SSE responses
        if resp.getheader('Content-Type', '').startswith('text/event-stream'):
            return status, {'stream': raw}
        return status, json.loads(raw)

    def test_status_endpoint(self):
        status, data = self._get('/api/ai-module/status')
        self.assertEqual(status, 200)
        self.assertEqual(data['module'], 'ai')
        self.assertEqual(data['status'], 'ready')
        self.assertIn('providers', data)

    def test_models_list(self):
        status, data = self._get('/api/ai-module/models')
        self.assertEqual(status, 200)
        self.assertIn('models', data)
        self.assertGreater(len(data['models']), 0)
        model = data['models'][0]
        self.assertIn('alias', model)
        self.assertIn('canonical', model)
        self.assertIn('provider', model)

    def test_model_resolve(self):
        status, data = self._get('/api/ai-module/models/opus')
        self.assertEqual(status, 200)
        self.assertEqual(data['canonical'], 'claude-opus-4-6')
        self.assertEqual(data['provider'], 'anthropic')

    def test_session_create_and_message(self):
        # Create session
        status, session = self._post('/api/ai-module/session', {'model': 'sonnet'})
        self.assertEqual(status, 201)
        self.assertIn('session_id', session)
        sid = session['session_id']

        # Get session
        status, data = self._get(f'/api/ai-module/session/{sid}')
        self.assertEqual(status, 200)
        self.assertEqual(data['session_id'], sid)

        # Send message
        status, result = self._post(f'/api/ai-module/session/{sid}/message', {
            'prompt': 'hello from test',
        })
        self.assertEqual(status, 200)
        self.assertIn('output', result)
        self.assertIn('hello from test', result['output'])
        self.assertEqual(result['stop_reason'], 'completed')

    def test_session_not_found(self):
        status, data = self._get('/api/ai-module/session/nonexistent')
        self.assertEqual(status, 404)

    def test_prompt_build(self):
        status, data = self._post('/api/ai-module/prompt/build', {
            'os': 'windows',
            'output_style': 'concise',
            'sections': [{'title': 'Rules', 'content': 'Be helpful'}],
        })
        self.assertEqual(status, 200)
        self.assertIn('prompt', data)
        self.assertIn('windows', data['prompt'])
        self.assertIn('Be helpful', data['prompt'])
        self.assertGreater(data['length'], 0)

    def test_usage_estimate(self):
        status, data = self._post('/api/ai-module/usage/estimate', {
            'input_tokens': 1000,
            'output_tokens': 500,
            'model': 'claude-sonnet-4-6',
        })
        self.assertEqual(status, 200)
        self.assertEqual(data['total_tokens'], 1500)
        self.assertIn('formatted_cost', data)
        self.assertIn('breakdown', data)

    def test_cache_stats(self):
        status, data = self._get('/api/ai-module/cache/stats')
        self.assertEqual(status, 200)
        self.assertIn('hits', data)
        self.assertIn('misses', data)

    def test_analyze_code(self):
        status, data = self._post('/api/ai-module/analyze', {
            'code': 'def hello():\n    print("world")\n\nclass Foo:\n    pass\n',
            'filePath': 'test.py',
        })
        self.assertEqual(status, 200)
        self.assertEqual(len(data['patterns']['functions']), 1)
        self.assertEqual(data['patterns']['functions'][0]['name'], 'hello')
        self.assertEqual(len(data['patterns']['classes']), 1)
        self.assertEqual(data['patterns']['classes'][0]['name'], 'Foo')

    def test_not_found(self):
        status, data = self._get('/api/ai-module/nonexistent')
        self.assertEqual(status, 404)


if __name__ == '__main__':
    unittest.main()
