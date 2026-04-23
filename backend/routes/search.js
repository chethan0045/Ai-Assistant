const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { embed, cosineSim } = require('../services/embeddings');
const { KnowledgeEntry, DirectAnswer } = require('../models/Knowledge');
const DefectKnowledge = require('../models/DefectKnowledge');
const Defect = require('../models/Defect');
const ChatMessage = require('../models/ChatMessage');
const LeetProblem = require('../models/LeetProblem');
const ProjectBlueprint = require('../models/ProjectBlueprint');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-app-secret-key-2024';

// Opportunistic auth: decode the JWT if present so user-scoped collections join the search.
// If no token / bad token, user-scoped collections are silently skipped (public search only).
function extractUserId(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded?.userId || null;
  } catch {
    return null;
  }
}

// Directories the scanner already skips — don't grep through them here either.
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.angular', '.models-cache',
  'dist', 'build', 'out', 'coverage', '.next', '.nuxt',
  '__pycache__', '.vscode', '.idea', 'vendor', '.turbo',
  '.cache', '.parcel-cache', 'target', 'bin', 'obj', '.gradle',
  'test-results', 'allure-results', 'playwright-report',
  'screenshots', 'videos', 'downloads', 'artifacts',
]);

const SKIP_FILE_SUFFIXES = [
  '.min.js', '.min.css', '.min.map', '.map', '.d.ts.map',
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp',
  '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.webm', '.mp3', '.wav',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.exe', '.dll', '.so',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
];

function shouldSkipFile(name) {
  for (const s of SKIP_FILE_SUFFIXES) if (name.endsWith(s) || name === s) return true;
  return false;
}

/**
 * Recursive grep. Honors skip lists, has a hard match cap, and stops each file
 * at a per-file match cap so one huge file can't drown the results.
 */
async function searchDir(root, pattern, opts) {
  const { maxMatches = 200, maxPerFile = 20, maxFileBytes = 300 * 1024 } = opts;
  const results = [];

  async function walk(dir, rel) {
    if (results.length >= maxMatches) return;
    let entries;
    try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const ent of entries) {
      if (results.length >= maxMatches) return;
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        await walk(path.join(dir, ent.name), rel ? rel + '/' + ent.name : ent.name);
        continue;
      }
      if (!ent.isFile()) continue;
      if (shouldSkipFile(ent.name)) continue;
      const full = path.join(dir, ent.name);
      let stat;
      try { stat = await fs.promises.stat(full); } catch { continue; }
      if (stat.size > maxFileBytes) continue;

      let content;
      try { content = await fs.promises.readFile(full, 'utf-8'); } catch { continue; }

      const lines = content.split('\n');
      let fileHits = 0;
      for (let i = 0; i < lines.length && fileHits < maxPerFile; i++) {
        if (pattern.test(lines[i])) {
          results.push({
            path: rel ? rel + '/' + ent.name : ent.name,
            line: i + 1,
            text: lines[i].slice(0, 300),
          });
          fileHits++;
          if (results.length >= maxMatches) return;
        }
      }
    }
  }

  await walk(root, '');
  return results;
}

// GET /api/search?q=foo&root=C:\path&case=1&regex=0
router.get('/', async (req, res) => {
  try {
    const { q, root, case: caseFlag, regex: regexFlag } = req.query;
    if (!q) return res.status(400).json({ error: 'q required' });
    if (!root) return res.status(400).json({ error: 'root required' });

    let stat;
    try { stat = await fs.promises.stat(root); }
    catch { return res.status(404).json({ error: 'root path does not exist' }); }
    if (!stat.isDirectory()) return res.status(400).json({ error: 'root must be a directory' });

    let pattern;
    try {
      if (regexFlag === '1' || regexFlag === 'true') {
        pattern = new RegExp(q.toString(), caseFlag === '1' ? '' : 'i');
      } else {
        const escaped = q.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(escaped, caseFlag === '1' ? '' : 'i');
      }
    } catch (err) {
      return res.status(400).json({ error: 'invalid regex: ' + err.message });
    }

    const results = await searchDir(root, pattern, {});
    res.json({
      query: q,
      root,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// VECTOR SEARCH — cross-collection semantic search over every embedded doc
// =====================================================================
// Collections searched:
//   KnowledgeEntry       (public curated KB)
//   DefectKnowledge      (public curated bug/fix pairs)
//   Defect               (user-scoped, only if authed)
//   ChatMessage          (user-scoped, only if authed)
//
// Query: GET /api/search/vector?q=...&k=5&minScore=0.3&collections=knowledge,defect-knowledge,defects,chat
//   - k and minScore apply per collection (so each source gets a fair share)
//   - collections is a CSV filter; default = all
//
// Returns unified results sorted by score across sources, each tagged with its `source`.
router.get('/vector', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.status(400).json({ error: 'q required' });

    const k = Math.min(Math.max(Number(req.query.k) || 5, 1), 20);
    const minScore = Number(req.query.minScore) || 0.3;
    const userId = extractUserId(req);

    const requested = (req.query.collections || 'knowledge,defect-knowledge,defects,chat,leetcode,direct-answers,blueprints')
      .toString()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const want = new Set(requested);

    const queryVec = await embed(q);

    // Helper: fetch docs with embeddings, score them, keep top-k above minScore.
    async function searchCollection(Model, filter, project, toHit) {
      const full = { ...filter, embedding: { $exists: true, $ne: [] } };
      const docs = await Model.find(full).select(project);
      return docs
        .map(d => ({ d, score: cosineSim(queryVec, d.embedding) }))
        .filter(x => x.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map(x => ({ ...toHit(x.d), score: x.score }));
    }

    const jobs = [];

    if (want.has('knowledge')) {
      jobs.push(searchCollection(
        KnowledgeEntry,
        {},
        'topic category title summary keywords embedding',
        d => ({
          source: 'knowledge',
          id: String(d._id),
          title: d.title,
          snippet: (d.summary || '').slice(0, 240),
          metadata: { topic: d.topic, category: d.category, keywords: d.keywords },
        }),
      ));
    }

    if (want.has('defect-knowledge')) {
      jobs.push(searchCollection(
        DefectKnowledge,
        {},
        'problem solution category severity tags embedding',
        d => ({
          source: 'defect-knowledge',
          id: String(d._id),
          title: d.problem,
          snippet: (d.solution || '').slice(0, 240),
          metadata: { category: d.category, severity: d.severity, tags: d.tags },
        }),
      ));
    }

    if (want.has('defects') && userId) {
      jobs.push(searchCollection(
        Defect,
        { userId },
        'message rootCause suggestedFix category severity status filePath lineNumber source embedding',
        d => ({
          source: 'defects',
          id: String(d._id),
          title: d.message,
          snippet: (d.rootCause || d.suggestedFix || '').slice(0, 240),
          metadata: {
            category: d.category,
            severity: d.severity,
            status: d.status,
            defectSource: d.source,
            filePath: d.filePath,
            lineNumber: d.lineNumber,
          },
        }),
      ));
    }

    if (want.has('chat') && userId) {
      jobs.push(searchCollection(
        ChatMessage,
        { userId },
        'role text conversationId createdAt embedding',
        d => ({
          source: 'chat',
          id: String(d._id),
          title: `[${d.role}] ${d.text.slice(0, 80)}${d.text.length > 80 ? '…' : ''}`,
          snippet: d.text.slice(0, 240),
          metadata: { role: d.role, conversationId: d.conversationId, createdAt: d.createdAt },
        }),
      ));
    }

    if (want.has('leetcode')) {
      jobs.push(searchCollection(
        LeetProblem,
        {},
        'number title difficulty topics description embedding',
        d => ({
          source: 'leetcode',
          id: String(d._id),
          title: `#${d.number} ${d.title} (${d.difficulty})`,
          snippet: (d.description || '').slice(0, 240),
          metadata: { number: d.number, difficulty: d.difficulty, topics: d.topics },
        }),
      ));
    }

    if (want.has('direct-answers')) {
      jobs.push(searchCollection(
        DirectAnswer,
        {},
        'question topic answer priority embedding',
        d => ({
          source: 'direct-answers',
          id: String(d._id),
          title: d.question || d.topic || 'Direct answer',
          snippet: (d.answer || '').slice(0, 240),
          metadata: { topic: d.topic, priority: d.priority },
        }),
      ));
    }

    if (want.has('blueprints')) {
      jobs.push(searchCollection(
        ProjectBlueprint,
        {},
        'slug title description stack keywords files instructions embedding',
        d => ({
          source: 'blueprints',
          id: String(d._id),
          title: d.title,
          snippet: (d.description || '').slice(0, 240),
          metadata: {
            slug: d.slug,
            stack: d.stack,
            keywords: d.keywords,
            fileCount: (d.files || []).length,
            instructions: d.instructions,
          },
        }),
      ));
    }

    const perCollection = await Promise.all(jobs);
    const flat = perCollection.flat();
    // Interleave by score — best hit from any source comes first.
    flat.sort((a, b) => b.score - a.score);

    // Per-source counts for UI badges.
    const countsBySource = flat.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {});

    res.json({
      query: q,
      authed: !!userId,
      collectionsSearched: requested.filter(c => {
        if (c === 'defects' || c === 'chat') return !!userId;
        return true;
      }),
      countsBySource,
      total: flat.length,
      results: flat,
    });
  } catch (err) {
    console.error('Vector search error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
