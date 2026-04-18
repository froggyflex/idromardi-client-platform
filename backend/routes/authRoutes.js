const express = require('express');
const { login, changeTemporaryPassword } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/change-temporary-password', changeTemporaryPassword);

module.exports = router;
