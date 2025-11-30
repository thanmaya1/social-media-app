const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerValidators, loginValidators, handleValidation } = require('../middleware/validation');
const { createAccountLimiter, loginLimiter } = require('../middleware/rateLimiters');

router.post('/register', createAccountLimiter, registerValidators, handleValidation, authController.register);
router.post('/login', loginLimiter, loginValidators, handleValidation, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;
