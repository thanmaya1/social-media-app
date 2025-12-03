const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { uploadFile } = require('../utils/cloudinary');
const { processForUpload } = require('../utils/imageProcessor');

// Simple user search (paginated)
exports.searchUsers = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const filter = q
      ? {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find(filter)
      .select('username profilePicture bio')
      .skip(skip)
      .limit(limit)
      .lean();
    // annotate blocked flags when Authorization present
    try {
      const { parseAuthHeader } = require('../utils/auth');
      const decoded = parseAuthHeader(req);
      if (decoded) {
        const meId = decoded.id;
        const UserModel = require('../models/User');
        const me = await UserModel.findById(meId).select('blockedUsers').lean();
        const myBlocked = new Set((me && me.blockedUsers) || []);

        // fetch blocked lists for returned users in one query
        const ids = users.map((u) => u._id);
        const authors = await UserModel.find({ _id: { $in: ids } }).select('blockedUsers').lean();
        const authorMap = new Map();
        for (const a of authors) authorMap.set(a._id.toString(), a.blockedUsers || []);

        for (const u of users) {
          const uid = u._id.toString();
          u.blockedByCurrentUser = myBlocked.has(uid);
          const ab = authorMap.get(uid) || [];
          u.blockedCurrentUser = ab.some((b) => b.toString() === meId.toString());
        }
      }
    } catch (e) {
      // ignore annotation errors
    }

    res.json({ users, page, limit });
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await User.findById(userId).select('-password -refreshTokens').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// Get public user profile by id
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select('-password -refreshTokens -resetPasswordToken -verificationToken')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // If request has Authorization header, try to detect relationship (blocked)
    let blockedByCurrentUser = false;
    let blockedCurrentUser = false;
    try {
      const { parseAuthHeader } = require('../utils/auth');
      const decoded = parseAuthHeader(req);
      if (decoded) {
        const me = await User.findById(decoded.id).select('blockedUsers').lean();
        if (me) {
          blockedByCurrentUser = (me.blockedUsers || []).some((b) => b.toString() === id.toString());
        }
        const target = await User.findById(id).select('blockedUsers').lean();
        if (target) blockedCurrentUser = (target.blockedUsers || []).some((b) => b.toString() === decoded.id.toString());
      }
    } catch (e) {
      // ignore errors computing relationship
    }

    res.json({ user, blockedByCurrentUser, blockedCurrentUser });
  } catch (err) {
    next(err);
  }
};

// Update profile (protected) - partial updates allowed
exports.updateProfile = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (
      id !== req.user.id &&
      !(Array.isArray(req.user.roles) && req.user.roles.includes('admin'))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const allowed = ['username', 'bio', 'location', 'website'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

    const updated = await User.findByIdAndUpdate(id, { $set: updates }, { new: true }).select(
      '-password -refreshTokens'
    );
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
};

// Upload avatar
exports.uploadAvatar = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (
      id !== req.user.id &&
      !(Array.isArray(req.user.roles) && req.user.roles.includes('admin'))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const cloudConfigured = !!(
      process.env.CLOUDINARY_API_KEY ||
      process.env.CLOUDINARY_URL ||
      process.env.CLOUDINARY_CLOUD_NAME
    );
    let url;
    if (cloudConfigured) {
      const localPath = path.join(__dirname, '..', 'uploads', file.filename);
      const toUpload = await processForUpload(localPath, file.mimetype);
      const r = await uploadFile(toUpload, { folder: 'social_media_app/avatars' });
      url = r.secure_url;
      // remove local
      // remove any temporary resized file(s)
      fs.unlink(localPath, () => {});
      if (toUpload !== localPath) fs.unlink(toUpload, () => {});
      // remove any thumbnails generated in uploads/thumbs
      try {
        const thumbs = file.thumbnails || {};
        const thumbsDir = path.join(__dirname, '..', 'uploads', 'thumbs');
        for (const k of Object.keys(thumbs)) {
          const p = thumbs[k] || '';
          const name = p.split('/').pop();
          if (name) {
            const full = path.join(thumbsDir, name);
            fs.unlink(full, () => {});
          }
        }
      } catch (e) {}
    } else {
      url = `/uploads/${file.filename}`;
      // attach thumbnails if present
      if (file.thumbnails) {
        const thumbs = file.thumbnails;
        await User.findByIdAndUpdate(id, { $set: { profilePictureThumbs: { small: thumbs.small, medium: thumbs.medium, large: thumbs.large } } });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { profilePicture: url } },
      { new: true }
    ).select('-password -refreshTokens');
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// Upload cover image
exports.uploadCover = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (
      id !== req.user.id &&
      !(Array.isArray(req.user.roles) && req.user.roles.includes('admin'))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const cloudConfigured = !!(
      process.env.CLOUDINARY_API_KEY ||
      process.env.CLOUDINARY_URL ||
      process.env.CLOUDINARY_CLOUD_NAME
    );
    let url;
    if (cloudConfigured) {
      const localPath = path.join(__dirname, '..', 'uploads', file.filename);
      const toUpload = await processForUpload(localPath, file.mimetype);
      const r = await uploadFile(toUpload, { folder: 'social_media_app/covers' });
      url = r.secure_url;
      fs.unlink(localPath, () => {});
      if (toUpload !== localPath) fs.unlink(toUpload, () => {});
      // cleanup thumbnails if created
      try {
        const thumbs = file.thumbnails || {};
        const thumbsDir = path.join(__dirname, '..', 'uploads', 'thumbs');
        for (const k of Object.keys(thumbs)) {
          const p = thumbs[k] || '';
          const name = p.split('/').pop();
          if (name) {
            const full = path.join(thumbsDir, name);
            fs.unlink(full, () => {});
          }
        }
      } catch (e) {}
    } else {
      url = `/uploads/${file.filename}`;
      if (file.thumbnails) {
        const thumbs = file.thumbnails;
        await User.findByIdAndUpdate(id, { $set: { coverImageThumbs: { small: thumbs.small, medium: thumbs.medium, large: thumbs.large } } });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { coverImage: url } },
      { new: true }
    ).select('-password -refreshTokens');
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// Follow a user
exports.follow = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;
    if (targetId === userId) return res.status(400).json({ error: 'Cannot follow yourself' });

    const { isBlocked } = require('../utils/blocks');
    if (await isBlocked(userId, targetId))
      return res.status(403).json({ error: 'Cannot follow this user' });

    await User.findByIdAndUpdate(targetId, { $addToSet: { followers: userId } });
    await User.findByIdAndUpdate(userId, { $addToSet: { following: targetId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Unfollow a user
exports.unfollow = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;
    if (targetId === userId) return res.status(400).json({ error: 'Cannot unfollow yourself' });

    await User.findByIdAndUpdate(targetId, { $pull: { followers: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { following: targetId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Block a user
exports.block = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;
    if (targetId === userId) return res.status(400).json({ error: 'Cannot block yourself' });

    await User.findByIdAndUpdate(userId, { $addToSet: { blockedUsers: targetId } });
    // also remove follow relations
    await User.findByIdAndUpdate(userId, { $pull: { following: targetId } });
    await User.findByIdAndUpdate(targetId, { $pull: { followers: userId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Unblock a user
exports.unblock = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;
    await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: targetId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Get followers list
exports.getFollowers = async (req, res, next) => {
  try {
    const id = req.params.id;
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;
    const user = await User.findById(id).populate({
      path: 'followers',
      select: 'username profilePicture',
      options: { skip, limit },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ followers: user.followers, page, limit });
  } catch (err) {
    next(err);
  }
};

// Get following list
exports.getFollowing = async (req, res, next) => {
  try {
    const id = req.params.id;
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;
    const user = await User.findById(id).populate({
      path: 'following',
      select: 'username profilePicture',
      options: { skip, limit },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ following: user.following, page, limit });
  } catch (err) {
    next(err);
  }
};

// Get settings (notification & privacy) for current user
exports.getSettings = async (req, res, next) => {
  try {
    const id = req.user.id;
    const user = await User.findById(id).select('notificationPreferences');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ settings: user.notificationPreferences || {} });
  } catch (err) {
    next(err);
  }
};

// Update settings
exports.updateSettings = async (req, res, next) => {
  try {
    const id = req.user.id;
    const updates = req.body || {};
    const allowed = [
      'emailLikes',
      'emailComments',
      'emailFollows',
      'pushMessages',
      'emailMentions',
      'emailMessages',
      'pushMentions',
      'pushMessagesAll'
    ];
    const prefs = {};
    for (const k of allowed) if (updates[k] !== undefined) prefs[k] = !!updates[k];
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { notificationPreferences: prefs } },
      { new: true }
    ).select('notificationPreferences');
    res.json({ settings: user.notificationPreferences });
  } catch (err) {
    next(err);
  }
};

// Change password for current user
exports.changePassword = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const bcrypt = require('bcryptjs');
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
// Batch fetch small user records by ids: /api/users/batch?ids=1,2,3
exports.getUsersBatch = async (req, res, next) => {
  try {
    const idsParam = req.query.ids || '';
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: 'ids query required' });
    const users = await User.find({ _id: { $in: ids } }).select('username profilePicture').lean();
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

// Request verified badge (user-initiated)
exports.requestVerification = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.isVerified) return res.status(400).json({ error: 'Already verified' });
    user.verificationRequested = true;
    await user.save();

    // Create a system notification for all admins so they are aware of the request
    try {
      const Notification = require('../models/Notification');
      const admins = await User.find({ roles: 'admin' }).select('_id').lean();
      for (const a of admins) {
        try {
          const notificationService = require('../utils/notificationService');
          await notificationService.createNotification({
            recipient: a._id,
            sender: req.user.id,
            type: 'system',
            message: `Verification requested by ${user.username || user.email}`,
            app: req.app,
            force: true,
          });
        } catch (e) {
          // ignore per-admin notification errors
        }
      }
    } catch (e) {
      // ignore notification errors
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// No-op placeholder to locate file end
