import { test, expect } from '@playwright/test';
import { cleanupTables, insertActivatedUser, closePool } from '../utils/db';
import { apiPost } from '../utils/api';
import { hashPassword } from '../utils/passwordHash';

const TEST_EMAIL = 'auth-login@test.it';

test.describe('Auth - Login', () => {
  test.beforeAll(async () => {
    await cleanupTables();
    const { hash, salt } = hashPassword('ValidPass123!');
    await insertActivatedUser({
      email: TEST_EMAIL,
      idCondominio: 1,
      idUser: 1,
      idAuto: 1,
      passwordHash: hash,
      passwordSalt: salt,
      mustChangePassword: false,
    });
  });

  test.afterAll(async () => {
    await cleanupTables();
    await closePool();
  });

  test('login with valid credentials returns token', async () => {
    const res = await apiPost('/api/auth/login', {
      email: TEST_EMAIL,
      password: 'ValidPass123!',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toBe(TEST_EMAIL);
    expect(res.body.mustChangePassword).toBe(false);
  });

  test('login with invalid password returns 401', async () => {
    const res = await apiPost('/api/auth/login', {
      email: TEST_EMAIL,
      password: 'WrongPassword',
    });
    expect(res.status).toBe(401);
  });

  test('login with non-existent email returns 401', async () => {
    const res = await apiPost('/api/auth/login', {
      email: 'notfound@test.it',
      password: 'AnyPass123!',
    });
    expect(res.status).toBe(401);
  });

  test('login with expired temp password returns 401', async () => {
    const { hash, salt } = hashPassword('ExpiredCode123');
    const pastDate = new Date(Date.now() - 60 * 60 * 1000);
    await insertActivatedUser({
      email: 'expired@test.it',
      idCondominio: 1,
      idUser: 2,
      idAuto: 2,
      passwordHash: hash,
      passwordSalt: salt,
      mustChangePassword: true,
      tempPasswordExpiresAt: pastDate,
    });

    const res = await apiPost('/api/auth/login', {
      email: 'expired@test.it',
      password: 'ExpiredCode123',
    });
    expect(res.status).toBe(401);
  });

  test('login requires email and password', async () => {
    const res1 = await apiPost('/api/auth/login', { email: TEST_EMAIL });
    expect(res1.status).toBe(400);

    const res2 = await apiPost('/api/auth/login', { password: 'pass' });
    expect(res2.status).toBe(400);
  });
});