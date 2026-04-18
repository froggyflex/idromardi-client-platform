const express = require('express');
const {
  getCurrentPortalUser,
  updateCurrentPortalProfile,
} = require('../controllers/portalController');

const router = express.Router();

router.get('/me', getCurrentPortalUser);
router.put('/profile', updateCurrentPortalProfile);

module.exports = router;
