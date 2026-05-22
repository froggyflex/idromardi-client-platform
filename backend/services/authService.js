const crypto = require('crypto');
const pool = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/passwordHash');
const jwt = require("jsonwebtoken");
function createSession(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET non definito.");
  }

  const token = jwt.sign(
    {
      portalUserId: user.portalUserId,
      accountGroupId: user.accountGroupId,
      idAuto: user.idAuto,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    email: user.email,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

async function authenticatePortalUser(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        account_group_id,
        id_auto,
        id_user,
        id_Condominio,
        email,
        password_hash,
        password_salt,
        must_change_password,
        temp_password_expires_at
      FROM activated_portal_users
      WHERE email COLLATE utf8mb4_unicode_ci
          = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci
        AND status = 'ACTIVE'
        AND password_hash IS NOT NULL
        AND password_salt IS NOT NULL
      ORDER BY activated_at DESC
    `,
    [normalizedEmail]
  );

  if (!rows.length) return null;

  let matchedUser = null;

  for (const row of rows) {
    const isValidPassword = verifyPassword(
      password,
      row.password_salt,
      row.password_hash
    );

    if (isValidPassword) {
      matchedUser = row;
      break;
    }
  }

  if (!matchedUser) return null;

  if (
    matchedUser.must_change_password &&
    matchedUser.temp_password_expires_at &&
    new Date(matchedUser.temp_password_expires_at) < new Date()
  ) {
    return null;
  }

  await pool.execute(
    `
      UPDATE activated_portal_users
      SET last_login_at = NOW()
      WHERE account_group_id = ?
    `,
    [matchedUser.account_group_id]
  );

  return createSession({
    portalUserId: matchedUser.id,
    accountGroupId: matchedUser.account_group_id,
    idAuto: matchedUser.id_auto,
    email: matchedUser.email,
    mustChangePassword: matchedUser.must_change_password,
  });
}

async function updateTemporaryPassword(email, currentPassword, newPassword) {
  const session = await authenticatePortalUser(email, currentPassword);

  if (!session || !session.mustChangePassword) {
    return null;
  }

  const decoded = jwt.verify(session.token, process.env.JWT_SECRET);

  const { hash, salt } = hashPassword(newPassword);

  await pool.execute(
    `
      UPDATE activated_portal_users
      SET
        password_hash = ?,
        password_salt = ?,
        must_change_password = 0,
        temp_password_expires_at = NULL,
        password_changed_at = NOW(),
        updated_at = NOW()
      WHERE account_group_id = ?
        AND status = 'ACTIVE'
    `,
    [hash, salt, decoded.accountGroupId]
  );

  return createSession({
    portalUserId: decoded.portalUserId,
    accountGroupId: decoded.accountGroupId,
    idAuto: decoded.idAuto,
    email: decoded.email,
    mustChangePassword: false,
  });
}
module.exports = {
  authenticatePortalUser,
  updateTemporaryPassword,
};
