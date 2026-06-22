const express = require('express');
const { login, forgotPassword, changeTemporaryPassword } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/change-temporary-password', changeTemporaryPassword);

module.exports = router;
