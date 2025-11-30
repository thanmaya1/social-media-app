const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/', auth, notificationController.getNotifications);
router.put('/:notificationId/read', auth, notificationController.markRead);
router.put('/read-all', auth, notificationController.markAllRead);
router.get('/unread-count', auth, notificationController.unreadCount);

module.exports = router;
