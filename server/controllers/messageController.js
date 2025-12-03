const Message = require('../models/Message');
const { uploadFile } = require('../utils/cloudinary');
const path = require('path');
const fs = require('fs');
const { isBlocked } = require('../utils/blocks');

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
        { sender: otherId, recipient: userId },
      ],
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

// Soft-delete a message for the requesting user. If both parties have deleted, mark message fully deleted.
exports.deleteMessageForUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    // only participants may delete
    if (msg.sender.toString() !== userId && msg.recipient.toString() !== userId)
      return res.status(403).json({ error: 'Forbidden' });

    const already = (msg.deletedFor || []).map((d) => d.toString()).includes(userId);
    if (!already) msg.deletedFor = [...(msg.deletedFor || []), userId];

    // if both participants have deleted, mark message isDeleted true
    const senderId = msg.sender.toString();
    const recipientId = msg.recipient.toString();
    const deletedSet = new Set((msg.deletedFor || []).map((d) => d.toString()));
    if (deletedSet.has(senderId) && deletedSet.has(recipientId)) msg.isDeleted = true;

    await msg.save();

    // emit socket event to both participants to update UI
    try {
      const io = req.app && req.app.get('io');
      if (io) io.to(senderId).emit('message_deleted', { messageId });
      if (io) io.to(recipientId).emit('message_deleted', { messageId });
    } catch (e) {
      // ignore
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

// Admin: forcibly delete any message (soft-delete)
exports.adminDeleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    msg.isDeleted = true;
    await msg.save();

    try {
      const io = req.app && req.app.get('io');
      if (io) {
        const senderId = msg.sender.toString();
        const recipientId = msg.recipient.toString();
        io.to(senderId).emit('message_deleted', { messageId });
        io.to(recipientId).emit('message_deleted', { messageId });
      }
    } catch (e) {}

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

// Search messages for the authenticated user across their conversations
exports.searchMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'query parameter q is required' });
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(10, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    // simple text search on message content (case-insensitive)
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const messages = await Message.find({
      isDeleted: false,
      $and: [
        { content: { $regex: re } },
        { $or: [{ sender: userId }, { recipient: userId }] },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ messages, page, limit });
  } catch (err) {
    next(err);
  }
};

// Send a message (persist and emit via socket if available)
exports.sendMessage = async (req, res, next) => {
  try {
    const sender = req.user.id;
    const { recipient, content } = req.body;
    const files = req.files || [];
    if (!recipient) return res.status(400).json({ error: 'recipient required' });

    // prevent sending messages when either side has blocked the other
    if (await isBlocked(sender, recipient))
      return res.status(403).json({ error: 'Cannot send message to this user' });

    let images = [];
    let imageThumbs = [];
    let type = 'text';
    const cloudConfigured = !!(
      process.env.CLOUDINARY_API_KEY ||
      process.env.CLOUDINARY_URL ||
      process.env.CLOUDINARY_CLOUD_NAME
    );
    if (files.length) {
      for (const f of files) {
        try {
            if (cloudConfigured) {
            const localPath = path.join(__dirname, '..', 'uploads', f.filename);
            const r = await uploadFile(localPath, { folder: 'social_media_app/messages' });
            images.push(r.secure_url);
            fs.unlink(localPath, () => {});
          } else {
            images.push(`/uploads/${f.filename}`);
            if (f.thumbnails) imageThumbs.push({ small: f.thumbnails.small, medium: f.thumbnails.medium, large: f.thumbnails.large });
          }
        } catch (e) {
          // ignore upload failure per-file
        }
      }
      type = 'image';
    }

    const msg = await Message.create({ sender, recipient, content, images, imageThumbs, type });

    // create a notification for recipient (message)
    try {
      const notificationService = require('../utils/notificationService');
      await notificationService.createNotification({
        recipient,
        sender,
        type: 'message',
        message: content,
        app: req.app,
      });
    } catch (e) {
      // ignore notification errors
    }

    // emit socket events using onlineUsers mapping (maps userId -> socketId)
    if (req.app && req.app.get('io')) {
      const io = req.app.get('io');
      const online = req.app.get('onlineUsers') || new Map();
      const toSocketId = online.get(recipient);
      const fromSocketId = online.get(sender);
      const populated = await Message.findById(msg._id).populate(
        'sender',
        'username profilePicture'
      );
      if (toSocketId) io.to(toSocketId).emit('receive_message', populated);
      if (fromSocketId) io.to(fromSocketId).emit('send_message', populated);
    }

    res.status(201).json({ message: msg });
  } catch (err) {
    next(err);
  }
};
