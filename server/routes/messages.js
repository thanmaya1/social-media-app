const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const messageController = require('../controllers/messageController');

router.get('/:userId', auth, messageController.getMessagesWithUser);
router.put('/:messageId/read', auth, messageController.markRead);

module.exports = router;
