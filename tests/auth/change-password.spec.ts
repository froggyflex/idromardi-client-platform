import { test, expect } from '@playwright/test';
import { cleanupTables, insertActivatedUser, closePool } from '../utils/db';
import { apiPost } from '../utils/api';
import { hashPassword } from '../utils/passwordHash';

const TEST_EMAIL = 'changepw@test.it';

test.describe('Auth - Change Password', () => {
  test.beforeAll(async () => {
    await cleanupTables();
    const { hash, salt } = hashPassword('TempCode456');
    await insertActivatedUser({
      email: TEST_EMAIL,
      idCondominio: 1,
      idUser: 1,
      idAuto: 1,
      passwordHash: hash,
      passwordSalt: salt,
      mustChangePassword: true,
      tempPasswordExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
  });

  test.afterAll(async () => {
    await cleanupTables();
    await closePool();
  });

  test('change temp password successfully', async () => {
    const res = await apiPost('/api/auth/change-temporary-password', {
      email: TEST_EMAIL,
      currentPassword: 'TempCode456',
      newPassword: 'NewPermPass123!',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.mustChangePassword).toBe(false);
  });

  test('change password with wrong current password returns 401', async () => {
    const res = await apiPost('/api/auth/change-temporary-password', {
      email: TEST_EMAIL,
      currentPassword: 'WrongCode456',
      newPassword: 'AnotherPass123!',
    });
    expect(res.status).toBe(401);
  });

  test('change password requires all fields', async () => {
    const res = await apiPost('/api/auth/change-temporary-password', {
      email: TEST_EMAIL,
    });
    expect(res.status).toBe(400);
  });

  test('new password must be at least 8 chars', async () => {
    const res = await apiPost('/api/auth/change-temporary-password', {
      email: TEST_EMAIL,
      currentPassword: 'NewPermPass123!',
      newPassword: 'short',
    });
    expect(res.status).toBe(400);
  });
});