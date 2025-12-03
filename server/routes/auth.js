const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  registerValidators,
  loginValidators,
  handleValidation,
} = require('../middleware/validation');
const { createAccountLimiter, loginLimiter } = require('../middleware/rateLimiters');

router.post(
  '/register',
  createAccountLimiter,
  registerValidators,
  handleValidation,
  authController.register
);
router.post('/login', loginLimiter, loginValidators, handleValidation, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// OAuth routes (Google / GitHub)
try {
  // passport will only be configured if env vars available
  // route: GET /api/auth/google
  const passport = require('passport');
  if (passport && passport.authenticate) {
    // Use dynamic authenticate wrapper so we can pass through `state` from client
    router.get('/google', (req, res, next) => {
      const opts = { scope: ['profile', 'email'] };
      if (req.query && req.query.state) opts.state = req.query.state;
      passport.authenticate('google', opts)(req, res, next);
    });

    router.get(
      '/google/callback',
      (req, res, next) => passport.authenticate('google', { session: false, failureRedirect: process.env.CLIENT_URL || '/' })(req, res, next),
      authController.oauthRedirect
    );

    router.get('/github', (req, res, next) => {
      const opts = { scope: ['user:email'] };
      if (req.query && req.query.state) opts.state = req.query.state;
      passport.authenticate('github', opts)(req, res, next);
    });

    router.get(
      '/github/callback',
      (req, res, next) => passport.authenticate('github', { session: false, failureRedirect: process.env.CLIENT_URL || '/' })(req, res, next),
      authController.oauthRedirect
    );
  }
} catch (e) {
  // ignore when passport not configured
}

module.exports = router;
