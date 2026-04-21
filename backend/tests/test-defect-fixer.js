// Tests the fix synthesizer — the "AI assistant that solves defects."
// Covers the pure pieces (extractCodeBlocks, proseToSteps, computeConfidence) as
// pure-function unit tests, and proposeFix() with a monkey-patched RAG so we can
// assert on outputs without needing MongoDB or the MiniLM model loaded.
//
// Run: node --test tests/test-defect-fixer.js

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const fixerModule = require('../services/defectFixer');
const { extractCodeBlocks, proseToSteps, computeConfidence, proposeFix } = fixerModule;

// -- pure helpers --

describe('extractCodeBlocks', () => {
  test('pulls fenced blocks out and leaves placeholders in prose', () => {
    const md = 'Before\n```js\nconst x = 1;\n```\nAfter\n```\nplain\n```';
    const { prose, blocks } = extractCodeBlocks(md);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].language, 'js');
    assert.equal(blocks[0].code, 'const x = 1;');
    assert.equal(blocks[1].language, 'text');
    assert.match(prose, /__CODEBLOCK_0__/);
    assert.match(prose, /__CODEBLOCK_1__/);
  });

  test('handles no blocks gracefully', () => {
    const { prose, blocks } = extractCodeBlocks('just prose here');
    assert.equal(blocks.length, 0);
    assert.equal(prose, 'just prose here');
  });

  test('handles empty/undefined input', () => {
    assert.deepEqual(extractCodeBlocks(''), { prose: '', blocks: [] });
    assert.deepEqual(extractCodeBlocks(null), { prose: '', blocks: [] });
  });
});

describe('proseToSteps', () => {
  test('detects numbered lists', () => {
    const steps = proseToSteps('1. First step\n2. Second step\n3. Third step');
    assert.deepEqual(steps, ['First step', 'Second step', 'Third step']);
  });

  test('detects bulleted lists', () => {
    const steps = proseToSteps('- Do A\n- Do B\n- Do C');
    assert.deepEqual(steps, ['Do A', 'Do B', 'Do C']);
  });

  test('falls back to sentence split when no list markers', () => {
    const steps = proseToSteps('Check the config file. Then restart the server. Verify the logs look healthy.');
    assert.equal(steps.length, 3);
    assert.match(steps[0], /Check the config/);
  });

  test('returns empty array for empty input', () => {
    assert.deepEqual(proseToSteps(''), []);
    assert.deepEqual(proseToSteps(null), []);
  });
});

describe('computeConfidence', () => {
  test('floor for novel defects (no rule, no RAG)', () => {
    const c = computeConfidence({ ruleMatched: false, topScore: 0, numSuggestions: 0 });
    assert.equal(c, 0.2);
  });

  test('rule-match alone anchors at ~0.55', () => {
    const c = computeConfidence({ ruleMatched: true, topScore: 0, numSuggestions: 0 });
    assert.equal(c, 0.55);
  });

  test('never exceeds 0.95 ceiling', () => {
    const c = computeConfidence({ ruleMatched: true, topScore: 1, numSuggestions: 10 });
    assert.ok(c <= 0.95, `got ${c}`);
  });

  test('multiple RAG suggestions bump confidence', () => {
    const one = computeConfidence({ ruleMatched: true, topScore: 0.6, numSuggestions: 1 });
    const two = computeConfidence({ ruleMatched: true, topScore: 0.6, numSuggestions: 2 });
    assert.ok(two > one);
  });
});

// -- proposeFix: integration against a stubbed RAG --

describe('proposeFix', () => {
  // Monkey-patch the analyze import inside defectFixer.js. The module already
  // required defectRag; we replace it via the module cache so the test doesn't
  // touch MongoDB or MiniLM. Tests stay under 100 ms.
  let originalAnalyze;

  before(() => {
    const defectRag = require('../services/defectRag');
    originalAnalyze = defectRag.analyze;
  });

  function stubRag(suggestions) {
    const defectRag = require('../services/defectRag');
    defectRag.analyze = async () => ({ embedding: [], suggestions });
  }

  test('rejects defects without a message', async () => {
    await assert.rejects(proposeFix({}), /message is required/);
  });

  test('rule-matched defect produces high confidence and rule-based summary', async () => {
    stubRag([]);
    const proposal = await proposeFix({
      message: 'EADDRINUSE: address already in use :::4100',
      stack: '',
    });
    assert.equal(proposal.category, 'runtime');
    assert.equal(proposal.ruleId, 'port-in-use');
    assert.match(proposal.summary, /RUNTIME defect/);
    assert.ok(proposal.confidence >= 0.55);
    assert.ok(proposal.steps.length > 0, 'should have steps from rule suggestedFix');
  });

  test('unknown defect with RAG hits falls back to similarity-based proposal', async () => {
    stubRag([
      { problem: 'Connection refused to Atlas', solution: '1. Check MONGO_URI\n2. Whitelist IP\n```\nmongoose.connect(uri, { family: 4 });\n```', score: 0.78 },
    ]);
    const proposal = await proposeFix({
      message: 'Weird undocumented database thing happened',
      stack: '',
    });
    assert.equal(proposal.category, 'unknown');
    assert.equal(proposal.ruleId, null);
    assert.match(proposal.summary, /1 semantically-similar/);
    assert.equal(proposal.references.length, 1);
    assert.equal(proposal.references[0].score, 0.78);
    assert.ok(proposal.codeSnippets.length >= 1, 'should extract code from RAG solution');
  });

  test('novel defect (no rule, no RAG) returns low-confidence proposal with honest summary', async () => {
    stubRag([]);
    const proposal = await proposeFix({
      message: 'Totally new error the system has never seen',
      stack: '',
    });
    assert.equal(proposal.category, 'unknown');
    assert.equal(proposal.confidence, 0.2);
    assert.match(proposal.summary, /novel defect/);
    assert.equal(proposal.references.length, 0);
  });

  test('rule + RAG hits combine — confidence higher than either alone', async () => {
    stubRag([
      { problem: 'Port already bound', solution: 'Kill PID and retry', score: 0.85 },
      { problem: 'Dangling socket', solution: '- Step A\n- Step B', score: 0.6 },
    ]);
    const proposal = await proposeFix({
      message: 'EADDRINUSE: address already in use :::4100',
      stack: '',
    });
    assert.equal(proposal.ruleId, 'port-in-use');
    assert.ok(proposal.confidence > 0.7);
    assert.equal(proposal.references.length, 2);
    assert.ok(proposal.steps.some(s => s.includes('similar issue')), 'should reference similar issues in steps');
  });

  // Restore the real analyze so later suites that might import don't see the stub.
  test('teardown restores analyze', () => {
    const defectRag = require('../services/defectRag');
    defectRag.analyze = originalAnalyze;
    assert.equal(defectRag.analyze, originalAnalyze);
  });
});
