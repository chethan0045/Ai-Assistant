const mongoose = require('mongoose');

// A captured defect — either caught by the Express error middleware
// or explicitly logged via POST /api/defects/log.
const defectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true }, // null for anonymous/server-side
  projectName: { type: String, default: '', index: true }, // opened folder / workspace the defect belongs to
  message: { type: String, required: true },
  stack: { type: String, default: '' },

  // Request context when caught from Express
  endpoint: { type: String, default: '' },
  method: { type: String, default: '' },
  statusCode: { type: Number, default: 500 },

  // Rule-engine output
  category: { type: String, default: 'unknown', index: true },
  rootCause: { type: String, default: '' },
  suggestedFix: { type: String, default: '' },

  // Where this defect came from:
  //   'runtime' — Express error middleware or frontend GlobalErrorHandler caught a live error
  //   'static'  — Project scanner flagged a code smell / bug pattern
  //   'manual'  — Explicit POST /log with a custom payload
  source: { type: String, enum: ['runtime', 'static', 'manual'], default: 'runtime', index: true },

  // Static-scan context (only populated when source === 'static')
  filePath: { type: String, default: '' },
  lineNumber: { type: Number, default: 0 },
  ruleId: { type: String, default: '' },

  // Triage
  status: { type: String, enum: ['open', 'investigating', 'fixed', 'ignored'], default: 'open', index: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },

  // Free-form tags so callers can stamp environment / service / release
  tags: [{ type: String }],

  // Jira hookup (Phase 4)
  jiraKey: { type: String, default: '' },

  // RAG (Phase 3)
  embedding: { type: [Number], default: undefined },
  aiSuggestions: [{
    problem: String,
    solution: String,
    category: String,
    score: Number,
    source: { type: String, default: 'defect-knowledge' },
  }],
  aiAnalyzedAt: { type: Date, default: null },
}, { timestamps: true });

defectSchema.index({ createdAt: -1 });
defectSchema.index({ status: 1, createdAt: -1 });
// Composite dedup key for static-scan upserts: re-scanning the same file
// shouldn't create duplicate defects for issues that haven't moved.
defectSchema.index(
  { projectName: 1, source: 1, filePath: 1, lineNumber: 1, ruleId: 1 },
  { partialFilterExpression: { source: 'static' } }
);

module.exports = mongoose.model('Defect', defectSchema);
