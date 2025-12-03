const { body, validationResult } = require('express-validator');

const registerValidators = [
  body('username').isLength({ min: 3 }).withMessage('username must be at least 3 characters'),
  body('email').isEmail().withMessage('invalid email'),
  body('password').isStrongPassword({ minLength: 8 }).withMessage('password must be strong'),
];

const loginValidators = [
  body('email').isEmail().withMessage('invalid email'),
  body('password').notEmpty().withMessage('password required'),
];

const postValidators = [
  body('content').optional().isLength({ max: 2000 }).withMessage('content too long'),
];

const commentValidators = [
  body('content').optional().isLength({ max: 1000 }).withMessage('comment too long'),
];

const userUpdateValidators = [
  body('username')
    .optional()
    .isLength({ min: 3 })
    .withMessage('username must be at least 3 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('bio too long'),
  body('website').optional().isURL().withMessage('invalid website URL'),
];

const messageValidators = [
  body('recipient').notEmpty().withMessage('recipient required'),
  body('content').optional().isLength({ max: 2000 }).withMessage('message too long'),
];

const forgotValidators = [body('email').isEmail().withMessage('invalid email')];

const resetValidators = [
  body('password').isStrongPassword({ minLength: 8 }).withMessage('password must be strong'),
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
  handleValidation,
  commentValidators,
  userUpdateValidators,
  messageValidators,
  forgotValidators,
  resetValidators,
};
