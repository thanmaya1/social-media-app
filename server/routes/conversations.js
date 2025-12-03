const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const convController = require('../controllers/conversationController');

router.get('/', auth, convController.getConversations);
router.get('/:conversationId/search', auth, convController.searchMessages);
router.post('/:conversationId/mute', auth, convController.muteConversation);
router.post('/:conversationId/unmute', auth, convController.unmuteConversation);

module.exports = router;
