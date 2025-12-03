const User = require('../models/User');
const Report = require('../models/Report');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const AuditLog = require('../models/AuditLog');
const Setting = require('../models/Setting');

// List users (admin)
exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password -refreshTokens -resetPasswordToken -verificationToken').lean();

    // annotate blocked flags relative to the admin performing the request
    try {
      const meId = req.user && req.user.id;
      if (meId) {
        const myDoc = await User.findById(meId).select('blockedUsers').lean();
        const myBlocked = new Set((myDoc && myDoc.blockedUsers) || []);

        const ids = users.map((u) => u._id);
        const authors = await User.find({ _id: { $in: ids } }).select('blockedUsers').lean();
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

    res.json({ users });
  } catch (err) {
    next(err);
  }
};

// Update roles (admin)
exports.updateRoles = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { roles } = req.body;
    if (!Array.isArray(roles)) return res.status(400).json({ error: 'roles must be an array' });
    const updated = await User.findByIdAndUpdate(userId, { $set: { roles } }, { new: true }).select(
      '-password -refreshTokens'
    );
    if (!updated) return res.status(404).json({ error: 'User not found' });
    try {
      await AuditLog.create({ actor: req.user.id, action: 'update_roles', targetType: 'user', targetId: userId, meta: { roles } });
    } catch (e) {}
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
};

// Soft-delete / anonymize a user (admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isDeleted = true;
    user.email = `deleted+${user._id}@example.invalid`;
    user.username = `deleted_user_${user._id}`;
    user.roles = [];
    await user.save();
    try {
      await AuditLog.create({ actor: req.user.id, action: 'delete_user', targetType: 'user', targetId: userId });
    } catch (e) {}

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Ban / unban
exports.banUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const u = await User.findByIdAndUpdate(userId, { $set: { isActive: false } }, { new: true }).select(
      '-password -refreshTokens'
    );
    if (!u) return res.status(404).json({ error: 'User not found' });
    try {
      await AuditLog.create({ actor: req.user.id, action: 'ban_user', targetType: 'user', targetId: userId });
    } catch (e) {}
    res.json({ user: u });
  } catch (err) {
    next(err);
  }
};

exports.unbanUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const u = await User.findByIdAndUpdate(userId, { $set: { isActive: true } }, { new: true }).select(
      '-password -refreshTokens'
    );
    if (!u) return res.status(404).json({ error: 'User not found' });
    try {
      await AuditLog.create({ actor: req.user.id, action: 'unban_user', targetType: 'user', targetId: userId });
    } catch (e) {}
    res.json({ user: u });
  } catch (err) {
    next(err);
  }
};

// Moderation queue: list open reports
exports.getModerationQueue = async (req, res, next) => {
  try {
    const reports = await Report.find({ status: 'open' })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('reporter', 'username profilePicture')
      .lean();

    for (const r of reports) {
      try {
        if (r.targetType === 'post') r.target = await Post.findById(r.targetId).select('content author').lean();
        if (r.targetType === 'comment') r.target = await Comment.findById(r.targetId).select('content author').lean();
        if (r.targetType === 'user') r.target = await User.findById(r.targetId).select('username profilePicture').lean();
      } catch (e) {}
    }

    res.json({ reports });
  } catch (err) {
    next(err);
  }
};

// Resolve a report
exports.resolveReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // action: dismiss | ban-user | delete-post | suspend
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (action === 'ban-user' && report.targetType === 'user') {
      await User.findByIdAndUpdate(report.targetId, { $set: { isActive: false } });
    }
    if (action === 'delete-post' && report.targetType === 'post') {
      await Post.findByIdAndUpdate(report.targetId, { $set: { isDeleted: true } });
    }
    if (action === 'delete-comment' && report.targetType === 'comment') {
      // soft-delete the comment so it no longer appears in feeds
      await Comment.findByIdAndUpdate(report.targetId, { $set: { isDeleted: true } });
    }

    report.status = 'resolved';
    report.resolvedAt = new Date();
    report.resolvedBy = req.user.id;
    await report.save();
    try {
      await AuditLog.create({ actor: req.user.id, action: 'resolve_report', targetType: report.targetType, targetId: report.targetId, meta: { action } });
    } catch (e) {}

    res.json({ ok: true, report });
  } catch (err) {
    next(err);
  }
};

// Bulk-resolve reports (admin)
// POST body: { ids: [reportId], action: 'dismissed' | 'removed' | 'approved' | 'delete-post' | 'delete-comment' | 'ban-user' }
exports.bulkResolveReports = async (req, res, next) => {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids must be a non-empty array' });
    const allowed = ['dismissed', 'removed', 'approved', 'ban-user', 'delete-post', 'delete-comment'];
    if (!action || typeof action !== 'string' || !allowed.includes(action)) {
      return res.status(400).json({ error: 'invalid action', allowed });
    }
    const processed = [];
    for (const id of ids) {
      try {
        const report = await Report.findById(id);
        if (!report) continue;

        if (action === 'ban-user' && report.targetType === 'user') {
          await User.findByIdAndUpdate(report.targetId, { $set: { isActive: false } });
        }
        if (action === 'delete-post' && report.targetType === 'post') {
          await Post.findByIdAndUpdate(report.targetId, { $set: { isDeleted: true } });
        }
        if (action === 'delete-comment' && report.targetType === 'comment') {
          await Comment.findByIdAndUpdate(report.targetId, { $set: { isDeleted: true } });
        }

        report.status = 'resolved';
        report.resolvedAt = new Date();
        report.resolvedBy = req.user.id;
        await report.save();
        try {
          await AuditLog.create({ actor: req.user.id, action: 'resolve_report_bulk', targetType: report.targetType, targetId: report.targetId, meta: { action } });
        } catch (e) {}
        processed.push(report._id);
      } catch (e) {
        // continue on individual errors
        console.warn('bulk resolve error for', id, e && e.message);
      }
    }
    res.json({ ok: true, processed });
  } catch (err) {
    next(err);
  }
};

// Auto-verify users who have requested verification and meet simple criteria
// Criteria: user.verificationRequested === true and followers.length >= threshold
// Optional query param: ?threshold=NUMBER (default 100)
exports.autoVerify = async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold || req.body.threshold || '100', 10);
    // find candidates
    const candidates = await User.find({ verificationRequested: true, isVerified: false }).lean();
    const toVerify = candidates.filter((u) => (Array.isArray(u.followers) ? u.followers.length : 0) >= threshold);

    const updated = [];
    for (const u of toVerify) {
      const doc = await User.findByIdAndUpdate(u._id, { $set: { isVerified: true, verificationRequested: false } }, { new: true }).select('-password -refreshTokens').lean();
      if (doc) updated.push(doc);
    }

// Admin-only: run backfill to compute tags for existing posts
exports.runBackfillTags = async (req, res, next) => {
  try {
    // spawn a background child process to avoid blocking request
    const cp = require('child_process');
    const script = require('path').join(__dirname, '..', 'scripts', 'backfillTags.js');
    cp.exec(`node "${script}"`, { env: process.env, stdio: 'ignore' }, (err, stdout, stderr) => {
      if (err) {
        console.warn('Backfill process reported error', err && err.message);
      }
    });
    res.json({ ok: true, message: 'Backfill started' });
  } catch (err) {
    next(err);
  }
};

    res.json({ ok: true, verified: updated.length, users: updated });
  } catch (err) {
    next(err);
  }
};

// Get admin-configurable settings
exports.getSettings = async (req, res, next) => {
  try {
    const entries = await Setting.find({}).lean();
    const obj = {};
    for (const e of entries) obj[e.key] = e.value;
    res.json({ settings: obj });
  } catch (err) {
    next(err);
  }
};

// Set auto-verify flag (enable/disable automatic verification for social signups)
exports.setAutoVerify = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be boolean' });
    const up = await Setting.findOneAndUpdate(
      { key: 'autoVerifySocial' },
      { $set: { value: enabled } },
      { upsert: true, new: true }
    ).lean();
    res.json({ ok: true, setting: { key: up.key, value: up.value } });
  } catch (err) {
    next(err);
  }
};
