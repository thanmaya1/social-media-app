const Message = require('../models/Message');
const mongoose = require('mongoose');

// Return list of conversations for the authenticated user
// Each item: { participant: userId, lastMessage, updatedAt }
exports.getConversations = async (req, res, next) => {
  try {
    const userId = mongoose.Types.ObjectId(req.user.id);

    // aggregate last message per conversation partner
    const agg = await Message.aggregate([
      { $match: { isDeleted: false, $or: [ { sender: userId }, { recipient: userId } ] } },
      { $project: { sender: 1, recipient: 1, content: 1, createdAt: 1 } },
      { $addFields: { partner: { $cond: [ { $eq: ['$sender', userId] }, '$recipient', '$sender' ] } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$partner', lastMessage: { $first: '$$ROOT' }, updatedAt: { $first: '$createdAt' } } },
      { $sort: { updatedAt: -1 } }
    ]).limit(100);
    // compute unread counts per partner (messages sent TO user and unread)
    const unread = await Message.aggregate([
      { $match: { recipient: userId, readAt: null, isDeleted: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);
    const unreadMap = new Map(unread.map(u => [u._id.toString(), u.count]));

    const conversations = agg.map(a => ({
      participant: a._id,
      lastMessage: a.lastMessage,
      updatedAt: a.updatedAt,
      unread: unreadMap.get((a._id || '').toString()) || 0
    }));

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
};
