// Defect RAG layer — embeds an incoming defect's message + stack, ranks it against
// the DefectKnowledge collection by cosine similarity, returns top matches.
// Runs fully offline using the same MiniLM pipeline as the chat/knowledge RAG.

const DefectKnowledge = require('../models/DefectKnowledge');
const { embed, cosineSim } = require('./embeddings');

/**
 * Returns the query embedding + top-k suggestions for a defect.
 * @param {string} message
 * @param {string} stack
 * @param {object} opts { k = 3, minScore = 0.3 }
 */
async function analyze(message, stack = '', opts = {}) {
  const { k = 3, minScore = 0.3 } = opts;
  const queryText = [message, stack].filter(Boolean).join('\n').slice(0, 2000);
  const queryVec = await embed(queryText);

  const kb = await DefectKnowledge.find({
    embedding: { $exists: true, $ne: [] },
  });

  if (kb.length === 0) {
    return { embedding: queryVec, suggestions: [] };
  }

  const scored = kb
    .map(e => ({ entry: e, score: cosineSim(queryVec, e.embedding) }))
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return {
    embedding: queryVec,
    suggestions: scored.map(s => ({
      problem: s.entry.problem,
      solution: s.entry.solution,
      category: s.entry.category,
      score: s.score,
      source: 'defect-knowledge',
    })),
  };
}

module.exports = { analyze };
