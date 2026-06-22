const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/passwordHash');
const { sendEmail } = require('../utils/emailSender');
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

async function requestPasswordReset(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const [rows] = await pool.execute(
    `
      SELECT
        account_group_id,
        email
      FROM activated_portal_users
      WHERE email COLLATE utf8mb4_unicode_ci
          = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci
        AND status = 'ACTIVE'
      ORDER BY activated_at DESC
      LIMIT 1
    `,
    [normalizedEmail]
  );

  if (!rows.length) return null;

  const resetCode = crypto.randomInt(100000, 999999).toString();
  const { hash, salt } = hashPassword(resetCode);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const user = rows[0];
  const templatePath = path.join(__dirname, '../templates/email/password-reset-code.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace('{{CODE}}', resetCode);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `
        UPDATE activated_portal_users
        SET
          password_hash = ?,
          password_salt = ?,
          must_change_password = 1,
          temp_password_expires_at = ?,
          updated_at = NOW()
        WHERE account_group_id = ?
          AND status = 'ACTIVE'
      `,
      [hash, salt, expiresAt, user.account_group_id]
    );

    await sendEmail(user.email, 'Recupero password Idromardi', html);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { expiresAt: expiresAt.toISOString() };
}

module.exports = {
  authenticatePortalUser,
  updateTemporaryPassword,
  requestPasswordReset,
};
