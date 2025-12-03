const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { upload, createThumbnails } = require('../middleware/upload');
const postController = require('../controllers/postController');
const { postValidators, handleValidation } = require('../middleware/validation');
const commentsRoutes = require('./comments');

router.post(
  '/',
  auth,
  upload.array('files', 6),
  createThumbnails,
  postValidators,
  handleValidation,
  postController.createPost
);
// Drafts management
router.get('/drafts', auth, postController.getDrafts);
router.post('/drafts/:id/publish', auth, postController.publishDraft);
// Search posts (q or tag)
router.get('/search', postController.searchPosts);
// Trending feed
router.get('/trending', postController.getTrending);
router.get('/', postController.getFeed);
router.get('/:id', postController.getPost);
router.post('/:id/like', auth, postController.likePost);
router.post('/:id/share', auth, postController.sharePost);
router.put('/:id', auth, postController.updatePost);
router.delete('/:id', auth, postController.deletePost);

// mount comments sub-router: /api/posts/:postId/comments
router.use('/:postId/comments', commentsRoutes);

module.exports = router;
