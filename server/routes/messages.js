const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const messageController = require('../controllers/messageController');
const { upload, createThumbnails } = require('../middleware/upload');
const { messageValidators, handleValidation } = require('../middleware/validation');
const requireRole = require('../middleware/authorize');

router.post(
  '/',
  auth,
  upload.array('files', 4),
  createThumbnails,
  messageValidators,
  handleValidation,
  messageController.sendMessage
);
router.get('/:userId', auth, messageController.getMessagesWithUser);
router.get('/search', auth, messageController.searchMessages);
router.put('/:messageId/read', auth, messageController.markRead);
router.delete('/:messageId', auth, messageController.deleteMessageForUser);
// admin-only route to forcibly delete a message
router.post('/:messageId/admin-delete', auth, requireRole('admin'), messageController.adminDeleteMessage);

module.exports = router;
