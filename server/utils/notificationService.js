const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Create a notification while respecting recipient's preferences.
 * options: { recipient, sender, type, message, relatedPost, relatedComment, force, app }
 * If `force` is true, bypass preference checks.
 * Returns populated notification object or null when skipped.
 */
async function createNotification(options = {}) {
  const { recipient, sender, type, message, relatedPost, relatedComment, force = false, app } = options;
  if (!recipient || !type) return null;

  // Load recipient preferences
  try {
    const u = await User.findById(recipient).select('notificationPreferences').lean();
    if (!u) return null;
    const prefs = u.notificationPreferences || {};

    // map notification types to preference keys to check
    const typeMap = {
      message: ['emailMessages', 'pushMessages', 'pushMessagesAll'],
      follow: ['emailFollows'],
      like: ['emailLikes'],
      comment: ['emailComments'],
      mention: ['emailMentions', 'pushMentions'],
      system: ['pushMessagesAll'],
    };

    if (!force) {
      const keys = typeMap[type] || ['pushMessagesAll'];
      const enabled = keys.some((k) => prefs[k] !== false);
      if (!enabled) return null; // user opted out of all channels for this type
    }
  } catch (e) {
    // on error reading prefs, fall through and attempt creation
  }

  // create notification record
  const created = await Notification.create({ recipient, sender, type, relatedPost, relatedComment, message });
  const populated = await Notification.findById(created._id).populate('sender', 'username profilePicture').lean();

  // emit realtime if io and recipient online
  try {
    if (app && typeof app.get === 'function') {
      const io = app.get('io');
      const online = app.get('onlineUsers') || new Map();
      const toSocketId = online.get(String(recipient));
      if (io && toSocketId) io.to(toSocketId).emit('new_notification', populated);
    }
  } catch (e) {
    // ignore emit errors
  }

  return populated;
}

module.exports = { createNotification };
