const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const adminController = require('../controllers/adminController2');

// All admin routes require authentication and admin role
router.use(auth, requireRole('admin'));

// Users management
router.get('/users', adminController.listUsers);
router.put('/users/:userId/roles', adminController.updateRoles);
router.delete('/users/:userId', adminController.deleteUser);
router.post('/users/:userId/ban', adminController.banUser);
router.post('/users/:userId/unban', adminController.unbanUser);
router.post('/users/:userId/verify', adminController.verifyUser);
router.post('/users/:userId/unverify', adminController.unverifyUser);

// Moderation
router.get('/moderation/queue', adminController.getModerationQueue);
router.post('/moderation/reports/:id/resolve', adminController.resolveReport);
router.post('/moderation/reports/bulk', adminController.bulkResolveReports);
// Auto-verify users who requested verification and meet criteria
router.post('/auto-verify', adminController.autoVerify);
// Settings
router.get('/settings', adminController.getSettings);
router.post('/settings/auto-verify', adminController.setAutoVerify);
// Dev/admin maintenance: run backfill to populate tags for legacy posts
router.post('/backfill/tags', adminController.runBackfillTags);

module.exports = router;
