const express = require('express');
const router = express.Router();
const Defect = require('../models/Defect');
const { requireAuth } = require('../middleware/auth');
const { classify } = require('../services/defectRules');
const { analyze } = require('../services/defectRag');
const { proposeFix } = require('../services/defectFixer');

// Runs the defect RAG in the background and patches the defect when done.
// Fire-and-forget from request handlers so logging doesn't block the client.
async function runRagAsync(defectId, message, stack) {
  try {
    const result = await analyze(message, stack || '');
    await Defect.findByIdAndUpdate(defectId, {
      embedding: result.embedding,
      aiSuggestions: result.suggestions,
      aiAnalyzedAt: new Date(),
    });
  } catch (err) {
    console.warn('[defect-rag] analysis failed:', err.message);
  }
}

// ===== EXPLICIT LOG =====
// Unauthed so the frontend can POST errors without a JWT dependency.
// For anonymous posts, userId is null; the server pulls it from the JWT when present.
router.post('/log', async (req, res) => {
  try {
    const { message, stack, endpoint, method, statusCode, severity, tags, userId, projectName } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });

    const cls = classify(message, stack || '');
    const defect = await Defect.create({
      userId: userId || null,
      projectName: (projectName || '').trim(),
      message,
      stack: stack || '',
      endpoint: endpoint || '',
      method: method || '',
      statusCode: Number(statusCode) || 500,
      category: cls.category,
      rootCause: cls.rootCause,
      suggestedFix: cls.suggestedFix,
      severity: severity || cls.severity,
      tags: Array.isArray(tags) ? tags : [],
    });

    // Kick off RAG analysis in the background — response stays snappy.
    runRagAsync(defect._id, message, stack);

    res.status(201).json(defect);
  } catch (err) {
    console.error('Defect log error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== PREVIEW ANALYZE =====
// Runs classify + RAG on an arbitrary message/stack WITHOUT persisting a defect.
// Useful for the dashboard's "Analyze error" tool and for client-side preflight checks.
router.post('/analyze', async (req, res) => {
  try {
    const { message, stack } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    const cls = classify(message, stack || '');
    const rag = await analyze(message, stack || '');
    res.json({
      classification: {
        category: cls.category,
        rootCause: cls.rootCause,
        suggestedFix: cls.suggestedFix,
        severity: cls.severity,
        ruleId: cls.ruleId,
      },
      suggestions: rag.suggestions,
    });
  } catch (err) {
    console.error('Defect analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== SYNC FROM PROJECT SCAN =====
// Bulk-persists static-analysis issues from the frontend project scanner.
// Upserts by (projectName, source='static', filePath, lineNumber, ruleId) so
// re-scanning the same codebase won't create duplicates — it just updates
// the message/severity/timestamps on existing entries.
router.post('/sync-scan', async (req, res) => {
  try {
    const { projectName, issues, userId } = req.body || {};
    if (!Array.isArray(issues)) return res.status(400).json({ error: 'issues[] required' });
    if (issues.length === 0) return res.json({ inserted: 0, updated: 0, total: 0 });

    const proj = (projectName || '').trim();
    const SEVERITY_MAP = { error: 'high', warning: 'medium', info: 'low' };
    const CATEGORY_MAP = {
      'no-eval': 'security', 'no-inner-html': 'security', 'angular-inner-html': 'security',
      'no-hardcoded-password': 'security', 'no-hardcoded-api-key': 'security', 'no-hardcoded-secret': 'security',
      'prefer-https': 'security', 'no-implied-eval': 'security', 'command-injection-risk': 'security',
      'no-template-exec': 'security', 'no-where-operator': 'security', 'no-http-script': 'security',
      'no-target-blank': 'security',
      'async-route-handler': 'runtime', 'return-after-response': 'runtime',
      'db-error-handling': 'database', 'validate-object-id': 'database',
      'no-var': 'style', 'eqeqeq': 'style', 'no-any': 'style', 'no-console': 'style',
      'no-debugger': 'style', 'no-todo': 'style', 'no-alert': 'style', 'no-direct-dom': 'style',
      'no-empty-catch': 'runtime',
      'ngfor-track-by': 'performance', 'unsubscribe-on-destroy': 'runtime',
      'no-complex-template-expression': 'style', 'no-long-inline-style': 'style',
      'prefer-async-pipe': 'style', 'no-async-promise': 'style',
      'no-important': 'style', 'no-universal-reset': 'style',
      'no-json-comments': 'runtime', 'img-alt': 'accessibility',
      'no-bare-except': 'runtime', 'no-wildcard-import': 'style', 'no-print': 'style',
    };

    let inserted = 0;
    let updated = 0;

    for (const raw of issues) {
      if (!raw?.filePath || !raw?.ruleId || !raw?.message) continue;
      const filter = {
        projectName: proj,
        source: 'static',
        filePath: raw.filePath,
        lineNumber: Number(raw.lineNumber) || 0,
        ruleId: raw.ruleId,
      };
      const update = {
        $set: {
          userId: userId || null,
          message: raw.message,
          category: CATEGORY_MAP[raw.ruleId] || 'code-quality',
          severity: SEVERITY_MAP[raw.severity] || 'medium',
          rootCause: raw.rootCause || `Static analysis rule \`${raw.ruleId}\` matched at ${raw.filePath}:${raw.lineNumber}.`,
          suggestedFix: raw.suggestedFix || raw.message,
        },
        $setOnInsert: {
          projectName: proj,
          source: 'static',
          filePath: raw.filePath,
          lineNumber: Number(raw.lineNumber) || 0,
          ruleId: raw.ruleId,
          status: 'open',
          tags: [],
        },
      };
      const result = await Defect.updateOne(filter, update, { upsert: true });
      if (result.upsertedCount > 0) inserted++;
      else if (result.modifiedCount > 0) updated++;
    }

    res.json({ inserted, updated, total: issues.length });
  } catch (err) {
    console.error('Defect sync-scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

// All remaining routes require auth — only logged-in users can view/triage defects.
router.use(requireAuth);

// ===== LIST =====
// Filters: status, category, severity, q (free-text on message/endpoint), limit, skip
router.get('/', async (req, res) => {
  try {
    const { status, category, severity, source, q, projectName, limit = 100, skip = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (source) filter.source = source;
    // projectName can be '' to select unassigned defects explicitly; use '__all__' to bypass the filter.
    if (projectName !== undefined && projectName !== '__all__') {
      filter.projectName = projectName;
    }
    if (q) {
      const rx = new RegExp(q.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ message: rx }, { endpoint: rx }];
    }

    const [items, total] = await Promise.all([
      Defect.find(filter).sort({ createdAt: -1 }).skip(Number(skip)).limit(Math.min(Number(limit), 500)),
      Defect.countDocuments(filter),
    ]);

    res.json({ items, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== STATS =====
router.get('/stats', async (req, res) => {
  try {
    const { projectName } = req.query;
    const match = {};
    if (projectName !== undefined && projectName !== '__all__') {
      match.projectName = projectName;
    }
    const [byStatus, byCategory, bySeverity, total] = await Promise.all([
      Defect.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Defect.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Defect.aggregate([{ $match: match }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Defect.countDocuments(match),
    ]);
    res.json({ total, byStatus, byCategory, bySeverity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== LIST DISTINCT PROJECTS =====
router.get('/projects', async (req, res) => {
  try {
    const names = await Defect.distinct('projectName');
    res.json({ projects: names.filter(n => n).sort() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GET ONE =====
router.get('/:id', async (req, res) => {
  try {
    const defect = await Defect.findById(req.params.id);
    if (!defect) return res.status(404).json({ error: 'Not found' });
    res.json(defect);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== UPDATE STATUS / SEVERITY / TAGS =====
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['status', 'severity', 'tags', 'rootCause', 'suggestedFix', 'projectName'];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
    const defect = await Defect.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!defect) return res.status(404).json({ error: 'Not found' });
    res.json(defect);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== AI ANALYSIS (RAG over DefectKnowledge) =====
// Run or re-run semantic retrieval on a defect. Synchronous so the UI sees
// suggestions immediately when clicked, unlike the background job at save time.
router.post('/:id/rag', async (req, res) => {
  try {
    const defect = await Defect.findById(req.params.id);
    if (!defect) return res.status(404).json({ error: 'Not found' });
    const result = await analyze(defect.message, defect.stack || '');
    defect.embedding = result.embedding;
    defect.aiSuggestions = result.suggestions;
    defect.aiAnalyzedAt = new Date();
    await defect.save();
    res.json(defect);
  } catch (err) {
    console.error('Defect RAG error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== AI-ASSISTED FIX PROPOSAL =====
// Synthesizes a structured fix (summary, steps, code snippets, confidence, references)
// from the defect's classification + RAG suggestions. Does not modify the defect —
// read-only proposal intended for the dashboard's "Fix with AI" button.
router.post('/:id/fix', async (req, res) => {
  try {
    const defect = await Defect.findById(req.params.id);
    if (!defect) return res.status(404).json({ error: 'Not found' });
    const proposal = await proposeFix(defect);
    res.json({ defectId: String(defect._id), proposal });
  } catch (err) {
    console.error('Defect fix proposal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== RECLASSIFY =====
// Re-run the rule engine on a defect (useful after tweaking defectRules.js).
router.post('/:id/reclassify', async (req, res) => {
  try {
    const defect = await Defect.findById(req.params.id);
    if (!defect) return res.status(404).json({ error: 'Not found' });
    const cls = classify(defect.message, defect.stack);
    defect.category = cls.category;
    defect.rootCause = cls.rootCause;
    defect.suggestedFix = cls.suggestedFix;
    defect.severity = cls.severity;
    await defect.save();
    res.json(defect);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== DELETE =====
router.delete('/:id', async (req, res) => {
  try {
    const result = await Defect.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
