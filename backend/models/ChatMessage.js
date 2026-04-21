const mongoose = require('mongoose');

// Per-user chat history for the AI assistant.
// `embedding` enables vector search over a user's past turns (long-term memory RAG).

const chatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true },
  role: { type: String, enum: ['user', 'ai'], required: true },
  text: { type: String, required: true },
  artifacts: { type: Array, default: [] },
  steps: { type: Array, default: [] },
  thinking: { type: String, default: '' },
  embedding: { type: [Number], default: undefined },
}, { timestamps: true });

chatMessageSchema.index({ userId: 1, createdAt: 1 });
chatMessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
