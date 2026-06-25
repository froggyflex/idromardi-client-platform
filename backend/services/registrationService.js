const crypto = require('crypto');
const pool = require('../config/db');
const { hashPassword } = require('../utils/passwordHash');
const { normalizePhone } = require('../utils/registrationValidation');

function parseNumeroUtenza(numeroUtenza) {
  const prefix = process.env.NUMERO_UTENZA_PREFIX || '400';

  if (!numeroUtenza.startsWith(prefix)) {
    throw new Error('Prefisso numero utenza non valido');
  }

  const [baseNumber, ...extraParts] = numeroUtenza.split('/');
  const baseWithoutPrefix = baseNumber.slice(prefix.length);
  const separator = '000';
  const separatorIndex = baseWithoutPrefix.indexOf(separator);

  if (separatorIndex === -1) {
    throw new Error('Formato numero utenza non valido (manca separatore 000)');
  }

  const condominioPart = baseWithoutPrefix.slice(0, separatorIndex);
  const userPart = baseWithoutPrefix.slice(separatorIndex + separator.length);
  const userIds = [Number(userPart)];

  for (const part of extraParts) {
    if (part) {
      userIds.push(Number(part));
    }
  }

  return {
    idCondominio: Number(condominioPart),
    userIds: [...new Set(userIds)],
  };
}

async function findMatchingUser(payload) {
  const { idCondominio, userIds } = parseNumeroUtenza(payload.numeroUtenza);

  if (!userIds.length) return null;

  const userPlaceholders = userIds.map(() => '?').join(', ');
  const nome = String(payload.nome || '').trim();
  const cognome = String(payload.cognome || '').trim();
  const fiscalCode = String(payload.fiscalCode || '').trim().toUpperCase();
  const inputInterno = normalizeComparable(payload.interno);
  const inputMeterSerial = normalizeComparable(payload.meterSerial);
  const inputMobile = normalizePhone(payload.mobile);

  const [rows] = await pool.execute(
    `
      SELECT
        u.id AS id_auto,
        u.id_user,
        c.codice AS id_Condominio,
        u.Interno,
        u.Nome,
        u.Cognome,
        u.Mobile,
        u.Matricola_Contatore,
        u.C_F,
        u.Stato AS Status
      FROM utenze_v2 u
      INNER JOIN condomini_v2 c
        ON c.id COLLATE utf8mb4_unicode_ci
         = u.condominio_id COLLATE utf8mb4_unicode_ci
      WHERE c.codice = ?
        AND u.id_user IN (${userPlaceholders})
        AND u.Stato = 'ATTIVA'
    `,
    [idCondominio, ...userIds],
  );

  const matchedUserIds = new Set(rows.map((row) => Number(row.id_user)));
  const allUsersMatched = userIds.every((idUser) => matchedUserIds.has(Number(idUser)));

  if (!allUsersMatched) return null;

  const allNamesMatch = rows.every((row) => {
    const storedName = String(row.Nome || '').trim().toLowerCase();

    return !storedName || !nome || storedName === nome.toLowerCase();
  });

  const allSurnamesMatch = rows.every(
    (row) => String(row.Cognome || '').trim().toLowerCase() === cognome.toLowerCase(),
  );

  const storedFiscalCodes = rows
    .map((row) => String(row.C_F || '').trim().replace(/\s/g, '').toUpperCase())
    .filter(Boolean);
  const hasStoredFiscalCode = storedFiscalCodes.length > 0;
  const hasFiscalCodeMatch = storedFiscalCodes.includes(fiscalCode);
  const fallbackScore = getFallbackIdentityScore(rows, {
    interno: inputInterno,
    meterSerial: inputMeterSerial,
    mobile: inputMobile,
  });
  const hasFallbackIdentityMatch = !hasStoredFiscalCode && fallbackScore >= 2;

  if (!allNamesMatch || !allSurnamesMatch) return null;

  if (hasStoredFiscalCode && !hasFiscalCodeMatch) return null;

  if (!hasStoredFiscalCode && !hasFallbackIdentityMatch) return null;

  return {
    idCondominio,
    userIds,
    users: rows,
    primaryUser: rows[0],
    identityMode: hasStoredFiscalCode ? 'fiscal_code' : 'fallback_fields',
  };
}

function normalizeComparable(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

function getFallbackIdentityScore(rows, input) {
  let score = 0;

  if (
    input.meterSerial &&
    rows.some((row) => normalizeComparable(row.Matricola_Contatore) === input.meterSerial)
  ) {
    score += 2;
  }

  if (
    input.mobile.length >= 6 &&
    rows.some((row) => normalizePhone(row.Mobile).endsWith(input.mobile))
  ) {
    score += 2;
  }

  if (input.interno && rows.some((row) => normalizeComparable(row.Interno) === input.interno)) {
    score += rows.length === 1 ? 2 : 1;
  }

  return score;
}

async function assertAccessIdentifierAvailable(accessIdentifier) {
  const [rows] = await pool.execute(
    `
      SELECT id
      FROM activated_portal_users
      WHERE access_identifier = ?
        AND status = 'ACTIVE'
      LIMIT 1
    `,
    [accessIdentifier],
  );

  if (rows.length > 0) {
    throw Object.assign(new Error('Questa utenza e gia registrata al portale.'), { statusCode: 409 });
  }
}

async function assertUtenzeNotAlreadyActivated(match) {
  const userPlaceholders = match.userIds.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `
      SELECT id
      FROM activated_portal_users
      WHERE id_Condominio = ?
        AND id_user IN (${userPlaceholders})
        AND status = 'ACTIVE'
      LIMIT 1
    `,
    [match.idCondominio, ...match.userIds],
  );

  if (rows.length > 0) {
    throw Object.assign(new Error('Questa utenza e gia registrata al portale.'), { statusCode: 409 });
  }
}

async function createPortalAccount(match, payload) {
  const accessIdentifier = payload.numeroUtenza;
  await assertAccessIdentifierAvailable(accessIdentifier);
  await assertUtenzeNotAlreadyActivated(match);

  const password = hashPassword(payload.password);
  const accountGroupId = crypto.randomUUID();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const user of match.users) {
      await connection.execute(
        `
          INSERT INTO activated_portal_users
            (
              account_group_id,
              id_Condominio,
              id_user,
              id_auto,
              interno,
              access_identifier,
              password_hash,
              password_salt,
              must_change_password,
              temp_password_expires_at,
              password_changed_at,
              status,
              activated_at,
              created_at
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NOW(), 'ACTIVE', NOW(), NOW())
        `,
        [
          accountGroupId,
          match.idCondominio,
          user.id_user,
          user.id_auto,
          user.Interno,
          accessIdentifier,
          password.hash,
          password.salt,
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { accessIdentifier };
}

module.exports = {
  createPortalAccount,
  findMatchingUser,
  parseNumeroUtenza,
};
