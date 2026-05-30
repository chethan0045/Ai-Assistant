const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { KnowledgeEntry, DirectAnswer } = require('../models/Knowledge');
const LeetProblem = require('../models/LeetProblem');
const ProjectBlueprint = require('../models/ProjectBlueprint');
const { embed, cosineSim } = require('../services/embeddings');
const { CloudAIService } = require('../cloud-ai.service');
const cloudAi = new CloudAIService();

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

// ===== GENERATE CODE (SEMANTIC) =====
// Cross-collection vector search. Ranks hits from KnowledgeEntry AND LeetProblem
// by cosine similarity against the same MiniLM query vector, then renders the
// top hit in its native shape — patterns use summary/details/examples, algorithm
// problems use approach/code/complexity/tests. Avoids needing a KnowledgeEntry
// twin per LeetCode problem.
router.post('/generate-code-semantic', async (req, res) => {
  try {
    const { request, k = 5, minScore = 0.3, language: rawLang } = req.body;
    if (!request) return res.status(400).json({ error: 'request required' });

    // Accept 'javascript' / 'js' / 'c' / 'cpp' / 'c++' / 'python' / 'py' etc.
    const language = normalizeLanguage(rawLang) || detectLanguageInQuery(request);

    const query = request.toString().trim();
    const queryVec = await embed(query);

    const [kbEntries, leetEntries] = await Promise.all([
      KnowledgeEntry.find({ embedding: { $exists: true, $ne: [] } }),
      LeetProblem.find({ embedding: { $exists: true, $ne: [] } }),
    ]);

    if (kbEntries.length === 0 && leetEntries.length === 0) {
      return res.json({
        code: '',
        patterns_used: [],
        message: 'No embedded entries found in KnowledgeEntry or LeetProblem. Run: node backfill-embeddings.js',
      });
    }

    const kbScored = kbEntries.map(e => ({
      source: 'knowledge', entry: e, score: cosineSim(queryVec, e.embedding),
    }));
    const leetScored = leetEntries.map(e => ({
      source: 'leetcode', entry: e, score: cosineSim(queryVec, e.embedding),
    }));

    const ranked = [...kbScored, ...leetScored]
      .filter(s => s.score >= Number(minScore))
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(k));

    if (ranked.length === 0) {
      const topMiss = [...kbScored, ...leetScored].sort((a, b) => b.score - a.score)[0];
      return res.json({
        code: '',
        patterns_used: [],
        topScore: topMiss?.score ?? 0,
        message: 'No semantically similar entries found. Try rephrasing or lower minScore.',
      });
    }

    const top = ranked[0];
    let output;

    if (top.source === 'leetcode') {
      // Algorithm answer — render code/approach/complexity directly.
      const p = top.entry;
      const variant = pickCodeVariant(p, language);
      output = `# #${p.number} ${p.title} (${p.difficulty})\n\n`;
      if (p.topics?.length) output += `**Topics:** ${p.topics.join(', ')}\n\n`;
      output += `${p.description}\n\n`;
      output += `## Approach\n\n${p.approach}\n\n`;
      output += `## Complexity\n\n- Time: ${p.complexity.time}\n- Space: ${p.complexity.space}\n\n`;
      output += `## Code (${variant.language})\n\n\`\`\`${codeFence(variant.language)}\n${variant.code}\n\`\`\`\n\n`;
      if (variant.tests) output += `## Tests\n\n\`\`\`${codeFence(variant.language)}\n${variant.tests}\n\`\`\`\n\n`;
      if (variant.requested && variant.requested !== variant.language) {
        output += `> Note: ${variant.requested} variant not yet seeded for this problem — showing ${variant.language}.\n\n`;
      }
      if (p.codes?.length) {
        const langs = ['javascript', ...p.codes.map(c => c.language)];
        output += `## Available Languages\n${Array.from(new Set(langs)).join(', ')}\n\n`;
      }

      const related = ranked.slice(1).filter(r => r.source === 'leetcode').slice(0, 3);
      if (related.length) {
        output += `## Related Problems\n`;
        for (const r of related) {
          output += `- #${r.entry.number} ${r.entry.title} (${r.entry.difficulty})\n`;
        }
      }
    } else {
      // KB-pattern answer — render summary/details/examples, fold in security baselines.
      const primary = top.entry;
      const supporting = ranked.slice(1, 5)
        .filter(r => r.source === 'knowledge')
        .map(r => r.entry);

      output = `# ${primary.title}\n\n${primary.summary}\n\n## Implementation\n\n${primary.details}\n\n`;
      if (primary.examples?.length) {
        output += `## Examples\n\n${primary.examples.join('\n\n')}\n\n`;
      }
      if (supporting.length) {
        output += `## Supporting Patterns\n\n`;
        for (const s of supporting) {
          output += `### ${s.title}\n${s.summary}\n\n`;
          const codeMatch = s.details.match(/```[\s\S]+?```/);
          if (codeMatch) output += codeMatch[0] + '\n\n';
        }
      }
      output += `## Security & Error Handling Checklist\n`;
      output += `- Input validation on all user inputs\n`;
      output += `- Try/catch wrapping async operations\n`;
      output += `- Proper HTTP status codes (400/401/403/404/409/500)\n`;
      output += `- JWT tokens for authentication (not sessions)\n`;
      output += `- bcrypt for password hashing (cost factor 10)\n`;
      output += `- CORS configured for frontend origin\n`;
      output += `- Never expose error stack traces in production\n`;
      output += `- Environment variables for secrets (never hardcoded)\n`;
    }

    res.json({
      code: output,
      source: 'vector',
      primary_source: top.source,
      primary_pattern: top.source === 'leetcode'
        ? `leetcode-${top.entry.number}`
        : top.entry.topic,
      topScore: Number(top.score.toFixed(3)),
      patterns_used: ranked.map(r => ({
        source: r.source,
        topic: r.source === 'leetcode' ? `leetcode-${r.entry.number}` : r.entry.topic,
        title: r.source === 'leetcode'
          ? `#${r.entry.number} ${r.entry.title}`
          : r.entry.title,
        category: r.source === 'leetcode' ? r.entry.difficulty : r.entry.category,
        score: Number(r.score.toFixed(3)),
      })),
    });
  } catch (err) {
    console.error('Generate code (semantic) error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== GENERATE CODE (RAG + LLM) =====
// Full pipeline: retrieve similar problems by vector similarity, build a context
// block, hand to DeepSeek to synthesize NEW code. Falls back to pure retrieval
// when no API key is set so the offline path still works.
//
// Body: { request, k = 4, minScore = 0.25, language = 'javascript' }
// Response: { generated, retrieved, fallback?, model }
router.post('/generate-code-rag', async (req, res) => {
  try {
    const {
      request,
      k = 4,
      minScore = 0.25,
      language: rawLang,
    } = req.body;
    if (!request) return res.status(400).json({ error: 'request required' });

    const query = request.toString().trim();
    const language = normalizeLanguage(rawLang) || detectLanguageInQuery(query) || 'javascript';
    const queryVec = await embed(query);

    const [kbEntries, leetEntries] = await Promise.all([
      KnowledgeEntry.find({ embedding: { $exists: true, $ne: [] } }),
      LeetProblem.find({ embedding: { $exists: true, $ne: [] } }),
    ]);

    const scored = [
      ...kbEntries.map(e => ({ source: 'knowledge', entry: e, score: cosineSim(queryVec, e.embedding) })),
      ...leetEntries.map(e => ({ source: 'leetcode', entry: e, score: cosineSim(queryVec, e.embedding) })),
    ].filter(s => s.score >= Number(minScore))
     .sort((a, b) => b.score - a.score)
     .slice(0, Number(k));

    const retrieved = scored.map(s => ({
      source: s.source,
      title: s.source === 'leetcode' ? `#${s.entry.number} ${s.entry.title}` : s.entry.title,
      score: Number(s.score.toFixed(3)),
      category: s.source === 'leetcode' ? s.entry.difficulty : s.entry.category,
    }));

    // --- Offline fallback path ---
    if (!cloudAi.getStatus().ready) {
      return res.json({
        generated: '',
        retrieved,
        fallback: 'no_api_key',
        message: 'No LLM API key set. Set GEMINI_API_KEY (https://aistudio.google.com/app/apikey) or DEEPSEEK_API_KEY, or POST /api/ai/set-key to enable generation. Until then, use /generate-code-semantic for pure retrieval.',
      });
    }

    // --- Build context block from retrieved entries ---
    // Use the variant matching the requested language when available; otherwise
    // include JS as the reference (the LLM is told to translate).
    const contextBlocks = scored.map(s => {
      if (s.source === 'leetcode') {
        const p = s.entry;
        const variant = pickCodeVariant(p, language);
        return `### Reference: #${p.number} ${p.title} (${p.difficulty})
Topics: ${(p.topics || []).join(', ')}
Approach: ${p.approach}
Complexity: time ${p.complexity.time}, space ${p.complexity.space}
Reference code (${variant.language}):
\`\`\`${codeFence(variant.language)}
${variant.code}
\`\`\``;
      }
      const e = s.entry;
      return `### Reference: ${e.title}
Category: ${e.category}
Summary: ${e.summary}
Details: ${e.details.slice(0, 1200)}`;
    }).join('\n\n');

    const systemPrompt = `You are an expert software engineer. Use the reference material below as inspiration — adapt patterns, don't copy blindly. Produce clean, correct, idiomatic ${language} code.

Output exactly these sections in markdown:
1. **Approach** — 2-4 sentence explanation
2. **Complexity** — time and space
3. **Code** — one fenced \`\`\`${language} block with a complete, runnable solution
4. **Tests** — a second fenced block with example calls + expected outputs

Do not invent problem details that weren't asked for. If the reference is not relevant, ignore it.`;

    const userPrompt = contextBlocks
      ? `Reference material from our knowledge base:\n\n${contextBlocks}\n\n---\n\nNow solve this request:\n"${query}"`
      : `Solve this request:\n"${query}"`;

    let generated;
    try {
      generated = await cloudAi.complete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.2, maxTokens: 2048 },
      );
    } catch (err) {
      return res.status(502).json({
        error: 'LLM call failed',
        detail: err.message,
        retrieved,
      });
    }

    res.json({
      generated,
      retrieved,
      model: cloudAi.model,
      source: 'rag+llm',
      topScore: scored[0]?.score ? Number(scored[0].score.toFixed(3)) : 0,
    });
  } catch (err) {
    console.error('Generate code (RAG) error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== SEARCH BLUEPRINTS (vector retrieval only, no file writing) =====
// Use this to preview which blueprint generate-project would pick, or to browse
// blueprints ranked by how well they match a free-form description.
router.get('/search-blueprints', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.status(400).json({ error: 'q parameter required' });
    const k = Math.min(Math.max(Number(req.query.k) || 5, 1), 20);
    const minScore = Number(req.query.minScore) || 0.2;
    const includeFiles = req.query.includeFiles === '1' || req.query.includeFiles === 'true';

    const queryVec = await embed(q);
    const all = await ProjectBlueprint.find({ embedding: { $exists: true, $ne: [] } });
    if (all.length === 0) {
      return res.json({ query: q, count: 0, results: [], message: 'No embedded blueprints. Run seed-project-blueprints.js + backfill-embeddings.js.' });
    }
    const scored = all
      .map(b => ({ b, score: cosineSim(queryVec, b.embedding) }))
      .filter(s => s.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    res.json({
      query: q,
      count: scored.length,
      results: scored.map(s => ({
        slug: s.b.slug,
        title: s.b.title,
        description: s.b.description,
        stack: s.b.stack,
        keywords: s.b.keywords,
        fileCount: (s.b.files || []).length,
        files: includeFiles ? s.b.files.map(f => ({ path: f.path, bytes: f.content?.length || 0 })) : undefined,
        instructions: s.b.instructions,
        score: Number(s.score.toFixed(3)),
      })),
    });
  } catch (err) {
    console.error('Search blueprints error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== GENERATE PROJECT =====
// Retrieve the best-matching ProjectBlueprint, then write files under
// targetPath/projectName. When DEEPSEEK_API_KEY is set, the blueprint is used
// as context and DeepSeek is asked to emit the full file set tailored to the
// request; otherwise the blueprint's skeleton files are written verbatim.
//
// Body: { description, projectName, targetPath, useLLM? = true, k? = 3 }
router.post('/generate-project', async (req, res) => {
  try {
    const { description, projectName, targetPath, useLLM = true, k = 3 } = req.body;
    if (!description) return res.status(400).json({ error: 'description required' });
    if (!projectName || !/^[\w\-. ]{1,80}$/.test(projectName)) {
      return res.status(400).json({ error: 'projectName must be 1-80 safe chars (alnum, _-.space)' });
    }
    if (!targetPath) return res.status(400).json({ error: 'targetPath required' });

    // Validate target directory.
    let stat;
    try { stat = await fs.promises.stat(targetPath); }
    catch { return res.status(400).json({ error: 'targetPath does not exist' }); }
    if (!stat.isDirectory()) return res.status(400).json({ error: 'targetPath must be a directory' });

    const projectPath = path.join(targetPath, projectName);
    // Refuse to overwrite existing non-empty dir.
    if (fs.existsSync(projectPath)) {
      const entries = await fs.promises.readdir(projectPath);
      if (entries.length > 0) return res.status(409).json({ error: 'Target path already exists and is not empty' });
    } else {
      await fs.promises.mkdir(projectPath, { recursive: true });
    }

    // Retrieve top-k blueprints.
    const queryVec = await embed(description);
    const all = await ProjectBlueprint.find({ embedding: { $exists: true, $ne: [] } });
    if (all.length === 0) {
      return res.status(503).json({
        error: 'No blueprints with embeddings. Run: node seed-project-blueprints.js && node backfill-embeddings.js',
      });
    }
    const scored = all.map(b => ({ b, score: cosineSim(queryVec, b.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(k));

    const top = scored[0];
    if (!top || top.score < 0.2) {
      return res.json({
        success: false,
        message: 'No blueprint close enough to the request.',
        topScore: top?.score ?? 0,
        candidates: scored.map(s => ({ slug: s.b.slug, title: s.b.title, score: s.score })),
      });
    }

    // Choose file set: LLM-expanded or blueprint skeletons.
    let files = top.b.files;
    let usedLLM = false;
    let llmError = null;

    if (useLLM && cloudAi.getStatus().ready) {
      const blueprintContext = top.b.files.map(f => `FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');
      const sys = `You are an expert software engineer. Given a project blueprint and a user description, produce a complete, runnable multi-file project.

Output ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{"files":[{"path":"relative/path","content":"full file contents"}, ...]}

Rules:
- Paths are relative, POSIX-style (forward slashes).
- No absolute paths, no path traversal (no "..").
- Include every file the project needs to run (package.json, server/entry files, configs).
- Match the stack of the blueprint unless the description overrides it.
- Keep dependency versions close to those in the blueprint's package.json.`;
      const user = `Project name: ${projectName}
User request: ${description}

Blueprint: ${top.b.title}
Stack: ${(top.b.stack || []).join(', ')}
Description: ${top.b.description}

Blueprint skeleton files (adapt as needed):
${blueprintContext}`;

      try {
        const raw = await cloudAi.complete(
          [{ role: 'system', content: sys }, { role: 'user', content: user }],
          { temperature: 0.25, maxTokens: 8192 },
        );
        // Strip accidental markdown fences.
        const jsonStr = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed.files) && parsed.files.length > 0) {
          files = parsed.files;
          usedLLM = true;
        }
      } catch (err) {
        llmError = err.message;
        // Fall through — we'll write the blueprint skeletons instead.
      }
    }

    // Write every file, guarding against path traversal.
    const written = [];
    const skipped = [];
    for (const f of files) {
      if (!f || typeof f.path !== 'string' || typeof f.content !== 'string') {
        skipped.push({ reason: 'bad shape', file: f?.path });
        continue;
      }
      const rel = f.path.replace(/\\/g, '/').replace(/^\/+/, '');
      if (rel.includes('..') || path.isAbsolute(rel)) {
        skipped.push({ reason: 'unsafe path', file: f.path });
        continue;
      }
      const full = path.join(projectPath, rel);
      if (!full.startsWith(projectPath)) {
        skipped.push({ reason: 'escape attempt', file: f.path });
        continue;
      }
      await fs.promises.mkdir(path.dirname(full), { recursive: true });
      await fs.promises.writeFile(full, f.content, 'utf-8');
      written.push(rel);
    }

    res.json({
      success: true,
      projectPath,
      filesWritten: written,
      skipped,
      usedLLM,
      llmError,
      blueprint: {
        slug: top.b.slug,
        title: top.b.title,
        score: Number(top.score.toFixed(3)),
        instructions: top.b.instructions,
      },
      candidates: scored.map(s => ({ slug: s.b.slug, title: s.b.title, score: Number(s.score.toFixed(3)) })),
    });
  } catch (err) {
    console.error('Generate project error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----- Language helpers ---------------------------------------------------
const LANG_ALIASES = {
  js: 'javascript', javascript: 'javascript', node: 'javascript', nodejs: 'javascript',
  ts: 'typescript', typescript: 'typescript',
  c: 'c',
  cpp: 'cpp', 'c++': 'cpp', cxx: 'cpp', 'cplusplus': 'cpp',
  py: 'python', python: 'python',
  java: 'java',
};
function normalizeLanguage(raw) {
  if (!raw) return null;
  const k = raw.toString().toLowerCase().trim().replace(/\s+/g, '');
  return LANG_ALIASES[k] || null;
}
function detectLanguageInQuery(q) {
  const s = q.toLowerCase();
  if (/\bc\+\+|\bcpp\b|\bcplusplus/.test(s)) return 'cpp';
  if (/\bin\s+c\b|\bc\s+code\b|\b\.c\b/.test(s)) return 'c';
  if (/\bjavascript\b|\bjs\b|\bnode\b/.test(s)) return 'javascript';
  if (/\btypescript\b|\bts\b/.test(s)) return 'typescript';
  if (/\bpython\b|\bpy\b/.test(s)) return 'python';
  if (/\bjava\b/.test(s)) return 'java';
  return null;
}
// Pick the best code variant for a problem given the requested language.
// Returns { language, code, tests, requested } — `requested` is the caller's
// asked-for language even if we fell back (so the caller can tell the user).
function pickCodeVariant(problem, requestedLang) {
  const req = requestedLang || 'javascript';
  // Requested JS (or no preference) — use the top-level code field.
  if (req === 'javascript') {
    return { language: 'javascript', code: problem.code, tests: problem.tests || '', requested: req };
  }
  // Look in codes array for an exact match.
  const hit = (problem.codes || []).find(c => c.language === req);
  if (hit) return { language: hit.language, code: hit.code, tests: hit.tests || '', requested: req };
  // Fall back to JavaScript so the user still gets an answer.
  return { language: 'javascript', code: problem.code, tests: problem.tests || '', requested: req };
}
// Map internal language key to markdown code-fence identifier.
function codeFence(lang) {
  const map = { javascript: 'javascript', typescript: 'typescript', c: 'c', cpp: 'cpp', python: 'python', java: 'java' };
  return map[lang] || lang;
}

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
