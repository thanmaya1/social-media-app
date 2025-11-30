const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users?q=search term
router.get('/', userController.searchUsers);

module.exports = router;
