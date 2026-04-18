const crypto = require('crypto');
const pool = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/passwordHash');

function createSession(email, mustChangePassword) {
  return {
    token: crypto.randomUUID(),
    email,
    mustChangePassword: Boolean(mustChangePassword),
  };
}

async function authenticatePortalUser(email, password) {
  const [rows] = await pool.execute(
    `
      SELECT
        email,
        password_hash,
        password_salt,
        must_change_password,
        temp_password_expires_at
      FROM activated_portal_users
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
        AND status = 'ACTIVE'
        AND password_hash IS NOT NULL
        AND password_salt IS NOT NULL
      ORDER BY activated_at DESC
    `,
    [email],
  );

  if (rows.length === 0) {
    return null;
  }

  const primaryUser = rows[0];
  const isValidPassword = verifyPassword(
    password,
    primaryUser.password_salt,
    primaryUser.password_hash,
  );

  if (!isValidPassword) {
    return null;
  }

  if (
    primaryUser.must_change_password &&
    primaryUser.temp_password_expires_at &&
    new Date(primaryUser.temp_password_expires_at) < new Date()
  ) {
    return null;
  }

  await pool.execute(
    `
      UPDATE activated_portal_users
      SET last_login_at = NOW()
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
        AND status = 'ACTIVE'
    `,
    [email],
  );

  return createSession(email, primaryUser.must_change_password);
}

async function updateTemporaryPassword(email, currentPassword, newPassword) {
  const session = await authenticatePortalUser(email, currentPassword);

  if (!session || !session.mustChangePassword) {
    return null;
  }

  const { hash, salt } = hashPassword(newPassword);

  await pool.execute(
    `
      UPDATE activated_portal_users
      SET
        password_hash = ?,
        password_salt = ?,
        must_change_password = 0,
        temp_password_expires_at = NULL,
        password_changed_at = NOW()
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
        AND status = 'ACTIVE'
    `,
    [hash, salt, email],
  );

  return createSession(email, false);
}

module.exports = {
  authenticatePortalUser,
  updateTemporaryPassword,
};
