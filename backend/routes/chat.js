const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');
const { requireAuth } = require('../middleware/auth');
const { embed, cosineSim } = require('../services/embeddings');

router.use(requireAuth);

// Helper: derive a short title from the first user message of a conversation.
function deriveTitle(text) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'New conversation';
  return clean.length > 60 ? clean.slice(0, 57) + '...' : clean;
}

// ===== CONVERSATIONS =====

// List user's conversations. Pinned first, then most-recent.
router.get('/conversations', async (req, res) => {
  try {
    const convos = await Conversation.find({ userId: req.user.userId })
      .sort({ isPinned: -1, lastMessageAt: -1 })
      .limit(200);
    res.json({ conversations: convos });
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new empty conversation.
router.post('/conversations', async (req, res) => {
  try {
    const convo = await Conversation.create({
      userId: req.user.userId,
      title: req.body?.title || 'New conversation',
    });
    res.status(201).json(convo);
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rename and/or pin a conversation. Both fields optional; whatever's provided is applied.
router.patch('/conversations/:id', async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body?.title === 'string') updates.title = req.body.title || 'Untitled';
    if (typeof req.body?.isPinned === 'boolean') updates.isPinned = req.body.isPinned;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'no valid fields' });

    const convo = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: updates },
      { new: true },
    );
    if (!convo) return res.status(404).json({ error: 'Not found' });
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a conversation + all its messages.
router.delete('/conversations/:id', async (req, res) => {
  try {
    const convo = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!convo) return res.status(404).json({ error: 'Not found' });
    await ChatMessage.deleteMany({ conversationId: req.params.id, userId: req.user.userId });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Messages in a single conversation.
// By default returns only the most recent `limit` (default 30) to keep page loads fast —
// the client can pass `limit=0` to get the full thread.
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const convo = await Conversation.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!convo) return res.status(404).json({ error: 'Not found' });

    const limit = req.query.limit !== undefined ? Number(req.query.limit) : 30;
    const filter = { conversationId: req.params.id, userId: req.user.userId };
    const total = await ChatMessage.countDocuments(filter);

    let query = ChatMessage.find(filter).select('-embedding');
    let messages;
    if (limit > 0) {
      // Fetch newest N, then flip to oldest-first for the UI.
      const recent = await query.sort({ createdAt: -1 }).limit(limit);
      messages = recent.reverse();
    } else {
      messages = await query.sort({ createdAt: 1 });
    }

    res.json({
      conversation: convo,
      messages,
      total,
      hasMore: limit > 0 && total > messages.length,
    });
  } catch (err) {
    console.error('Get conversation messages error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== LEGACY HISTORY (unscoped, kept for backward compat / migration) =====

router.get('/history', async (req, res) => {
  try {
    const { limit = 200 } = req.query;
    const messages = await ChatMessage.find({ userId: req.user.userId })
      .sort({ createdAt: 1 })
      .limit(Number(limit))
      .select('-embedding');
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/history', async (req, res) => {
  try {
    await Conversation.deleteMany({ userId: req.user.userId });
    const result = await ChatMessage.deleteMany({ userId: req.user.userId });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SAVE MESSAGE =====
// Creates a conversation on-the-fly if conversationId is missing. Updates the conversation's
// lastMessageAt + messageCount, and auto-titles based on the first user message.
router.post('/message', async (req, res) => {
  try {
    const { role, text, artifacts, steps, thinking } = req.body;
    let { conversationId } = req.body;
    if (!role || !text) return res.status(400).json({ error: 'role and text required' });

    let convo;
    if (conversationId) {
      convo = await Conversation.findOne({ _id: conversationId, userId: req.user.userId });
      if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    } else {
      // No conversation yet — start one and use the first user message as the title seed.
      convo = await Conversation.create({
        userId: req.user.userId,
        title: role === 'user' ? deriveTitle(text) : 'New conversation',
      });
      conversationId = convo._id;
    }

    let embedding;
    try {
      embedding = await embed(text);
    } catch (e) {
      console.warn('Embedding skipped:', e.message);
    }

    const msg = await ChatMessage.create({
      userId: req.user.userId,
      conversationId,
      role,
      text,
      artifacts: artifacts || [],
      steps: steps || [],
      thinking: thinking || '',
      embedding,
    });

    // If this is the first user message and the title is still default, update it.
    const updates = { lastMessageAt: new Date(), $inc: { messageCount: 1 } };
    if (role === 'user' && convo.title === 'New conversation') {
      updates.title = deriveTitle(text);
    }
    const { $inc, ...setFields } = updates;
    await Conversation.updateOne(
      { _id: conversationId },
      { $set: setFields, $inc: { messageCount: 1 } },
    );

    const { embedding: _e, ...rest } = msg.toObject();
    res.status(201).json({ message: rest, conversationId });
  } catch (err) {
    console.error('Save message error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== RAG OVER PAST CHATS =====
// Optional `conversationId` to scope search to one thread; otherwise searches all of user's history.
//
// Scoring: cosine similarity + recency boost + pin boost.
//   finalScore = cosine + recencyBoost + pinBoost
//     recencyBoost = 0.10 * exp(-daysOld / 30)   — today: +0.10, 30d: +0.037, 90d: +0.005
//     pinBoost     = 0.15 if message is in a pinned conversation, else 0
// minScore applies to the *final* score, so old faint matches still get filtered out
// while a 2-week-old pinned conversation rises above a random stranger match.
router.get('/search-vector', async (req, res) => {
  try {
    const { q, limit = 5, minScore = 0.4, conversationId } = req.query;
    if (!q) return res.status(400).json({ error: 'q required' });

    const queryVec = await embed(q.toString());
    const filter = {
      userId: req.user.userId,
      embedding: { $exists: true, $ne: [] },
    };
    if (conversationId) filter.conversationId = conversationId;

    const msgs = await ChatMessage.find(filter);

    // Look up which of this user's conversations are pinned, once, so we can tag each message.
    const pinnedIds = new Set(
      (await Conversation.find({ userId: req.user.userId, isPinned: true }).select('_id'))
        .map(c => String(c._id)),
    );

    const now = Date.now();
    const scored = msgs
      .map(m => {
        const cosine = cosineSim(queryVec, m.embedding);
        const daysOld = Math.max(0, (now - new Date(m.createdAt).getTime()) / 86_400_000);
        const recencyBoost = 0.10 * Math.exp(-daysOld / 30);
        const pinned = pinnedIds.has(String(m.conversationId));
        const pinBoost = pinned ? 0.15 : 0;
        return { msg: m, cosine, recencyBoost, pinBoost, pinned, score: cosine + recencyBoost + pinBoost };
      })
      .filter(s => s.score >= Number(minScore))
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(limit));

    res.json({
      results: scored.map(s => ({
        id: s.msg._id,
        conversationId: s.msg.conversationId,
        role: s.msg.role,
        text: s.msg.text,
        createdAt: s.msg.createdAt,
        score: s.score,
        cosine: s.cosine,
        pinned: s.pinned,
      })),
      count: scored.length,
    });
  } catch (err) {
    console.error('Chat vector search error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
