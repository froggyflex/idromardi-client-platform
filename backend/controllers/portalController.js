const {
  getPortalDataByEmail,
  updatePortalProfile,
} = require('../services/portalService');

function getEmailFromRequest(req) {
  return String(req.query.email || req.body.email || '').trim().toLowerCase();
}

async function getCurrentPortalUser(req, res, next) {
  try {
    const email = getEmailFromRequest(req);

    if (!email) {
      return res.status(400).json({ message: 'Email sessione mancante.' });
    }

    const portalData = await getPortalDataByEmail(email);

    if (!portalData) {
      return res.status(404).json({ message: 'Profilo portale non trovato.' });
    }

    return res.json(portalData);
  } catch (error) {
    return next(error);
  }
}

async function updateCurrentPortalProfile(req, res, next) {
  try {
    const email = getEmailFromRequest(req);
    const phone = String(req.body.phone || '').trim();
    const mobile = String(req.body.mobile || '').trim();
    const fiscalCode = String(req.body.fiscalCode || '').trim().toUpperCase();

    if (!email) {
      return res.status(400).json({ message: 'Email sessione mancante.' });
    }

    const portalData = await updatePortalProfile(email, { phone, mobile, fiscalCode });

    if (!portalData) {
      return res.status(404).json({ message: 'Profilo portale non trovato.' });
    }

    return res.json(portalData);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCurrentPortalUser,
  updateCurrentPortalProfile,
};
