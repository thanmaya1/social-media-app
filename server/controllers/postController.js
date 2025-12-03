const Post = require('../models/Post');
const fs = require('fs');
const path = require('path');
const { uploadFile } = require('../utils/cloudinary');

exports.createPost = async (req, res, next) => {
  try {
    const { content } = req.body;
    const isDraft = req.body.isDraft === 'true' || req.body.isDraft === true;
    const scheduledAtRaw = req.body.scheduledAt;
    const files = req.files || [];

    let images = [];
    let videos = [];

    // If Cloudinary configured, upload each file and remove local file
    const cloudConfigured = !!(
      process.env.CLOUDINARY_API_KEY ||
      process.env.CLOUDINARY_URL ||
      process.env.CLOUDINARY_CLOUD_NAME
    );

    if (cloudConfigured) {
      for (const f of files) {
        try {
          const localPath = path.join(__dirname, '..', 'uploads', f.filename);
          const res = await uploadFile(localPath, { folder: 'social_media_app' });
          if (res.resource_type && res.resource_type.startsWith('video'))
            videos.push(res.secure_url);
          else images.push(res.secure_url);
          // remove local file
          fs.unlink(localPath, () => {});
        } catch (err) {
          console.warn('Cloudinary upload failed for', f.filename, err.message);
        }
      }
    } else {
      images = [];
      const imageThumbs = [];
      for (const f of files.filter((f) => f.mimetype.startsWith('image'))) {
        images.push(`/uploads/${f.filename}`);
        if (f.thumbnails) {
          imageThumbs.push({ small: f.thumbnails.small, medium: f.thumbnails.medium, large: f.thumbnails.large });
        } else {
          imageThumbs.push({});
        }
      }
      videos = files
        .filter((f) => f.mimetype.startsWith('video'))
        .map((f) => `/uploads/${f.filename}`);
    }

    // extract hashtags from content and normalize to lowercase without #
    const extractTags = (txt) => {
      try {
        if (!txt) return [];
        const m = txt.match(/#[A-Za-z0-9_]+/g);
        if (!m) return [];
        return Array.from(new Set(m.map((t) => t.slice(1).toLowerCase())));
      } catch (e) {
        return [];
      }
    };

    const postData = { author: req.user.id, content, images, videos };
    const tags = extractTags(content);
    if (tags.length) postData.tags = tags;
    if (typeof imageThumbs !== 'undefined') postData.imageThumbs = imageThumbs;
    if (isDraft) postData.isDraft = true;
    if (scheduledAtRaw) {
      const dt = new Date(scheduledAtRaw);
      if (!Number.isNaN(dt.getTime())) {
        postData.scheduledAt = dt;
        // if scheduled to future, keep as draft until scheduler publishes
        if (dt > new Date()) postData.isDraft = true;
      }
    }

    const post = await Post.create(postData);

    // If scheduled in future, attempt to enqueue a job in the scheduler (if available)
    try {
      const { schedulePost } = require('../utils/scheduler');
      if (post.scheduledAt && post.scheduledAt > new Date() && typeof schedulePost === 'function') {
        // schedulePost handles bull queue when configured, or no-ops if poller will pick it up
        schedulePost(post._id, post.scheduledAt);
      }
    } catch (e) {
      // ignore scheduler errors
    }

    // populate author basic
    const populated = await Post.findById(post._id).populate('author', 'username profilePicture');

    // emit socket event if io available on app
    if (req.app && req.app.get('io')) {
      req.app.get('io').emit('new_post', populated);
    }

    res.status(201).json({ post: populated });
  } catch (err) {
    next(err);
  }
};

exports.getFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const skip = (page - 1) * limit;

    // Support trending sorting: time-decayed engagement score
    const sortMode = (req.query.sort || '').toLowerCase();
    let posts = [];
    if (sortMode === 'trending') {
      // try cache first (short-lived)
      try {
        const cache = require('../utils/cache');
        const cacheKey = `trending:window:7d:limit:${limit}:page:${page}`;
        const cached = await cache.get(cacheKey);
        if (cached) return res.json({ posts: cached, page, limit });
      } catch (e) {
        // ignore cache errors
      }
      // get a larger recent window (e.g., last 7 days) then score in JS
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const candidates = await Post.find({
        isDeleted: false,
        visibility: 'public',
        createdAt: { $gte: since },
      })
        .sort({ createdAt: -1 })
        .limit(200)
        .populate('author', 'username profilePicture')
        .lean();

      const now = Date.now();
      // compute simple score: (likes*2 + shares*3 + comments*1.5) / ((hours+2)^1.5)
      posts = candidates.map((p) => {
        const likes = Array.isArray(p.likes) ? p.likes.length : 0;
        const shares = typeof p.shares === 'number' ? p.shares : 0;
        const comments = Array.isArray(p.comments) ? p.comments.length : 0;
        const hours = Math.max(0.1, (now - new Date(p.createdAt).getTime()) / (1000 * 60 * 60));
        const raw = likes * 2 + shares * 3 + comments * 1.5;
        const score = raw / Math.pow(hours + 2, 1.5);
        return { ...p, _score: score };
      });
      posts.sort((a, b) => b._score - a._score);
      // apply pagination on sorted results
      posts = posts.slice(skip, skip + limit);
      // store trending results in cache briefly to avoid repeated scoring
      try {
        const cache = require('../utils/cache');
        const cacheKey = `trending:window:7d:limit:${limit}:page:${page}`;
        await cache.set(cacheKey, posts, 30); // cache 30s
      } catch (e) {
        // ignore
      }
    } else {
      // Try Redis cache for standard feed when available and unauthenticated
      const redisClient = require('../utils/redisClient');
      const cacheKey = `feed:public:page:${page}:limit:${limit}:sort:latest`;
      if (!req.headers.authorization && redisClient.isEnabled()) {
        try {
          const r = redisClient.getClient();
          const cached = r && (await r.get(cacheKey));
          if (cached) {
            const parsed = JSON.parse(cached);
            return res.json({ posts: parsed, page, limit });
          }
        } catch (e) {
          // ignore cache errors
        }
      }

      posts = await Post.find({ isDeleted: false, visibility: 'public' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username profilePicture')
        .lean();

      // store in cache
      if (!req.headers.authorization && redisClient.isEnabled()) {
        try {
          const r = redisClient.getClient();
          if (r) await r.set(cacheKey, JSON.stringify(posts), 'EX', 30);
        } catch (e) {
          // ignore cache set errors
        }
      }
    }

    // If authorization present, try to include lightweight relationship flags
    const { parseAuthHeader } = require('../utils/auth');
    const decoded = parseAuthHeader(req);
    if (!decoded) return res.json({ posts, page, limit });

    try {
      const meId = decoded.id;
      // fetch my blockedUsers once
      const User = require('../models/User');
      const me = await User.findById(meId).select('blockedUsers').lean();
      const myBlocked = new Set((me && me.blockedUsers) || []);

      // collect unique author ids
      const authorIds = Array.from(new Set(posts.map((p) => (p.author && p.author._id) || p.author)));
      const authors = await User.find({ _id: { $in: authorIds } }).select('blockedUsers').lean();
      const authorMap = new Map();
      for (const a of authors) authorMap.set(a._id.toString(), a.blockedUsers || []);

      // annotate posts
      for (const p of posts) {
        const aid = (p.author && p.author._id && p.author._id.toString()) || (p.author && p.author.toString());
        p.blockedByCurrentUser = myBlocked.has(aid);
        const aBlocked = authorMap.get(aid) || [];
        p.blockedCurrentUser = aBlocked.some((b) => b.toString() === meId.toString());
      }

      return res.json({ posts, page, limit });
    } catch (e) {
      // on any error, return without flags
      return res.json({ posts, page, limit });
    }
  } catch (err) {
    next(err);
  }
};

// Simple posts search endpoint supporting plain q or tag parameter
exports.searchPosts = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const tag = (req.query.tag || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(10, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const buildRegex = (s) => {
      // escape regex
      const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(esc, 'i');
    };

    let qFilter = {};
    if (tag) {
      // prefer tags array match when available
      qFilter = { tags: tag.toLowerCase() };
    } else if (q) {
      // allow exact phrase or plain text search
      const re = buildRegex(q);
      qFilter = { content: { $regex: re } };
    } else {
      return res.json({ posts: [], page, limit });
    }

    const posts = await Post.find({ isDeleted: false, visibility: 'public', ...qFilter })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profilePicture')
      .lean();

    return res.json({ posts, page, limit });
  } catch (err) {
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id).populate('author', 'username profilePicture');
    if (!post || post.isDeleted) return res.status(404).json({ error: 'Post not found' });

    // Hide drafts from unauthenticated or unauthorized viewers
    if (post.isDraft) {
      // try to parse auth header to identify requester
      const { parseAuthHeader } = require('../utils/auth');
      const decoded = parseAuthHeader(req);
      if (!decoded) return res.status(404).json({ error: 'Post not found' });
      const meId = decoded.id;
      const isAdmin = Array.isArray(decoded.roles) && decoded.roles.includes('admin');
      if (post.author._id.toString() !== meId.toString() && !isAdmin) return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ post });
  } catch (err) {
    next(err);
  }
};

// Get drafts for the authenticated user
exports.getDrafts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const skip = (page - 1) * limit;

    const drafts = await Post.find({ author: req.user.id, isDraft: true, isDeleted: false })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profilePicture')
      .lean();

    res.json({ drafts, page, limit });
  } catch (err) {
    next(err);
  }
};

// Publish a draft immediately
exports.publishDraft = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post || post.isDeleted) return res.status(404).json({ error: 'Draft not found' });

    if (post.author.toString() !== req.user.id && !(Array.isArray(req.user.roles) && req.user.roles.includes('admin')))
      return res.status(403).json({ error: 'Forbidden' });

    post.isDraft = false;
    // clear scheduledAt if was in past or now
    if (post.scheduledAt && new Date(post.scheduledAt) <= new Date()) post.scheduledAt = undefined;
    await post.save();

    const populated = await Post.findById(id).populate('author', 'username profilePicture');

    if (req.app && req.app.get('io')) req.app.get('io').emit('new_post', populated);

    res.json({ post: populated });
  } catch (err) {
    next(err);
  }
};

exports.likePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const { isBlocked } = require('../utils/blocks');
    if (await isBlocked(userId, post.author)) return res.status(403).json({ error: 'Forbidden' });

    const exists = post.likes.includes(userId);
    if (exists) {
      post.likes = post.likes.filter((u) => u.toString() !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    const populated = await Post.findById(id).populate('author', 'username profilePicture');

    if (req.app && req.app.get('io')) req.app.get('io').emit('post_liked', { postId: id, userId });

    res.json({ post: populated });
  } catch (err) {
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const post = await Post.findById(id);
    if (!post || post.isDeleted) return res.status(404).json({ error: 'Post not found' });

    // allow only author or admin to update
    if (
      post.author.toString() !== req.user.id &&
      !(Array.isArray(req.user.roles) && req.user.roles.includes('admin'))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    post.content = content || post.content;
    await post.save();
    const populated = await Post.findById(id).populate('author', 'username profilePicture');
    res.json({ post: populated });
  } catch (err) {
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post || post.isDeleted) return res.status(404).json({ error: 'Post not found' });

    // allow only author or admin to delete
    if (
      post.author.toString() !== req.user.id &&
      !(Array.isArray(req.user.roles) && req.user.roles.includes('admin'))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    post.isDeleted = true;
    await post.save();

    if (req.app && req.app.get('io')) req.app.get('io').emit('post_deleted', { postId: id });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Share a post. Increments share count and optionally create a share record.
exports.sharePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { createCopy, content, visibility } = req.body || {};
    const userId = req.user.id;

    const post = await Post.findById(id);
    if (!post || post.isDeleted) return res.status(404).json({ error: 'Post not found' });

    // Prevent sharing if blocked
    const { isBlocked } = require('../utils/blocks');
    if (await isBlocked(userId, post.author)) return res.status(403).json({ error: 'Forbidden' });

    post.shares = (post.shares || 0) + 1;
    await post.save();

    // Optionally create a copy/share as a new post by the sharer with link back
    let sharedPost = null;
    if (createCopy) {
      const shareContent = content || `Shared post: ${post.content || ''}`;
      sharedPost = await Post.create({
        author: userId,
        content: shareContent,
        images: post.images || [],
        videos: post.videos || [],
        visibility: visibility || 'public',
      });
    }

    // emit socket event
    if (req.app && req.app.get('io')) req.app.get('io').emit('post_shared', { postId: id, userId });

    return res.json({ ok: true, post: sharedPost || null });
  } catch (err) {
    next(err);
  }
};

// Trending feed helper — delegating to existing getFeed logic with sort param
exports.getTrending = async (req, res, next) => {
  try {
    // mark sort mode and delegate to getFeed which handles trending scoring
    req.query = req.query || {};
    req.query.sort = 'trending';
    return await exports.getFeed(req, res, next);
  } catch (err) {
    return next(err);
  }
};
