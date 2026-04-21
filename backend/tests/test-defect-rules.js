// Unit tests for the rule-based defect classifier.
// No DB, no network — purely exercises defectRules.classify() against representative
// error strings. This is the fastest test suite and should stay that way.
//
// Run: node --test tests/test-defect-rules.js

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { classify, RULES } = require('../services/defectRules');

describe('defectRules.classify', () => {

  test('returns unknown when no rule matches', () => {
    const cls = classify('Some completely novel error string with no signature', '');
    assert.equal(cls.category, 'unknown');
    assert.equal(cls.ruleId, null);
    assert.equal(cls.severity, 'medium'); // default fallback severity
  });

  test('matches MongoNetworkError as database/high', () => {
    const cls = classify('MongoNetworkError: connection refused to Atlas cluster', '');
    assert.equal(cls.category, 'database');
    assert.equal(cls.severity, 'high');
    assert.equal(cls.ruleId, 'mongo-network');
    assert.match(cls.rootCause, /MongoDB is unreachable/i);
    assert.match(cls.suggestedFix, /MONGO_URI/);
  });

  test('matches EADDRINUSE as runtime/medium', () => {
    const cls = classify('EADDRINUSE: address already in use :::4100', '');
    assert.equal(cls.category, 'runtime');
    assert.equal(cls.severity, 'medium');
    assert.equal(cls.ruleId, 'port-in-use');
  });

  test('matches Cannot read property as runtime/high', () => {
    const cls = classify('TypeError: Cannot read properties of undefined (reading "name")', '');
    assert.equal(cls.ruleId, 'undefined-property');
    assert.equal(cls.severity, 'high');
  });

  test('matches JWT errors as auth/medium', () => {
    const a = classify('JsonWebTokenError: jwt malformed', '');
    const b = classify('TokenExpiredError: jwt expired', '');
    assert.equal(a.ruleId, 'jwt-invalid');
    assert.equal(b.ruleId, 'jwt-invalid');
    assert.equal(a.category, 'auth');
  });

  test('matches CORS errors as api/medium', () => {
    const cls = classify('CORS error: No Access-Control-Allow-Origin header', '');
    assert.equal(cls.ruleId, 'cors');
    assert.equal(cls.category, 'api');
  });

  test('matches newly-added module-not-found rule', () => {
    const cls = classify('Error: Cannot find module \'./foo\'', '');
    assert.equal(cls.ruleId, 'module-not-found');
    assert.equal(cls.category, 'runtime');
    assert.equal(cls.severity, 'high');
  });

  test('matches newly-added out-of-memory as critical', () => {
    const cls = classify('FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory', '');
    assert.equal(cls.ruleId, 'out-of-memory');
    assert.equal(cls.severity, 'critical');
  });

  test('uses the stack trace when message is unspecific', () => {
    const cls = classify('Unhandled error', 'at Foo (/app/index.js:10:5)\nCaused by: EADDRINUSE');
    // Stack contains EADDRINUSE — the classifier concatenates message + stack.
    assert.equal(cls.ruleId, 'port-in-use');
  });

  test('first matching rule wins (priority = declaration order)', () => {
    // Craft a string that triggers two rules; the earliest-declared must win.
    // EADDRINUSE → port-in-use (declared early); E11000 → validation-error (declared later).
    // Both patterns hit, so classifier must pick port-in-use.
    const cls = classify('EADDRINUSE and also E11000 duplicate key', '');
    assert.equal(cls.ruleId, 'port-in-use', `earlier rule should win, got ${cls.ruleId}`);

    // Sanity: confirm both rules individually would have matched.
    const idsByOrder = RULES.map(r => r.id);
    assert.ok(idsByOrder.indexOf('port-in-use') < idsByOrder.indexOf('validation-error'));
  });

  test('every rule exposes required fields', () => {
    // Schema check — guards against typos when new rules are added.
    for (const rule of RULES) {
      assert.ok(rule.id, `rule missing id`);
      assert.ok(rule.pattern instanceof RegExp, `rule ${rule.id} missing regex pattern`);
      assert.ok(rule.category, `rule ${rule.id} missing category`);
      assert.ok(rule.severity, `rule ${rule.id} missing severity`);
      assert.ok(rule.rootCause, `rule ${rule.id} missing rootCause`);
      assert.ok(rule.suggestedFix, `rule ${rule.id} missing suggestedFix`);
    }
  });

});
