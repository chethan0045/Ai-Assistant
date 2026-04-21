const mongoose = require('mongoose');

// Curated bug/fix pairs that the RAG layer retrieves against incoming defects.
// Each entry has an embedding computed at seed time; `cosineSim` ranks matches at query time.

const defectKnowledgeSchema = new mongoose.Schema({
  problem: { type: String, required: true },       // short error signature
  solution: { type: String, required: true },      // what fixed it (often multi-line)
  category: { type: String, default: '' },         // database / runtime / auth / ...
  tags: [{ type: String }],
  severity: { type: String, default: 'medium' },
  embedding: { type: [Number], default: undefined },
}, { timestamps: true });

defectKnowledgeSchema.index({ category: 1 });

module.exports = mongoose.model('DefectKnowledge', defectKnowledgeSchema);
