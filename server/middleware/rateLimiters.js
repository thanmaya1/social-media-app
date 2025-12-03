const rateLimit = require('express-rate-limit');

const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit account creation per IP
  message: { error: 'Too many accounts created from this IP, try again later' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit login attempts per IP
  message: { error: 'Too many login attempts, please try again later' },
});

module.exports = { createAccountLimiter, loginLimiter };
