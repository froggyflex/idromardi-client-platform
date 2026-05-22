const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token mancante." });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Formato token non valido." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      portalUserId: decoded.portalUserId,
      accountGroupId: decoded.accountGroupId,
      idAuto: decoded.idAuto,
      email: decoded.email,
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Token non valido o scaduto." });
  }
}

module.exports = authMiddleware;