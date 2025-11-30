const Message = require('../models/Message');

// Fetch paginated messages between authenticated user and other user
exports.getMessagesWithUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const otherId = req.params.userId;
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      isDeleted: false,
      $or: [
        { sender: userId, recipient: otherId },
        { sender: otherId, recipient: userId }
      ]
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ messages, page, limit });
  } catch (err) {
    next(err);
  }
};

// mark a specific message as read (author only for recipient)
exports.markRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.recipient.toString() !== userId) return res.status(403).json({ error: 'Forbidden' });
    msg.readAt = new Date();
    await msg.save();
    res.json({ ok: true, message: msg });
  } catch (err) {
    next(err);
  }
};
