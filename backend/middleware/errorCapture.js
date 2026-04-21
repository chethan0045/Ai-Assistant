// Express error-capture middleware. Mount LAST (after all route mounts), so any
// thrown/next(err)'d error in upstream handlers lands here. Persists the defect
// and re-throws the response to the client.

const jwt = require('jsonwebtoken');
const Defect = require('../models/Defect');
const { classify } = require('../services/defectRules');
const { analyze } = require('../services/defectRag');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-app-secret-key-2024';

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

function errorCapture() {
  return async (err, req, res, next) => {
    // Persist best-effort. Never let a logging failure mask the original error.
    let savedId = null;
    try {
      const cls = classify(err?.message || '', err?.stack || '');
      const saved = await Defect.create({
        userId: extractUserId(req),
        message: err?.message || 'Unknown error',
        stack: err?.stack || '',
        endpoint: req.originalUrl || req.url || '',
        method: req.method || '',
        statusCode: err?.status || err?.statusCode || 500,
        category: cls.category,
        rootCause: cls.rootCause,
        suggestedFix: cls.suggestedFix,
        severity: cls.severity,
      });
      savedId = saved._id;
    } catch (logErr) {
      console.error('[defect-logger] failed to persist:', logErr.message);
    }

    // Background RAG analysis — doesn't block the error response.
    if (savedId) {
      analyze(err?.message || '', err?.stack || '').then(r => {
        return Defect.findByIdAndUpdate(savedId, {
          embedding: r.embedding,
          aiSuggestions: r.suggestions,
          aiAnalyzedAt: new Date(),
        });
      }).catch(rerr => console.warn('[defect-rag] background analysis failed:', rerr.message));
    }

    if (res.headersSent) return next(err);
    res.status(err?.status || err?.statusCode || 500).json({
      error: err?.message || 'Internal server error',
    });
  };
}

module.exports = { errorCapture };
