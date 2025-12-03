const Message = require('../models/Message');
const mongoose = require('mongoose');

// Return list of conversations for the authenticated user
// Each item: { participant: userId, lastMessage, updatedAt }
exports.getConversations = async (req, res, next) => {
  try {
    const userId = mongoose.Types.ObjectId(req.user.id);

    // aggregate last message per conversation partner
    const agg = await Message.aggregate([
      { $match: { isDeleted: false, $or: [{ sender: userId }, { recipient: userId }] } },
      { $project: { sender: 1, recipient: 1, content: 1, createdAt: 1 } },
      {
        $addFields: { partner: { $cond: [{ $eq: ['$sender', userId] }, '$recipient', '$sender'] } },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$partner',
          lastMessage: { $first: '$$ROOT' },
          updatedAt: { $first: '$createdAt' },
        },
      },
      { $sort: { updatedAt: -1 } },
    ]).limit(100);
    // compute unread counts per partner (messages sent TO user and unread)
    const unread = await Message.aggregate([
      { $match: { recipient: userId, readAt: null, isDeleted: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } },
    ]);
    const unreadMap = new Map(unread.map((u) => [u._id.toString(), u.count]));

    const conversations = agg.map((a) => ({
      participant: a._id,
      lastMessage: a.lastMessage,
      updatedAt: a.updatedAt,
      unread: unreadMap.get((a._id || '').toString()) || 0,
    }));

    // annotate with blocked flags in batch
    try {
      const participantIds = conversations.map((c) => c.participant.toString());
      const User = require('../models/User');
      const authors = await User.find({ _id: { $in: participantIds } }).select('blockedUsers').lean();
      const authorMap = new Map();
      for (const a of authors) authorMap.set(a._id.toString(), a.blockedUsers || []);

      const meDoc = await User.findById(req.user.id).select('blockedUsers').lean();
      const myBlocked = new Set((meDoc && meDoc.blockedUsers) || []);

      for (const c of conversations) {
        const pid = c.participant.toString();
        c.blockedByCurrentUser = myBlocked.has(pid);
        const pBlocked = authorMap.get(pid) || [];
        c.blockedCurrentUser = pBlocked.some((b) => b.toString() === req.user.id.toString());
      }
    } catch (e) {
      // ignore
    }

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
};

// Search messages in a conversation (participant id or conversation partner)
exports.searchMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const convId = req.params.conversationId; // this is expected to be the other participant's id
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Query required' });

    // ensure convId is a valid participant
    const ObjectId = require('mongoose').Types.ObjectId;
    if (!ObjectId.isValid(convId)) return res.status(400).json({ error: 'Invalid conversation id' });

    // match messages between the two participants
    const messages = await Message.find({
      isDeleted: false,
      $or: [
        { sender: userId, recipient: convId },
        { sender: convId, recipient: userId },
      ],
      content: { $regex: q, $options: 'i' },
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    res.json({ messages, query: q });
  } catch (err) {
    next(err);
  }
};

// Mute a conversation (add participant id to current user's mutedConversations)
exports.muteConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const convId = req.params.conversationId;
    const User = require('../models/User');
    if (!convId) return res.status(400).json({ error: 'Conversation id required' });
    const me = await User.findById(userId);
    if (!me) return res.status(404).json({ error: 'User not found' });
    const exists = (me.mutedConversations || []).map((d) => d.toString()).includes(convId);
    if (!exists) {
      me.mutedConversations = [...(me.mutedConversations || []), convId];
      await me.save();
    }
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Unmute a conversation (remove participant id)
exports.unmuteConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const convId = req.params.conversationId;
    const User = require('../models/User');
    if (!convId) return res.status(400).json({ error: 'Conversation id required' });
    const me = await User.findById(userId);
    if (!me) return res.status(404).json({ error: 'User not found' });
    me.mutedConversations = (me.mutedConversations || []).filter((d) => d.toString() !== convId);
    await me.save();
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
