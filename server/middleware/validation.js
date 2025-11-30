const { body, validationResult } = require('express-validator');

const registerValidators = [
  body('username').isLength({ min: 3 }).withMessage('username must be at least 3 characters'),
  body('email').isEmail().withMessage('invalid email'),
  body('password').isStrongPassword({ minLength: 8 }).withMessage('password must be strong')
];

const loginValidators = [
  body('email').isEmail().withMessage('invalid email'),
  body('password').notEmpty().withMessage('password required')
];

const postValidators = [
  body('content').optional().isLength({ max: 2000 }).withMessage('content too long')
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

module.exports = {
  registerValidators,
  loginValidators,
  postValidators,
  handleValidation
};
