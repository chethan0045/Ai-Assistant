const mongoose = require('mongoose');

const leetProblemSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true, index: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  topics: [{ type: String }], // e.g. ['array', 'hash-table']
  description: { type: String, required: true },
  keywords: [{ type: String, lowercase: true }],
  signatures: [{ type: String }], // regex strings
  complexity: {
    time: { type: String, required: true },
    space: { type: String, required: true },
  },
  approach: { type: String, required: true },
  code: { type: String, required: true },
  tests: { type: String, default: '' },
  relatedNumbers: [{ type: Number }],
  // Vector representation for cross-collection semantic search. Built from
  // number/title/topics/keywords + description preview. Filled lazily by
  // backfill-embeddings.js or on-demand by seeds.
  embedding: { type: [Number], default: undefined },
}, { timestamps: true });

leetProblemSchema.index({ title: 'text', description: 'text', keywords: 'text' });

module.exports = mongoose.model('LeetProblem', leetProblemSchema);
