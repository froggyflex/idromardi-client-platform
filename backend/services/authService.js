const pool = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/passwordHash');
const { normalizeAccessIdentifier } = require('../utils/registrationValidation');
const { findMatchingUser } = require('./registrationService');
const jwt = require('jsonwebtoken');

function createSession(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET non definito.');
  }

  const token = jwt.sign(
    {
      portalUserId: user.portalUserId,
      accountGroupId: user.accountGroupId,
      idAuto: user.idAuto,
      accessIdentifier: user.accessIdentifier,
      email: user.email || '',
      phone: user.phone || '',
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );

  return {
    token,
    accessIdentifier: user.accessIdentifier,
    email: user.email || '',
    phone: user.phone || '',
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

async function authenticatePortalUser(identifier, password) {
  const accessIdentifier = normalizeAccessIdentifier(identifier);

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        account_group_id,
        id_auto,
        id_user,
        id_Condominio,
        email,
        '' AS phone,
        access_identifier,
        password_hash,
        password_salt,
        must_change_password,
        temp_password_expires_at
      FROM activated_portal_users
      WHERE access_identifier = ?
        AND status = 'ACTIVE'
        AND password_hash IS NOT NULL
        AND password_salt IS NOT NULL
      ORDER BY activated_at DESC
    `,
    [accessIdentifier],
  );

  if (!rows.length) return null;

  let matchedUser = null;

  for (const row of rows) {
    const isValidPassword = verifyPassword(
      password,
      row.password_salt,
      row.password_hash,
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
    [matchedUser.account_group_id],
  );

  return createSession({
    portalUserId: matchedUser.id,
    accountGroupId: matchedUser.account_group_id,
    idAuto: matchedUser.id_auto,
    email: matchedUser.email,
    phone: matchedUser.phone,
    accessIdentifier: matchedUser.access_identifier,
    mustChangePassword: matchedUser.must_change_password,
  });
}

async function updateTemporaryPassword(identifier, currentPassword, newPassword) {
  const session = await authenticatePortalUser(identifier, currentPassword);

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
    [hash, salt, decoded.accountGroupId],
  );

  return createSession({
    portalUserId: decoded.portalUserId,
    accountGroupId: decoded.accountGroupId,
    idAuto: decoded.idAuto,
    email: decoded.email,
    phone: decoded.phone,
    accessIdentifier: decoded.accessIdentifier,
    mustChangePassword: false,
  });
}

async function verifyPasswordResetIdentity(payload) {
  const accessIdentifier = normalizeAccessIdentifier(payload.numeroUtenza);
  const match = await findMatchingUser(payload);

  if (!match) return null;

  const [rows] = await pool.execute(
    `
      SELECT account_group_id, id, id_auto, email, '' AS phone, access_identifier
      FROM activated_portal_users
      WHERE (
          access_identifier = ?
          OR (
            id_Condominio = ?
            AND id_user IN (${match.userIds.map(() => '?').join(', ')})
          )
        )
        AND status = 'ACTIVE'
      ORDER BY activated_at DESC
      LIMIT 1
    `,
    [accessIdentifier, match.idCondominio, ...match.userIds],
  );

  if (!rows.length) return null;

  const user = rows[0];
  const resetToken = jwt.sign(
    {
      purpose: 'password_reset',
      portalUserId: user.id,
      accountGroupId: user.account_group_id,
      idAuto: user.id_auto,
      email: user.email || '',
      phone: user.phone || '',
      accessIdentifier,
    },
    process.env.JWT_SECRET,
    { expiresIn: '10m' },
  );

  return {
    resetToken,
    accessIdentifier,
  };
}

async function resetPasswordWithToken(resetToken, newPassword) {
  let decoded;

  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    return null;
  }

  if (decoded.purpose !== 'password_reset' || !decoded.accountGroupId) {
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
        access_identifier = ?,
        password_changed_at = NOW(),
        updated_at = NOW()
      WHERE account_group_id = ?
        AND status = 'ACTIVE'
    `,
    [hash, salt, decoded.accessIdentifier, decoded.accountGroupId],
  );

  return createSession({
    portalUserId: decoded.portalUserId,
    accountGroupId: decoded.accountGroupId,
    idAuto: decoded.idAuto,
    email: decoded.email,
    phone: decoded.phone,
    accessIdentifier: decoded.accessIdentifier,
    mustChangePassword: false,
  });
}

module.exports = {
  authenticatePortalUser,
  resetPasswordWithToken,
  updateTemporaryPassword,
  verifyPasswordResetIdentity,
};
