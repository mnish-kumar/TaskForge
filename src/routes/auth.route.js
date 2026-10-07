const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validator = require('../middlewares/validator.middleware');

router.post('/register', validator.registerUserValidation, authController.register);
router.post('/login', validator.validateLogin, authController.login);

router.post('/logout', authMiddleware, authController.logout);

module.exports = router;