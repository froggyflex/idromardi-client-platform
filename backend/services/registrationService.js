const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { hashPassword } = require('../utils/passwordHash');
const { sendEmail } = require('../utils/emailSender');

function parseNumeroUtenza(numeroUtenza) {
  const prefix = process.env.NUMERO_UTENZA_PREFIX || '400';
  const userDigits = Number(process.env.NUMERO_UTENZA_USER_DIGITS || 4);
  const [baseNumber, extraInterno] = numeroUtenza.split('/');
  const baseWithoutPrefix = baseNumber.startsWith(prefix)
    ? baseNumber.slice(prefix.length)
    : baseNumber;
  const condominioPart = baseWithoutPrefix.slice(0, -userDigits);
  const userPart = baseWithoutPrefix.slice(-userDigits);
  const userIds = [Number(userPart)];

  if (extraInterno) {
    userIds.push(Number(extraInterno));
  }

  return {
    idCondominio: Number(condominioPart),
    userIds: [...new Set(userIds)],
  };
}

async function findMatchingUser(payload) {
  const { idCondominio, userIds } = parseNumeroUtenza(payload.numeroUtenza);
  const userPlaceholders = userIds.map(() => '?').join(', ');

  const [rows] = await pool.execute(
    `
      SELECT
        u.id AS id_auto,
        u.id_user,
        c.codice AS id_Condominio,
        u.Interno,
        u.Nome,
        u.Cognome,
        u.Stato AS Status
      FROM utenze_v2 u
      INNER JOIN condomini_v2 c
        ON c.id = u.condominio_id
      WHERE c.codice = ?
        AND u.id_user IN (${userPlaceholders})
        AND LOWER(TRIM(u.Nome)) = LOWER(TRIM(?))
        AND LOWER(TRIM(u.Cognome)) = LOWER(TRIM(?))
        AND u.Stato = 'ATTIVA'
    `,
    [idCondominio, ...userIds, payload.nome, payload.cognome],
  );

  const matchedUserIds = new Set(rows.map((row) => Number(row.id_user)));
  const allUsersMatched = userIds.every((idUser) => matchedUserIds.has(idUser));

  if (!allUsersMatched) {
    return null;
  }

  return {
    idCondominio,
    userIds,
    users: rows,
    primaryUser: rows[0],
  };
}

async function sendConfirmationCode(match, email) {
  const confirmationCode = crypto.randomInt(100000, 999999).toString();
  const codeHash = crypto.createHash('sha256').update(confirmationCode).digest('hex');
  const password = hashPassword(confirmationCode);
  const requestId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const primaryUser = match.primaryUser;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `
        UPDATE registration_confirmation_codes
        SET consumed_at = NOW()
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
          AND id_Condominio = ?
          AND consumed_at IS NULL
      `,
      [email, match.idCondominio],
    );

    await connection.execute(
      `
        INSERT INTO registration_confirmation_codes
          (
            request_id,
            id_Condominio,
            id_users_json,
            interni_json,
            nome,
            cognome,
            email,
            code_hash,
            expires_at,
            created_at
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        requestId,
        match.idCondominio,
        JSON.stringify(match.userIds),
        JSON.stringify(match.users.map((user) => user.Interno)),
        primaryUser.Nome,
        primaryUser.Cognome,
        email,
        codeHash,
        expiresAt,
      ],
    );

    await connection.execute(
      `
        UPDATE registration_confirmation_codes
        SET consumed_at = NOW()
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
          AND id_Condominio = ?
          AND request_id <> ?
          AND consumed_at IS NULL
      `,
      [email, match.idCondominio, requestId],
    );

    for (const user of match.users) {
      await connection.execute(
        `
          INSERT INTO activated_portal_users
            (
              id_Condominio,
              id_user,
              id_auto,
              interno,
              email,
              password_hash,
              password_salt,
              must_change_password,
              temp_password_expires_at,
              status,
              activated_at,
              created_at
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'ACTIVE', NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            password_hash = VALUES(password_hash),
            password_salt = VALUES(password_salt),
            must_change_password = 1,
            temp_password_expires_at = VALUES(temp_password_expires_at),
            status = 'ACTIVE',
            updated_at = NOW()
        `,
        [
          match.idCondominio,
          user.id_user,
          user.id_auto,
          user.Interno,
          email,
          password.hash,
          password.salt,
          expiresAt,
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

  const templatePath = path.join(__dirname, '../templates/email/registration-code.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace('{{CODE}}', confirmationCode);

  await sendEmail(email, 'Codice di accesso Idromardi', html);

  return { requestId, expiresAt: expiresAt.toISOString() };
}

async function resendConfirmationCode(requestId) {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        email,
        expires_at,
        consumed_at,
        resend_count
      FROM registration_confirmation_codes
      WHERE request_id = ?
    `,
    [requestId],
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Richiesta non trovata.'), { statusCode: 404 });
  }

  const record = rows[0];

  if (record.consumed_at !== null) {
    throw Object.assign(new Error('Codice già utilizzato. Richiedi una nuova registrazione.'), { statusCode: 400 });
  }

  if (new Date(record.expires_at) > new Date()) {
    throw Object.assign(new Error('Codice ancora valido. Controlla la tua email.'), { statusCode: 400 });
  }

  if (record.resend_count >= 3) {
    throw Object.assign(new Error('Limite di invii raggiunto. Richiedi una nuova registrazione.'), { statusCode: 400 });
  }

  const confirmationCode = crypto.randomInt(100000, 999999).toString();
  const codeHash = crypto.createHash('sha256').update(confirmationCode).digest('hex');
  const password = hashPassword(confirmationCode);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `
        UPDATE registration_confirmation_codes
        SET
          code_hash = ?,
          expires_at = ?,
          resend_count = resend_count + 1,
          updated_at = NOW()
        WHERE request_id = ?
      `,
      [codeHash, expiresAt, requestId],
    );

    await connection.execute(
      `
        UPDATE activated_portal_users
        SET
          password_hash = ?,
          password_salt = ?,
          must_change_password = 1,
          temp_password_expires_at = ?,
          status = 'ACTIVE',
          updated_at = NOW()
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
      `,
      [password.hash, password.salt, expiresAt, record.email],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const templatePath = path.join(__dirname, '../templates/email/registration-code.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace('{{CODE}}', confirmationCode);

  await sendEmail(record.email, 'Codice di accesso Idromardi', html);

  return { requestId, expiresAt: expiresAt.toISOString() };
}

module.exports = {
  findMatchingUser,
  sendConfirmationCode,
  resendConfirmationCode,
  parseNumeroUtenza,
};
