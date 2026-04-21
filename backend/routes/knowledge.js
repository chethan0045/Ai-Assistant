const express = require('express');
const router = express.Router();
const { KnowledgeEntry, DirectAnswer } = require('../models/Knowledge');
const { embed, cosineSim } = require('../services/embeddings');

// ===== STOP WORDS =====
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
  'at', 'by', 'from', 'as', 'into', 'about', 'between', 'through', 'up',
  'down', 'out', 'off', 'over', 'under', 'again', 'then', 'once', 'how',
  'what', 'when', 'where', 'why', 'who', 'which', 'all', 'each', 'every',
  'some', 'no', 'not', 'only', 'so', 'than', 'too', 'very', 'just', 'it',
  'its', 'i', 'me', 'my', 'we', 'you', 'your', 'he', 'she', 'they', 'them',
  'this', 'that', 'these', 'and', 'but', 'or', 'if', 'get', 'got', 'give',
  'make', 'take', 'tell', 'know', 'known', 'want', 'need', 'use', 'try', 'let', 'please',
]);

function extractKeywords(text) {
  return text.toLowerCase().replace(/[?!.,;:'"(){}[\]]/g, '')
    .split(/\s+/).filter(w => w.length >= 2 && !STOP_WORDS.has(w));
}

// ===== LIST ALL ENTRIES =====
router.get('/entries', async (req, res) => {
  try {
    const { category, limit = 50 } = req.query;
    const filter = category ? { category: new RegExp(category, 'i') } : {};
    const entries = await KnowledgeEntry.find(filter)
      .select('topic category title summary keywords related')
      .limit(Number(limit))
      .sort({ category: 1, topic: 1 });
    res.json({ count: entries.length, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GET SINGLE ENTRY =====
router.get('/entries/:topic', async (req, res) => {
  try {
    const entry = await KnowledgeEntry.findOne({ topic: req.params.topic.toLowerCase() });
    if (!entry) return res.status(404).json({ error: 'Topic not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== LIST CATEGORIES =====
router.get('/categories', async (req, res) => {
  try {
    const categories = await KnowledgeEntry.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, topics: { $push: '$title' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ categories: categories.map(c => ({ name: c._id, count: c.count, topics: c.topics })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SEARCH =====
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    if (!q) return res.status(400).json({ error: 'q parameter required' });

    const query = q.toString().toLowerCase().trim();
    const keywords = extractKeywords(query);

    // 1. Try exact topic match
    const exact = await KnowledgeEntry.findOne({ topic: query });
    if (exact) return res.json({ results: [exact], source: 'exact' });

    // 2. Try keyword match
    if (keywords.length > 0) {
      const keywordResults = await KnowledgeEntry.find({
        keywords: { $in: keywords }
      }).limit(Number(limit));
      if (keywordResults.length > 0) {
        // Score by how many keywords match
        const scored = keywordResults.map(entry => {
          let score = 0;
          for (const kw of keywords) {
            if (entry.keywords.includes(kw)) score += 25;
            if (entry.topic.includes(kw)) score += 20;
            if (entry.title.toLowerCase().includes(kw)) score += 15;
          }
          return { entry, score };
        }).sort((a, b) => b.score - a.score);
        return res.json({ results: scored.map(s => s.entry), source: 'keyword' });
      }
    }

    // 3. Try text search
    const textResults = await KnowledgeEntry.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(Number(limit));
    if (textResults.length > 0) {
      return res.json({ results: textResults, source: 'text' });
    }

    // 4. No results
    res.json({ results: [], source: 'none' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== VECTOR SEARCH (RAG retrieval) =====
// Embeds query with MiniLM, ranks KB entries by cosine similarity in-app.
// Scales fine for a few thousand docs; swap for Atlas $vectorSearch if KB grows.
router.get('/search-vector', async (req, res) => {
  try {
    const { q, limit = 5, minScore = 0.3 } = req.query;
    if (!q) return res.status(400).json({ error: 'q parameter required' });

    const queryVec = await embed(q.toString());
    const entries = await KnowledgeEntry.find({ embedding: { $exists: true, $ne: [] } });

    const scored = entries
      .map(e => ({ entry: e, score: cosineSim(queryVec, e.embedding) }))
      .filter(s => s.score >= Number(minScore))
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(limit));

    res.json({
      results: scored.map(s => ({
        topic: s.entry.topic,
        category: s.entry.category,
        title: s.entry.title,
        summary: s.entry.summary,
        details: s.entry.details,
        examples: s.entry.examples,
        related: s.entry.related,
        score: s.score,
      })),
      count: scored.length,
      source: 'vector',
    });
  } catch (err) {
    console.error('Vector search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== RAG ANSWER =====
// Retrieves top-k semantically similar entries, composes an answer from them.
router.post('/rag-answer', async (req, res) => {
  try {
    const { question, k = 3 } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    const queryVec = await embed(question);
    const entries = await KnowledgeEntry.find({ embedding: { $exists: true, $ne: [] } });
    if (entries.length === 0) {
      return res.json({ answer: '', context: [], source: 'vector_empty' });
    }

    const ranked = entries
      .map(e => ({ entry: e, score: cosineSim(queryVec, e.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(k));

    const top = ranked[0];
    if (!top || top.score < 0.25) {
      return res.json({ answer: '', context: [], source: 'vector_low_confidence', topScore: top?.score ?? 0 });
    }

    const e = top.entry;
    let answer = `**${e.title}**\n\n${e.summary}\n\n${e.details}`;
    if (e.examples?.length) answer += '\n\n' + e.examples[0];

    const supporting = ranked.slice(1).filter(r => r.score >= 0.35);
    if (supporting.length > 0) {
      answer += `\n\n---\n*Related: ${supporting.map(s => s.entry.title).join(', ')}*`;
    }

    res.json({
      answer,
      topic: e.topic,
      source: 'vector',
      context: ranked.map(r => ({ topic: r.entry.topic, title: r.entry.title, score: r.score })),
    });
  } catch (err) {
    console.error('RAG answer error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== ANSWER A QUESTION =====
router.post('/answer', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    const q = question.toLowerCase().trim();

    // 1. Check greetings
    if (/^(hi|hello|hey|good morning|good evening|sup|yo)\b/.test(q)) {
      const cats = await KnowledgeEntry.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      return res.json({
        answer: `Hello! I'm your AI assistant. I can answer questions about:\n\n${cats.map(c => `- **${c._id}** (${c.count} topics)`).join('\n')}\n\nTry: "What is JavaScript?", "How to check Angular version", "Explain REST API"`,
        source: 'greeting',
      });
    }

    // 2a. Check direct answers — regex first (fast, exact, deterministic).
    const directAnswers = await DirectAnswer.find().sort({ priority: -1 });
    for (const da of directAnswers) {
      for (const pattern of da.patterns) {
        try {
          if (new RegExp(pattern, 'i').test(q)) {
            return res.json({ answer: da.answer, topic: da.topic, source: 'direct-regex' });
          }
        } catch {}
      }
    }

    // 2b. Semantic fallback over the same DirectAnswer pool. This catches
    // paraphrases that regex misses — e.g. "how can I verify angular version
    // installed" matching the DirectAnswer whose regex was `angular.*version`.
    // Threshold 0.55 is conservative enough that unrelated queries don't
    // hijack the answer; they fall through to the keyword/RAG layers below.
    try {
      const queryVec = await embed(q);
      const withEmbeddings = directAnswers.filter(da => Array.isArray(da.embedding) && da.embedding.length);
      if (withEmbeddings.length) {
        let best = null;
        let bestScore = 0;
        for (const da of withEmbeddings) {
          const s = cosineSim(queryVec, da.embedding);
          if (s > bestScore) { best = da; bestScore = s; }
        }
        if (best && bestScore >= 0.55) {
          return res.json({
            answer: best.answer,
            topic: best.topic,
            source: 'direct-semantic',
            score: Number(bestScore.toFixed(3)),
            matchedQuestion: best.question || undefined,
          });
        }
      }
    } catch (embedErr) {
      // Embedding failure isn't fatal — just fall through to keyword search below.
      console.warn('[knowledge/answer] semantic direct-answer lookup failed:', embedErr.message);
    }

    // 3. Strip question wrapper
    let topic = q
      .replace(/^(what is|what's|what are|explain|describe|tell me about|define|show me|teach me)\s+(a |an |the )?/i, '')
      .replace(/^(how to|how do i|how can i)\s+/i, '')
      .replace(/^(basics of|fundamentals of|intro to)\s+/i, '')
      .replace(/[?!.]+$/g, '').trim();

    // 4. Search knowledge base
    const keywords = extractKeywords(topic);

    // Try exact topic first
    let entry = await KnowledgeEntry.findOne({ topic: topic.replace(/\s+/g, '-') });
    if (!entry) entry = await KnowledgeEntry.findOne({ topic });

    // Try keyword match
    if (!entry && keywords.length > 0) {
      const matches = await KnowledgeEntry.find({ keywords: { $in: keywords } });
      if (matches.length > 0) {
        // Score
        let best = null, bestScore = 0;
        for (const m of matches) {
          let score = 0;
          for (const kw of keywords) {
            if (m.keywords.includes(kw)) score += 25;
            if (m.topic.includes(kw)) score += 20;
            if (m.title.toLowerCase().split(/\s+/).includes(kw)) score += 15;
          }
          if (score > bestScore) { best = m; bestScore = score; }
        }
        if (bestScore >= 25) entry = best;
      }
    }

    // Try text search as fallback
    if (!entry) {
      const textResults = await KnowledgeEntry.find(
        { $text: { $search: topic } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(1);
      if (textResults.length > 0) entry = textResults[0];
    }

    if (entry) {
      // Format response
      const isBroad = q.startsWith('what') || keywords.length <= 2;
      let answer = `**${entry.title}**\n\n${entry.summary}\n\n`;
      if (isBroad) {
        // Show first 2 sections of details
        const sections = entry.details.split(/(?=^##\s)/m);
        answer += sections.slice(0, 2).join('\n');
      } else {
        // Find matching section
        const sections = entry.details.split(/(?=^##\s)/m);
        let best = sections[0];
        let bestScore = 0;
        for (const s of sections) {
          let sc = 0;
          const sl = s.toLowerCase();
          for (const kw of keywords) { if (sl.includes(kw)) sc += 10; }
          if (sc > bestScore) { best = s; bestScore = sc; }
        }
        answer += best;
      }
      if (entry.examples?.length > 0) answer += '\n\n' + entry.examples[0];
      if (entry.related?.length > 0) {
        answer += `\n\n---\n*Related: ${entry.related.join(', ')}*`;
      }
      return res.json({ answer, topic: entry.topic, source: 'knowledge' });
    }

    // 5. Not found
    const allCats = await KnowledgeEntry.aggregate([
      { $group: { _id: '$category', topics: { $push: '$title' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({
      answer: `I don't have information about **"${question}"**.\n\nI can help with:\n${allCats.map(c => `- **${c._id}**: ${c.topics.slice(0, 4).join(', ')}`).join('\n')}\n\nTry: "What is JavaScript?", "Explain Angular routing", "How to send email"`,
      source: 'not_found',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== STATS =====
router.get('/stats', async (req, res) => {
  try {
    const entryCount = await KnowledgeEntry.countDocuments();
    const answerCount = await DirectAnswer.countDocuments();
    const categories = await KnowledgeEntry.distinct('category');
    const totalKeywords = await KnowledgeEntry.aggregate([
      { $project: { kwCount: { $size: '$keywords' } } },
      { $group: { _id: null, total: { $sum: '$kwCount' } } },
    ]);
    res.json({
      entries: entryCount,
      directAnswers: answerCount,
      categories: categories.length,
      categoryList: categories,
      totalKeywords: totalKeywords[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GENERATE CODE =====
// Takes user request, pulls relevant KB patterns, assembles production code.
// RULES: reuse patterns, no random code, include validation + error handling + security.
router.post('/generate-code', async (req, res) => {
  try {
    const { request } = req.body;
    if (!request) return res.status(400).json({ error: 'request required' });

    const query = request.toLowerCase().trim();
    const keywords = extractKeywords(query);

    // Fetch relevant knowledge entries
    const relevant = new Map();

    // 1. Find entries matching user intent
    if (keywords.length > 0) {
      const matches = await KnowledgeEntry.find({ keywords: { $in: keywords } }).limit(8);
      for (const m of matches) {
        let score = 0;
        for (const kw of keywords) {
          if (m.keywords.includes(kw)) score += 25;
          if (m.topic.includes(kw)) score += 15;
          if (m.title.toLowerCase().includes(kw)) score += 10;
        }
        if (score > 0) relevant.set(m.topic, { entry: m, score });
      }
    }

    // 2. Auto-include companion patterns based on intent
    const companions = detectCompanions(query);
    for (const topic of companions) {
      if (!relevant.has(topic)) {
        const comp = await KnowledgeEntry.findOne({ topic });
        if (comp) relevant.set(topic, { entry: comp, score: 20 });
      }
    }

    // 3. Add "security" + "error-handling" as always-relevant
    for (const topic of ['security', 'error-handling', 'common-bugs']) {
      if (!relevant.has(topic)) {
        const comp = await KnowledgeEntry.findOne({ topic });
        if (comp) relevant.set(topic, { entry: comp, score: 5 });
      }
    }

    if (relevant.size === 0) {
      return res.json({
        code: '',
        patterns_used: [],
        message: 'No matching patterns found in knowledge base. Try more specific terms (e.g., "angular login", "express auth", "mongoose schema").',
      });
    }

    // Rank by score
    const ranked = Array.from(relevant.values())
      .sort((a, b) => b.score - a.score)
      .map(r => r.entry);

    // Generate structured code response
    const primary = ranked[0];
    const supporting = ranked.slice(1, 5);

    let output = `# ${primary.title}\n\n`;
    output += `${primary.summary}\n\n`;
    output += `## Implementation\n\n${primary.details}\n\n`;

    if (primary.examples && primary.examples.length > 0) {
      output += `## Examples\n\n${primary.examples.join('\n\n')}\n\n`;
    }

    if (supporting.length > 0) {
      output += `## Supporting Patterns\n\n`;
      for (const s of supporting) {
        output += `### ${s.title}\n${s.summary}\n\n`;
        // Extract first code section from details
        const codeMatch = s.details.match(/```[\s\S]+?```/);
        if (codeMatch) output += codeMatch[0] + '\n\n';
      }
    }

    output += `## Security & Error Handling Checklist\n`;
    output += `- ✅ Input validation on all user inputs\n`;
    output += `- ✅ Try/catch wrapping async operations\n`;
    output += `- ✅ Proper HTTP status codes (400/401/403/404/409/500)\n`;
    output += `- ✅ JWT tokens for authentication (not sessions)\n`;
    output += `- ✅ bcrypt for password hashing (cost factor 10)\n`;
    output += `- ✅ CORS configured for frontend origin\n`;
    output += `- ✅ Never expose error stack traces in production\n`;
    output += `- ✅ Environment variables for secrets (never hardcoded)\n`;

    res.json({
      code: output,
      patterns_used: ranked.map(r => ({ topic: r.topic, title: r.title, category: r.category })),
      primary_pattern: primary.topic,
      companions: companions,
    });
  } catch (err) {
    console.error('Generate code error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Detect which additional patterns should be included based on intent
function detectCompanions(query) {
  const companions = [];
  if (query.includes('login') || query.includes('auth') || query.includes('signup') || query.includes('register')) {
    companions.push('express-auth-routes', 'express-user-model', 'angular-auth-service', 'security');
  }
  if (query.includes('otp') || query.includes('verify email') || query.includes('verification')) {
    companions.push('otp-verification', 'nodemailer');
  }
  if (query.includes('crud') || query.includes('api') || query.includes('rest')) {
    companions.push('express-crud-routes', 'angular-crud-service', 'api');
  }
  if (query.includes('angular') && (query.includes('form') || query.includes('validation'))) {
    companions.push('angular-forms', 'error-handling');
  }
  if (query.includes('fullstack') || query.includes('full stack') || (query.includes('angular') && query.includes('express'))) {
    companions.push('fullstack-project-complete', 'angular-auth-interceptor');
  }
  return companions;
}

module.exports = router;
