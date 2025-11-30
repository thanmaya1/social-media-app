const Post = require('../models/Post');
const fs = require('fs');
const path = require('path');
const { uploadFile } = require('../utils/cloudinary');

exports.createPost = async (req, res, next) => {
  try {
    const { content } = req.body;
    const files = req.files || [];

    let images = [];
    let videos = [];

    // If Cloudinary configured, upload each file and remove local file
    const cloudConfigured = !!(process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);

    if (cloudConfigured) {
      for (const f of files) {
        try {
          const localPath = path.join(__dirname, '..', 'uploads', f.filename);
          const res = await uploadFile(localPath, { folder: 'social_media_app' });
          if (res.resource_type && res.resource_type.startsWith('video')) videos.push(res.secure_url);
          else images.push(res.secure_url);
          // remove local file
          fs.unlink(localPath, () => {});
        } catch (err) {
          console.warn('Cloudinary upload failed for', f.filename, err.message);
        }
      }
    } else {
      images = files.filter(f => f.mimetype.startsWith('image')).map(f => `/uploads/${f.filename}`);
      videos = files.filter(f => f.mimetype.startsWith('video')).map(f => `/uploads/${f.filename}`);
    }

    const post = await Post.create({ author: req.user.id, content, images, videos });

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

    const posts = await Post.find({ isDeleted: false, visibility: 'public' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profilePicture')
      .lean();

    res.json({ posts, page, limit });
  } catch (err) {
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id).populate('author', 'username profilePicture');
    if (!post || post.isDeleted) return res.status(404).json({ error: 'Post not found' });
    res.json({ post });
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

    const exists = post.likes.includes(userId);
    if (exists) {
      post.likes = post.likes.filter(u => u.toString() !== userId);
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
