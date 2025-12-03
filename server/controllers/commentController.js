const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { isBlocked } = require('../utils/blocks');

// Create a comment on a post
exports.createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const files = req.files || [];

    const post = await Post.findById(postId).select('author');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // disallow commenting if either party has blocked the other
    if (await isBlocked(req.user.id, post.author))
      return res.status(403).json({ error: 'You cannot comment on this post' });

    if (!content && files.length === 0) return res.status(400).json({ error: 'Empty comment' });

    const images = files
      .filter((f) => f.mimetype.startsWith('image'))
      .map((f) => `/uploads/${f.filename}`);

    const comment = await Comment.create({ post: postId, author: req.user.id, content, images });

    // add reference to post
    await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });

    const populated = await Comment.findById(comment._id).populate(
      'author',
      'username profilePicture'
    );

    // emit socket event if available
    if (req.app && req.app.get('io'))
      req.app.get('io').emit('post_commented', { postId, comment: populated });

    res.status(201).json({ comment: populated });
  } catch (err) {
    next(err);
  }
};

// Get comments for a post (paginated)
exports.getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ post: postId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profilePicture')
      .lean();

    res.json({ comments, page, limit });
  } catch (err) {
    next(err);
  }
};

// Update a comment (author or admin)
exports.updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) return res.status(404).json({ error: 'Comment not found' });
    if (
      comment.author.toString() !== req.user.id &&
      !(Array.isArray(req.user.roles) && req.user.roles.includes('admin'))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    comment.content = content || comment.content;
    await comment.save();
    const populated = await Comment.findById(comment._id).populate(
      'author',
      'username profilePicture'
    );
    res.json({ comment: populated });
  } catch (err) {
    next(err);
  }
};

// Delete (soft) a comment
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) return res.status(404).json({ error: 'Comment not found' });
    if (
      comment.author.toString() !== req.user.id &&
      !(Array.isArray(req.user.roles) && req.user.roles.includes('admin'))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    comment.isDeleted = true;
    await comment.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Like or unlike a comment
exports.likeComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) return res.status(404).json({ error: 'Comment not found' });
    // prevent liking if blocked
    if (await isBlocked(userId, comment.author)) return res.status(403).json({ error: 'Forbidden' });

    const exists = comment.likes.some((u) => u.toString() === userId);
    if (exists) comment.likes = comment.likes.filter((u) => u.toString() !== userId);
    else comment.likes.push(userId);

    await comment.save();
    const populated = await Comment.findById(commentId).populate(
      'author',
      'username profilePicture'
    );
    res.json({ comment: populated });
  } catch (err) {
    next(err);
  }
};

// Reply to a comment (creates a new comment and links it as reply)
exports.replyToComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const files = req.files || [];
    if (!content && files.length === 0) return res.status(400).json({ error: 'Empty reply' });

    const parent = await Comment.findById(commentId);
    if (!parent || parent.isDeleted)
      return res.status(404).json({ error: 'Parent comment not found' });

    // Do not allow replying if parent author or post author has blocked the replier
    if (await isBlocked(req.user.id, parent.author))
      return res.status(403).json({ error: 'You cannot reply to this comment' });

    // Also check post author
    const Post = require('../models/Post');
    const post = await Post.findById(parent.post).select('author');
    if (post && (await isBlocked(req.user.id, post.author)))
      return res.status(403).json({ error: 'You cannot reply on this post' });

    const images = files
      .filter((f) => f.mimetype.startsWith('image'))
      .map((f) => `/uploads/${f.filename}`);

    const reply = await Comment.create({ post: parent.post, author: req.user.id, content, images });
    parent.replies.push(reply._id);
    await parent.save();

    const populated = await Comment.findById(reply._id).populate(
      'author',
      'username profilePicture'
    );
    res.status(201).json({ comment: populated });
  } catch (err) {
    next(err);
  }
};
