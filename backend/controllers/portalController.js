const {
  getPortalDataByAccountGroupId,
  updatePortalProfile,
  exportInvoicesByAccountGroupId,
  askPortalAssistant
} = require("../services/portalService");

 

async function chatWithPortalAssistant(req, res, next) {
  try {
    const accountGroupId = req.user?.accountGroupId;
    const message = String(req.body.message || "").trim();

    if (!accountGroupId) {
      return res.status(401).json({ message: "Sessione non valida." });
    }

    if (!message) {
      return res.status(400).json({ message: "Messaggio obbligatorio." });
    }

    const answer = await askPortalAssistant(accountGroupId, message);

    return res.json({ answer });
  } catch (error) {
    return next(error);
  }
}

async function getCurrentPortalUser(req, res, next) {
  try {
    const accountGroupId = req.user?.accountGroupId;

    if (!accountGroupId) {
      return res.status(401).json({ message: "Sessione non valida." });
    }

    const data = await getPortalDataByAccountGroupId(accountGroupId);

    if (!data) {
      return res.status(404).json({ message: "Profilo non trovato." });
    }

    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

async function exportCurrentPortalInvoices(req, res, next) {
  try {
    const accountGroupId = req.user?.accountGroupId;

    if (!accountGroupId) {
      return res.status(401).json({ message: "Sessione non valida." });
    }

    const buffer = await exportInvoicesByAccountGroupId(accountGroupId);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="fatture-idromardi.xlsx"'
    );

    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}

async function updateCurrentPortalProfile(req, res, next) {
  try {
    const accountGroupId = req.user?.accountGroupId;

    if (!accountGroupId) {
      return res.status(401).json({ message: "Sessione non valida." });
    }

    const phone = String(req.body.phone || "").trim();
    const mobile = String(req.body.mobile || "").trim();
    const fiscalCode = String(req.body.fiscalCode || "").trim().toUpperCase();

    const data = await updatePortalProfile(accountGroupId, {
      phone,
      mobile,
      fiscalCode,
    });

    if (!data) {
      return res.status(404).json({ message: "Profilo non trovato." });
    }

    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCurrentPortalUser,
  updateCurrentPortalProfile,
  exportCurrentPortalInvoices,
  chatWithPortalAssistant,
};