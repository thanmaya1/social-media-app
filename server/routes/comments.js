const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const { upload, createThumbnails } = require('../middleware/upload');
const commentController = require('../controllers/commentController');
const { commentValidators, handleValidation } = require('../middleware/validation');

// POST /api/posts/:postId/comments - create comment (protected)
router.post(
  '/',
  auth,
  upload.array('files', 4),
  createThumbnails,
  commentValidators,
  handleValidation,
  commentController.createComment
);

// GET /api/posts/:postId/comments - list comments
router.get('/', commentController.getComments);

// PUT /api/posts/:postId/comments/:commentId - update comment
router.put('/:commentId', auth, commentController.updateComment);

// DELETE /api/posts/:postId/comments/:commentId - delete comment
router.delete('/:commentId', auth, commentController.deleteComment);

// POST /api/posts/:postId/comments/:commentId/like - like/unlike
router.post('/:commentId/like', auth, commentController.likeComment);

// POST /api/posts/:postId/comments/:commentId/reply - reply to comment
router.post(
  '/:commentId/reply',
  auth,
  upload.array('files', 4),
  createThumbnails,
  commentValidators,
  handleValidation,
  commentController.replyToComment
);

module.exports = router;
