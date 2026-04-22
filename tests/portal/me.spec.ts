import { test, expect } from '@playwright/test';
import { cleanupTables, insertActivatedUser, closePool } from '../utils/db';
import { apiGet } from '../utils/api';
import { hashPassword } from '../utils/passwordHash';

const TEST_EMAIL = 'portal-me@test.it';

test.describe('Portal - Me', () => {
  test.beforeAll(async () => {
    await cleanupTables();
    const { hash, salt } = hashPassword('PortalPass123!');
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

  test('get profile returns portal data', async () => {
    const res = await apiGet(`/api/portal/me?email=${TEST_EMAIL}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('customer');
    expect(res.body).toHaveProperty('invoices');
    expect(res.body).toHaveProperty('readings');
    expect(res.body).toHaveProperty('serviceNotes');
  });

  test('get profile with non-existent email returns 404', async () => {
    const res = await apiGet('/api/portal/me?email=notfound@test.it');
    expect(res.status).toBe(404);
  });

  test('get profile requires email param', async () => {
    const res = await apiGet('/api/portal/me');
    expect(res.status).toBe(400);
  });
});