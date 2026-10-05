const { validationResult, body } = require("express-validator");

const responseWithValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  next();
};

const registerUserValidation = [
  body("username")
    .isString()
    .withMessage("Username must be a string")
    .trim()
    .isLength({ min: 3, max: 80 })
    .withMessage("Username must be between 3 and 80 characters"),

  body("email")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage("Email is too long"),

  body("password")
    .isString()
    .withMessage("Password must be a string")
    .isLength({ min: 6, max: 100 })
    .withMessage("Password must be between 6 and 100 characters"),

  responseWithValidationErrors,
];

const validateLogin = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage("Email is too long"),

  body("password")
    .isString()
    .withMessage("Password must be a string")
    .isLength({ min: 6, max: 100 })
    .withMessage("Password must be between 6 and 100 characters"),

  responseWithValidationErrors,
];

module.exports = {
  registerUserValidation,
  validateLogin,
};