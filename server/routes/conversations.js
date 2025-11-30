const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const convController = require('../controllers/conversationController');

router.get('/', auth, convController.getConversations);

module.exports = router;
