import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: '127.0.0.1',
      port: 3307,
      user: 'root',
      password: 'test',
      database: 'idromardi_test',
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

export async function cleanupTables(): Promise<void> {
  const db = getDbPool();
  await db.execute('DELETE FROM activated_portal_users');
  await db.execute('DELETE FROM registration_confirmation_codes');
}

export async function insertActivatedUser(params: {
  email: string;
  idCondominio: number;
  idUser: number;
  idAuto: number;
  passwordHash: string;
  passwordSalt: string;
  mustChangePassword?: boolean;
  tempPasswordExpiresAt?: Date | null;
}): Promise<void> {
  const db = getDbPool();
  const expiresStr = params.tempPasswordExpiresAt
    ? params.tempPasswordExpiresAt.toISOString().slice(0, 19).replace('T', ' ')
    : null;
  await db.execute(
    `INSERT INTO activated_portal_users
      (email, id_Condominio, id_user, id_auto, password_hash, password_salt, must_change_password, temp_password_expires_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
     ON DUPLICATE KEY UPDATE
      password_hash = VALUES(password_hash),
      password_salt = VALUES(password_salt),
      must_change_password = VALUES(must_change_password),
      temp_password_expires_at = VALUES(temp_password_expires_at)`,
    [
      params.email,
      params.idCondominio,
      params.idUser,
      params.idAuto,
      params.passwordHash,
      params.passwordSalt,
      params.mustChangePassword !== false ? 1 : 0,
      expiresStr,
    ],
  );
}

export async function insertRegistrationCode(params: {
  email: string;
  idCondominio: number;
  userIds: number[];
  codeHash: string;
  expiresAt: Date;
  requestId?: string;
}): Promise<string> {
  const db = getDbPool();
  const requestId = params.requestId || crypto.randomUUID();
  const expiresStr = params.expiresAt.toISOString().slice(0, 19).replace('T', ' ');
  await db.execute(
    `INSERT INTO registration_confirmation_codes
      (request_id, id_Condominio, id_users_json, nome, cognome, email, code_hash, expires_at)
     VALUES (?, ?, ?, '', '', ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      code_hash = VALUES(code_hash),
      expires_at = VALUES(expires_at)`,
    [
      requestId,
      params.idCondominio,
      JSON.stringify(params.userIds),
      params.email,
      params.codeHash,
      expiresStr,
    ],
  );
  return requestId;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}