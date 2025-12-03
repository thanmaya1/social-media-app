const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { upload, createThumbnails } = require('../middleware/upload');
const { userUpdateValidators, handleValidation } = require('../middleware/validation');

// batch users
router.get('/batch', userController.getUsersBatch);

// public profile by id
router.get('/:id', userController.getUserById);

// update profile
router.put('/:id', auth, userUpdateValidators, handleValidation, userController.updateProfile);

// avatar and cover upload
router.put('/:id/avatar', auth, upload.single('file'), createThumbnails, userController.uploadAvatar);
router.put('/:id/cover', auth, upload.single('file'), createThumbnails, userController.uploadCover);

// Change password (protected, user only)
router.put('/:id/password', auth, userController.changePassword);

// Request verification (issue verified badge) - user may request for themselves
router.post('/:id/verify-request', auth, userController.requestVerification);

// Settings
router.get('/:id/settings', auth, userController.getSettings);
router.put('/:id/settings', auth, userController.updateSettings);

// follow/unfollow/block/unblock
router.post('/:id/follow', auth, userController.follow);
router.post('/:id/unfollow', auth, userController.unfollow);
router.post('/:id/block', auth, userController.block);
router.post('/:id/unblock', auth, userController.unblock);

// followers / following
router.get('/:id/followers', userController.getFollowers);
router.get('/:id/following', userController.getFollowing);

// GET /api/users/me
router.get('/me', auth, userController.getProfile);

// GET /api/users?q=search term
router.get('/', userController.searchUsers);

module.exports = router;
