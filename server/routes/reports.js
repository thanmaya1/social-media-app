const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Report = require('../models/Report');

// Create a report (authenticated users)
router.post('/', auth, async (req, res, next) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId) return res.status(400).json({ error: 'Invalid report' });
    const r = await Report.create({ reporter: req.user.id, targetType, targetId, reason });
    // notify admins via notification service (force=true to bypass prefs)
    try {
      const notificationService = require('../utils/notificationService');
      const admins = await require('../models/User').find({ roles: 'admin' }).select('_id').lean();
      for (const a of admins) {
        // create a system notification to alert admins of a new report
        try {
          await notificationService.createNotification({
            recipient: a._id,
            sender: req.user.id,
            type: 'system',
            message: `New report: ${targetType} ${targetId}`,
            app: req.app,
            force: true,
          });
        } catch (e) {}
      }
    } catch (e) {
      // ignore notification failures
    }

    res.status(201).json({ report: r });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
