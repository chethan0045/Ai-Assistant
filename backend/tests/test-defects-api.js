// HTTP integration tests for /api/defects/*. Requires a running backend + MongoDB.
// Uses a fresh test user (JWT forged with the same JWT_SECRET) so these tests don't
// depend on seeded accounts and clean up after themselves.
//
// Skip when no backend is reachable — lets this suite run in CI without a live stack
// (unit tests in the other two files cover logic; this suite covers wiring).
//
// Run: node --test tests/test-defects-api.js
//   Or: API_URL=http://localhost:4101 node --test tests/test-defects-api.js

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-app-secret-key-2024';
const CANDIDATE_PORTS = [4100, 4101, 4102, 4103, 4104, 4105, 4106];

let API_URL = process.env.API_URL || '';
let TOKEN = '';
const createdIds = [];

async function detectApi() {
  if (API_URL) return API_URL;
  for (const p of CANDIDATE_PORTS) {
    try {
      const r = await fetch(`http://localhost:${p}/api/health`);
      if (r.ok) { API_URL = `http://localhost:${p}`; return API_URL; }
    } catch {}
  }
  return '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };
}

describe('defects HTTP api', { concurrency: false }, () => {

  before(async () => {
    await detectApi();
    if (!API_URL) {
      console.log('\n  [skip] backend not reachable on ports 4100-4106 — skipping HTTP integration tests.\n');
      return;
    }
    // Forge a token with the same secret the server uses. No DB user needed —
    // the defects routes only check the signature; we're not creating data that
    // requires a real User record.
    TOKEN = jwt.sign({ userId: '000000000000000000000001', email: 'test@defect-tests.local' }, JWT_SECRET, { expiresIn: '1h' });
  });

  after(async () => {
    if (!API_URL || !TOKEN) return;
    // Best-effort cleanup: delete every defect this suite created.
    for (const id of createdIds) {
      try {
        await fetch(`${API_URL}/api/defects/${id}`, { method: 'DELETE', headers: authHeaders() });
      } catch {}
    }
  });

  test('POST /log (unauthed) creates a defect and classifies it', async (t) => {
    if (!API_URL) return t.skip('backend unreachable');
    const res = await fetch(`${API_URL}/api/defects/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'EADDRINUSE: address already in use :::4100',
        endpoint: '/test/eaddrinuse',
        method: 'TEST',
        projectName: 'defect-tests',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.category, 'runtime');
    assert.equal(body.severity, 'medium');
    assert.match(body.rootCause, /Another process is already listening/);
    createdIds.push(body._id);
  });

  test('POST /log returns 400 when message is missing', async (t) => {
    if (!API_URL) return t.skip('backend unreachable');
    const res = await fetch(`${API_URL}/api/defects/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });

  test('POST /analyze previews without persisting', async (t) => {
    if (!API_URL) return t.skip('backend unreachable');
    const beforeRes = await fetch(`${API_URL}/api/defects/?projectName=__all__`, { headers: authHeaders() });
    const beforeBody = await beforeRes.json();
    const beforeCount = beforeBody.total;

    const res = await fetch(`${API_URL}/api/defects/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'MongoNetworkError: connection refused to Atlas cluster',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.classification.category, 'database');
    assert.equal(body.classification.severity, 'high');
    assert.ok(Array.isArray(body.suggestions));

    const afterRes = await fetch(`${API_URL}/api/defects/?projectName=__all__`, { headers: authHeaders() });
    const afterBody = await afterRes.json();
    assert.equal(afterBody.total, beforeCount, 'analyze must not persist');
  });

  test('POST /:id/fix returns a structured proposal', async (t) => {
    if (!API_URL) return t.skip('backend unreachable');
    // Seed a defect for the fixer to chew on.
    const logRes = await fetch(`${API_URL}/api/defects/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'EADDRINUSE: address already in use :::4100',
        projectName: 'defect-tests',
      }),
    });
    const logged = await logRes.json();
    createdIds.push(logged._id);

    const res = await fetch(`${API_URL}/api/defects/${logged._id}/fix`, {
      method: 'POST',
      headers: authHeaders(),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.defectId, logged._id);
    assert.ok(body.proposal, 'response missing proposal');
    assert.equal(body.proposal.ruleId, 'port-in-use');
    assert.ok(body.proposal.confidence >= 0.55, `expected confidence >= 0.55, got ${body.proposal.confidence}`);
    assert.ok(body.proposal.steps.length > 0, 'proposal should include steps');
  });

  test('POST /:id/fix returns 404 for nonexistent defect', async (t) => {
    if (!API_URL) return t.skip('backend unreachable');
    const res = await fetch(`${API_URL}/api/defects/000000000000000000000000/fix`, {
      method: 'POST',
      headers: authHeaders(),
    });
    assert.equal(res.status, 404);
  });

  test('GET / filter by category/severity returns only matches', async (t) => {
    if (!API_URL) return t.skip('backend unreachable');
    const res = await fetch(`${API_URL}/api/defects/?category=runtime&projectName=__all__`, {
      headers: authHeaders(),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    for (const d of body.items) {
      assert.equal(d.category, 'runtime', `defect ${d._id} leaked through category filter`);
    }
  });

  test('POST /sync-scan upserts static issues idempotently', async (t) => {
    if (!API_URL) return t.skip('backend unreachable');
    const payload = {
      projectName: 'defect-tests',
      issues: [{
        filePath: 'src/app.ts',
        lineNumber: 42,
        ruleId: 'no-console',
        message: 'console.log left in source',
        severity: 'warning',
      }],
    };
    const first = await fetch(`${API_URL}/api/defects/sync-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const firstBody = await first.json();

    const second = await fetch(`${API_URL}/api/defects/sync-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const secondBody = await second.json();

    // First run: either inserted (if fresh) or updated (if a previous run existed).
    // Second run with identical payload: MUST be 0 inserts — the composite key dedup.
    assert.equal(secondBody.inserted, 0, 'duplicate sync-scan must not insert');

    // Track the upserted id for cleanup (look it up via list).
    const list = await fetch(`${API_URL}/api/defects/?projectName=defect-tests&category=code-quality`, {
      headers: authHeaders(),
    });
    const listBody = await list.json();
    const ours = listBody.items.find(d => d.filePath === 'src/app.ts' && d.ruleId === 'no-console');
    if (ours) createdIds.push(ours._id);
  });

});
