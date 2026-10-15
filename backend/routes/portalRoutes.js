const express = require('express');
const {
  getCurrentPortalUser,
  updateCurrentPortalProfile,
   exportCurrentPortalInvoices,
   chatWithPortalAssistant,
} = require('../controllers/portalController');
const authMiddleware = require("../middleware/authMiddleware");

 


const router = express.Router();
router.use('/support', require('./supportRoutes'));

router.get("/me", authMiddleware, getCurrentPortalUser);
router.put("/profile", authMiddleware, updateCurrentPortalProfile);
router.get("/invoices/export", authMiddleware, exportCurrentPortalInvoices);
router.post("/chat", authMiddleware, chatWithPortalAssistant);


module.exports = router;
