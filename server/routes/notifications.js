const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');
const requireRole = require('../middleware/authorize');

router.get('/', auth, notificationController.getNotifications);
router.put('/:notificationId/read', auth, notificationController.markRead);
router.put('/read-all', auth, notificationController.markAllRead);
router.get('/unread-count', auth, notificationController.unreadCount);
router.delete('/:notificationId', auth, notificationController.deleteNotification);

// Admin-only example route: notification stats
router.get('/admin/stats', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const Notification = require('../models/Notification');
    const total = await Notification.countDocuments();
    res.json({ total });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
