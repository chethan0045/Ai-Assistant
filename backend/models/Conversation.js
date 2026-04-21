const mongoose = require('mongoose');

// A single chat thread belonging to one user. Messages reference this via conversationId.
const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  title: { type: String, default: 'New conversation' },
  lastMessageAt: { type: Date, default: Date.now },
  messageCount: { type: Number, default: 0 },
  // Pinned conversations float to the top of the sidebar AND get a boost in
  // the memory-recall vector search so their context is always nearby.
  isPinned: { type: Boolean, default: false, index: true },
}, { timestamps: true });

conversationSchema.index({ userId: 1, isPinned: -1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
