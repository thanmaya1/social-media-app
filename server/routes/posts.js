const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const postController = require('../controllers/postController');
const { postValidators, handleValidation } = require('../middleware/validation');

router.post('/', auth, upload.array('files', 6), postValidators, handleValidation, postController.createPost);
router.get('/', postController.getFeed);
router.get('/:id', postController.getPost);
router.post('/:id/like', auth, postController.likePost);

module.exports = router;
