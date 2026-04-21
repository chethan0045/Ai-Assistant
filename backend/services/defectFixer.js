// AI-assisted defect fixer. Synthesizes a structured fix proposal from a defect's
// classification (from defectRules) + RAG suggestions (from defectRag) + the defect's
// own context (message, stack, filePath, lineNumber, source).
//
// Offline-first by design: no external LLM call. Confidence is derived from whether
// a rule matched and how strongly the top RAG hit scored, so the caller can decide
// when to trust the output vs. escalate.

const { classify } = require('./defectRules');
// Hold the module reference (not a destructured function) so tests can monkey-patch
// `defectRag.analyze` and have the change take effect on subsequent calls.
const defectRag = require('./defectRag');

// Pull fenced ```lang\n...\n``` blocks out of solution text. Used to split prose
// (goes into "steps") from code (goes into "codeSnippets").
function extractCodeBlocks(markdown) {
  if (!markdown) return { prose: '', blocks: [] };
  const blocks = [];
  let counter = 0;
  const prose = markdown.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
    blocks.push({ language: (lang || 'text').toLowerCase(), code: code.trim() });
    return `__CODEBLOCK_${counter++}__`;
  });
  return { prose, blocks };
}

// Turn a prose block into an ordered step list. Recognizes:
//   - "1. foo", "1) foo"          — numbered items
//   - "- foo", "* foo"            — bullets
//   - newline-separated sentences — fallback
function proseToSteps(prose) {
  if (!prose) return [];
  const lines = prose
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const numbered = lines.filter(l => /^\d+[.)]\s+/.test(l));
  if (numbered.length >= 2) {
    return numbered.map(l => l.replace(/^\d+[.)]\s+/, ''));
  }

  const bulleted = lines.filter(l => /^[-*]\s+/.test(l));
  if (bulleted.length >= 2) {
    return bulleted.map(l => l.replace(/^[-*]\s+/, ''));
  }

  // Fallback: split on sentence boundaries and take up to 6 non-trivial items.
  return prose
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 10)
    .slice(0, 6);
}

// Confidence scoring. Any rule match anchors at 0.4; RAG hits layer on top.
// Cap at 0.95 — we never report absolute certainty without a human in the loop.
function computeConfidence({ ruleMatched, topScore, numSuggestions }) {
  let confidence = 0.2;                         // baseline — we at least have the defect
  if (ruleMatched) confidence += 0.35;          // a rule matched — strong signal
  if (topScore) confidence += Math.min(topScore * 0.4, 0.35); // RAG contribution, capped
  if (numSuggestions >= 2) confidence += 0.05;  // cross-referencing bump
  return Math.min(0.95, Number(confidence.toFixed(2)));
}

/**
 * Produce a structured fix proposal for a defect.
 *
 * @param {object} defect  Mongoose doc or plain object with message / stack / etc.
 * @param {object} [opts]  { k?: number, minScore?: number } — passed through to RAG.
 * @returns {Promise<{
 *   summary: string,
 *   category: string,
 *   rootCause: string,
 *   steps: string[],
 *   codeSnippets: { language: string, label: string, code: string }[],
 *   confidence: number,
 *   references: { source: string, problem: string, score: number }[],
 *   ruleId: string | null,
 * }>}
 */
async function proposeFix(defect, opts = {}) {
  if (!defect || !defect.message) {
    throw new Error('proposeFix: defect.message is required');
  }

  const message = defect.message;
  const stack = defect.stack || '';

  // 1. Rule engine — deterministic, fast, offline.
  const cls = classify(message, stack);
  const ruleMatched = cls.ruleId !== null;

  // 2. RAG — semantic retrieval from the curated DefectKnowledge corpus.
  //    Re-run even if the defect already has aiSuggestions, so the proposal reflects
  //    the current KB state rather than a stale snapshot.
  const rag = await defectRag.analyze(message, stack, { k: opts.k || 3, minScore: opts.minScore || 0.3 });
  const topSuggestion = rag.suggestions[0];
  const topScore = topSuggestion ? topSuggestion.score : 0;

  // 3. Compose steps + code snippets from both sources.
  //    Rule's suggestedFix first (terse, actionable), then top RAG solution (richer context).
  const steps = [];
  const codeSnippets = [];

  if (cls.suggestedFix) {
    const { prose, blocks } = extractCodeBlocks(cls.suggestedFix);
    steps.push(...proseToSteps(prose));
    blocks.forEach((b, i) => codeSnippets.push({ ...b, label: `Rule snippet ${i + 1}` }));
  }

  rag.suggestions.forEach((s, idx) => {
    const { prose, blocks } = extractCodeBlocks(s.solution || '');
    const subSteps = proseToSteps(prose);
    if (subSteps.length) {
      steps.push(`From similar issue "${s.problem}":`);
      steps.push(...subSteps.map(x => `  ${x}`));
    } else if (s.solution) {
      steps.push(`From similar issue "${s.problem}": ${s.solution.slice(0, 200)}`);
    }
    blocks.forEach((b, i) => codeSnippets.push({ ...b, label: `From "${s.problem.slice(0, 50)}" #${i + 1}` }));
  });

  // 4. Short summary — first thing the user sees in the UI.
  const summary = ruleMatched
    ? `${cls.category.toUpperCase()} defect — ${cls.ruleId}. ${rag.suggestions.length} similar known issue(s).`
    : rag.suggestions.length
      ? `No rule matched, but ${rag.suggestions.length} semantically-similar known issue(s) found.`
      : 'No rule matched and no similar known issue found — this looks like a novel defect.';

  const confidence = computeConfidence({
    ruleMatched,
    topScore,
    numSuggestions: rag.suggestions.length,
  });

  return {
    summary,
    category: cls.category,
    ruleId: cls.ruleId,
    rootCause: cls.rootCause || (topSuggestion ? `Resembles: ${topSuggestion.problem}` : 'Root cause unclear — manual investigation needed.'),
    steps: steps.filter(Boolean),
    codeSnippets,
    confidence,
    references: rag.suggestions.map(s => ({
      source: s.source || 'defect-knowledge',
      problem: s.problem,
      score: s.score,
    })),
  };
}

module.exports = { proposeFix, extractCodeBlocks, proseToSteps, computeConfidence };
