const express = require('express');
const { requestRegistration } = require('../controllers/registrationController');

const router = express.Router();

router.post('/request', requestRegistration);

module.exports = router;
