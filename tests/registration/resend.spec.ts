import { test, expect } from '@playwright/test';
import { cleanupTables, insertRegistrationCode, closePool, getDbPool } from '../utils/db';
import { apiPost } from '../utils/api';
import { hashPassword } from '../utils/passwordHash';
import crypto from 'crypto';

const TEST_EMAIL = 'resend@test.it';
const CODE_HASH = hashPassword('123456').hash;

test.describe('Registration - Resend', () => {
  test.beforeAll(async () => {
    await cleanupTables();
  });

  test.afterAll(async () => {
    await cleanupTables();
    await closePool();
  });

  test('resend code success', async () => {
    const requestId = await insertRegistrationCode({
      email: TEST_EMAIL,
      idCondominio: 1,
      userIds: [1],
      codeHash: CODE_HASH,
      expiresAt: new Date(Date.now() - 5 * 60 * 1000),
    });

    const res = await apiPost('/api/registration/resend', { requestId });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.requestId).toBe(requestId);
  });

  test('resend with non-existent requestId returns 404', async () => {
    const res = await apiPost('/api/registration/resend', {
      requestId: crypto.randomUUID(),
    });
    expect(res.status).toBe(404);
  });

  test('resend when code still valid returns 400', async () => {
    const requestId = await insertRegistrationCode({
      email: 'still-valid@test.it',
      idCondominio: 1,
      userIds: [1],
      codeHash: CODE_HASH,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const res = await apiPost('/api/registration/resend', { requestId });
    expect(res.status).toBe(400);
  });

  test('resend when max count reached returns 400', async () => {
    const db = getDbPool();
    const requestId = crypto.randomUUID();

    await db.execute(
      `INSERT INTO registration_confirmation_codes
        (request_id, id_Condominio, id_users_json, nome, cognome, email, code_hash, expires_at, resend_count)
       VALUES (?, ?, ?, '', '', ?, ?, ?, 3)`,
      [requestId, 1, JSON.stringify([1]), TEST_EMAIL, CODE_HASH, new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')],
    );

    const res = await apiPost('/api/registration/resend', { requestId });
    expect(res.status).toBe(400);
  });

  test('resend requires requestId', async () => {
    const res = await apiPost('/api/registration/resend', {});
    expect(res.status).toBe(400);
  });
});