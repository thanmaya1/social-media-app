const Notification = require('../models/Notification');

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // annotate notifications with blocked flags relative to the recipient (current user)
    try {
      const senderIds = Array.from(
        new Set(notifications.map((n) => (n.sender ? n.sender.toString() : null)).filter(Boolean))
      );
      if (senderIds.length > 0) {
        const User = require('../models/User');
        const authors = await User.find({ _id: { $in: senderIds } }).select('blockedUsers').lean();
        const authorMap = new Map();
        for (const a of authors) authorMap.set(a._id.toString(), a.blockedUsers || []);

        // fetch current user's blocked list
        const me = await User.findById(userId).select('blockedUsers').lean();
        const myBlocked = new Set((me && me.blockedUsers) || []);

        for (const n of notifications) {
          if (!n.sender) continue;
          const sid = n.sender.toString();
          n.blockedByCurrentUser = myBlocked.has(sid);
          const sBlocked = authorMap.get(sid) || [];
          n.blockedCurrentUser = sBlocked.some((b) => b.toString() === userId.toString());
        }
      }
    } catch (e) {
      // ignore annotation errors
    }

    res.json({ notifications, page, limit });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = req.params.notificationId;
    const n = await Notification.findById(id);
    if (!n) return res.status(404).json({ error: 'Not found' });
    if (n.recipient.toString() !== userId) return res.status(403).json({ error: 'Forbidden' });
    n.read = true;
    await n.save();
    // emit to this user's sockets that a notification was read (updates other sessions)
    try {
      const io = req.app && req.app.get('io');
      if (io) {
        io.to(userId).emit('notification_read', { id });
      }
    } catch (e) {
      // log but don't fail the request
      // eslint-disable-next-line no-console
      console.warn('Failed to emit notification_read:', e && e.message);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany({ recipient: userId, read: false }, { $set: { read: true } });
    try {
      const io = req.app && req.app.get('io');
      if (io) io.to(userId).emit('notifications_read_all', { ok: true });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to emit notifications_read_all:', e && e.message);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.unreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = await Notification.countDocuments({ recipient: userId, read: false });
    res.json({ unread: count });
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = req.params.notificationId;
    const n = await Notification.findById(id);
    if (!n) return res.status(404).json({ error: 'Not found' });
    if (n.recipient.toString() !== userId) return res.status(403).json({ error: 'Forbidden' });
    await Notification.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
