const express = require('express');
const { requestRegistration, resendCode } = require('../controllers/registrationController');

const router = express.Router();

router.post('/request', requestRegistration);
router.post('/resend', resendCode);

module.exports = router;
