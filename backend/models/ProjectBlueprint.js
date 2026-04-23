const mongoose = require('mongoose');

// A single file belonging to a project blueprint. `content` is the skeleton that
// gets written verbatim in the offline path, and used as structural context for
// the LLM in the online path.
const blueprintFileSchema = new mongoose.Schema({
  path: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
}, { _id: false });

const projectBlueprintSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  stack: [{ type: String, lowercase: true, trim: true }],
  keywords: [{ type: String, lowercase: true, trim: true }],
  files: [blueprintFileSchema],
  instructions: { type: String, default: '' },
  // Vector for semantic retrieval. Populated by backfill-embeddings.js from
  // title + description + stack + keywords.
  embedding: { type: [Number], default: undefined },
}, { timestamps: true });

projectBlueprintSchema.index({ title: 'text', description: 'text', keywords: 'text' });

module.exports = mongoose.model('ProjectBlueprint', projectBlueprintSchema);
