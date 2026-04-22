import { test, expect } from '@playwright/test';
import { cleanupTables, insertActivatedUser, closePool } from '../utils/db';
import { apiPut } from '../utils/api';
import { hashPassword } from '../utils/passwordHash';

const TEST_EMAIL = 'portal-profile@test.it';

test.describe('Portal - Profile', () => {
  test.beforeAll(async () => {
    await cleanupTables();
    const { hash, salt } = hashPassword('ProfilePass123!');
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

  test('update profile successfully', async () => {
    const res = await apiPut('/api/portal/profile', {
      email: TEST_EMAIL,
      phone: '0212345678',
      mobile: '3339998888',
      fiscalCode: 'RSSMRA85A01H501Y',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('customer');
  });

  test('update profile with non-existent email returns 404', async () => {
    const res = await apiPut('/api/portal/profile', {
      email: 'notfound@test.it',
      phone: '0212345678',
      mobile: '3339998888',
      fiscalCode: 'RSSMRA85A01H501Y',
    });
    expect(res.status).toBe(404);
  });

  test('update profile requires email', async () => {
    const res = await apiPut('/api/portal/profile', {
      phone: '0212345678',
      mobile: '3339998888',
    });
    expect(res.status).toBe(400);
  });
});