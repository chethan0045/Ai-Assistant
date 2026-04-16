const express = require('express');
const router = express.Router();
const LeetProblem = require('../models/LeetProblem');

/**
 * Detect a LeetCode problem from free-text input.
 * Scores: regex signature match (100), keyword match (20), title word (5).
 * Min threshold: 40.
 */
router.post('/detect', async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: 'input required' });
    const text = input.toLowerCase();

    const all = await LeetProblem.find({}, { number: 1, title: 1, difficulty: 1, description: 1, keywords: 1, signatures: 1, complexity: 1, approach: 1, code: 1, tests: 1, topics: 1 }).lean();

    let best = null, bestScore = 0;
    for (const p of all) {
      let score = 0;
      for (const sigStr of p.signatures || []) {
        try { if (new RegExp(sigStr, 'i').test(input)) score += 100; } catch {}
      }
      for (const kw of p.keywords || []) {
        if (text.includes(kw.toLowerCase())) score += 20;
      }
      const titleWords = p.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      for (const w of titleWords) if (text.includes(w)) score += 5;
      if (score > bestScore) { bestScore = score; best = p; }
    }

    if (bestScore < 40) return res.json({ match: null, score: bestScore });
    res.json({ match: best, score: bestScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leetcode/:number
router.get('/:number', async (req, res) => {
  try {
    const p = await LeetProblem.findOne({ number: Number(req.params.number) }).lean();
    if (!p) return res.status(404).json({ error: 'not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/leetcode?difficulty=Easy&limit=50
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.topic) filter.topics = req.query.topic;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const problems = await LeetProblem.find(filter, { number: 1, title: 1, difficulty: 1, topics: 1, complexity: 1 })
      .sort({ number: 1 }).limit(limit).lean();
    const total = await LeetProblem.countDocuments(filter);
    res.json({ problems, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/leetcode/stats
router.get('/stats/summary', async (req, res) => {
  try {
    const total = await LeetProblem.countDocuments();
    const byDiff = await LeetProblem.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    ]);
    const byTopic = await LeetProblem.aggregate([
      { $unwind: '$topics' },
      { $group: { _id: '$topics', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ total, byDifficulty: byDiff, byTopic });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
