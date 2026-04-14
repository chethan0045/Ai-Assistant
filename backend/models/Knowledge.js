const mongoose = require('mongoose');

const knowledgeEntrySchema = new mongoose.Schema({
  topic: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  category: { type: String, required: true, trim: true, index: true },
  keywords: [{ type: String, lowercase: true, trim: true }],
  title: { type: String, required: true, trim: true },
  summary: { type: String, required: true },
  details: { type: String, required: true },
  examples: [{ type: String }],
  related: [{ type: String }],
}, { timestamps: true });

// Text index for full-text search
knowledgeEntrySchema.index({ title: 'text', summary: 'text', keywords: 'text', topic: 'text' });

const directAnswerSchema = new mongoose.Schema({
  patterns: [{ type: String, required: true }], // stored as regex strings
  answer: { type: String, required: true },
  topic: { type: String, default: '', index: true },
  priority: { type: Number, default: 0 }, // higher = checked first
}, { timestamps: true });

const KnowledgeEntry = mongoose.model('KnowledgeEntry', knowledgeEntrySchema);
const DirectAnswer = mongoose.model('DirectAnswer', directAnswerSchema);

module.exports = { KnowledgeEntry, DirectAnswer };
