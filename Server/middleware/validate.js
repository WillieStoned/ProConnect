const { body, validationResult } = require('express-validator');

// Return validation errors as a structured response
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// Registration validation rules
const validateRegister = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Full name contains invalid characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  handleValidationErrors,
];

// Login validation rules
const validateLogin = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

// Message validation rules
const validateMessage = [
  body('receiver_id').isInt({ min: 1 }).withMessage('Invalid receiver ID'),
  body('content').trim().notEmpty().withMessage('Message content is required').isLength({ max: 2000 }).withMessage('Message too long'),
  handleValidationErrors,
];

// Event validation rules
const validateEvent = [
  body('title').trim().notEmpty().withMessage('Event title is required').isLength({ max: 200 }),
  body('start_date').isISO8601().withMessage('Invalid start date'),
  body('end_date').isISO8601().withMessage('Invalid end date'),
  body('event_type').isIn(['in-person', 'virtual', 'hybrid']).withMessage('Invalid event type'),
  handleValidationErrors,
];

module.exports = { validateRegister, validateLogin, validateMessage, validateEvent };
