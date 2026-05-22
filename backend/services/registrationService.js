const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { hashPassword } = require("../utils/passwordHash");
const { sendEmail } = require('../utils/emailSender');

function parseNumeroUtenza(numeroUtenza) {
  const prefix = process.env.NUMERO_UTENZA_PREFIX || '400';

  if (!numeroUtenza.startsWith(prefix)) {
    throw new Error("Prefisso numero utenza non valido");
  }

  const [baseNumber, ...extraParts] = numeroUtenza.split('/');

  const baseWithoutPrefix = baseNumber.slice(prefix.length);

  const separator = '000';
  const separatorIndex = baseWithoutPrefix.indexOf(separator);

  if (separatorIndex === -1) {
    throw new Error("Formato numero utenza non valido (manca separatore 000)");
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

async function assertEmailNotAlreadyUsed(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const [rows] = await pool.execute(
    `
      SELECT id
      FROM activated_portal_users
      WHERE email COLLATE utf8mb4_unicode_ci
          = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci
        AND status = 'ACTIVE'
      LIMIT 1
    `,
    [normalizedEmail]
  );

  if (rows.length > 0) {
    throw new Error("Questa email è già associata a un account portale.");
  }
}

async function findMatchingUser(payload) {
  const { idCondominio, userIds } = parseNumeroUtenza(payload.numeroUtenza);

  console.log(`Finding users for condominio ${idCondominio} and userIds ${userIds.join(', ')}`);

  if (!userIds.length) return null;

  const userPlaceholders = userIds.map(() => "?").join(", ");
  
  console.log(`User placeholders for query: ${userPlaceholders}`);

  const nome = String(payload.nome || "").trim();
  const cognome = String(payload.cognome || "").trim();

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
        ON c.id COLLATE utf8mb4_unicode_ci
         = u.condominio_id COLLATE utf8mb4_unicode_ci
      WHERE c.codice = ?
        AND u.id_user IN (${userPlaceholders})
        AND (
          u.Nome IS NULL
          OR TRIM(u.Nome) = ''
          OR LOWER(TRIM(u.Nome)) = LOWER(TRIM(?))
        )
        AND LOWER(TRIM(u.Cognome)) = LOWER(TRIM(?))
        AND u.Stato = 'ATTIVA'
    `,
    [idCondominio, ...userIds, nome, cognome]
  );

  if (rows.length !== userIds.length) {
    console.log("Some requested utenze did not match.");
     
  }
  
  const matchedUserIds = new Set(rows.map((row) => Number(row.id_user)));
  const allUsersMatched = userIds.every((idUser) => matchedUserIds.has(Number(idUser)));

  console.log(`Matched user IDs: ${[...matchedUserIds].join(', ')}`);
  console.log(`All users matched: ${allUsersMatched}`);

  if (!allUsersMatched) return null;

  return {
    idCondominio,
    userIds,
    users: rows,
    primaryUser: rows[0],
  };
}

async function sendConfirmationCode(match, email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  await assertEmailNotAlreadyUsed(normalizedEmail);

  const confirmationCode = crypto.randomInt(100000, 999999).toString();
  console.log(`Generated confirmation code for ${normalizedEmail}: ${confirmationCode}`);

  const codeHash = crypto.createHash("sha256").update(confirmationCode).digest("hex");
  const password = hashPassword(confirmationCode);
  const requestId = crypto.randomUUID();
  const accountGroupId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const primaryUser = match.primaryUser;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `
        UPDATE registration_confirmation_codes
        SET consumed_at = NOW()
        WHERE email COLLATE utf8mb4_unicode_ci
            = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci
          AND id_Condominio = ?
          AND consumed_at IS NULL
      `,
      [normalizedEmail, match.idCondominio]
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
        normalizedEmail,
        codeHash,
        expiresAt,
      ]
    );

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
              email,
              password_hash,
              password_salt,
              must_change_password,
              temp_password_expires_at,
              status,
              activated_at,
              created_at
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'ACTIVE', NOW(), NOW())
        `,
        [
          accountGroupId,
          match.idCondominio,
          user.id_user,
          user.id_auto,
          user.Interno,
          normalizedEmail,
          password.hash,
          password.salt,
          expiresAt,
        ]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const templatePath = path.join(__dirname, "../templates/email/registration-code.html");
  let html = fs.readFileSync(templatePath, "utf8");
  html = html.replace("{{CODE}}", confirmationCode);

  await sendEmail(normalizedEmail, "Codice di accesso Idromardi", html);

  return { requestId, expiresAt: expiresAt.toISOString() };
}

async function resendConfirmationCode(requestId) {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        email,
        id_Condominio,
        id_users_json,
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
        WHERE email COLLATE utf8mb4_unicode_ci
            = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci
          AND status = 'ACTIVE'
      `,
      [password.hash, password.salt, expiresAt, record.email]
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
