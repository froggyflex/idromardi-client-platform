import { test, expect } from '@playwright/test';
import { cleanupTables, closePool } from '../utils/db';
import { apiPost } from '../utils/api';

test.describe('Registration - Request', () => {
  test.beforeAll(async () => {
    await cleanupTables();
  });

  test.afterAll(async () => {
    await cleanupTables();
    await closePool();
  });

  test('request with valid numeroUtenza returns success', async () => {
    const res = await apiPost('/api/registration/request', {
      numeroUtenza: '40010001',
      nome: 'Mario',
      cognome: 'Rossi',
      email: 'registration-request@test.it',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('requestId');
  });

  test('request with invalid numeroUtenza returns 400', async () => {
    const res = await apiPost('/api/registration/request', {
      numeroUtenza: '9999999',
      nome: 'Mario',
      cognome: 'Rossi',
      email: 'invalid-numero@test.it',
    });
    expect(res.status).toBe(400);
  });

  test('request with wrong nome/cognome returns 400', async () => {
    const res = await apiPost('/api/registration/request', {
      numeroUtenza: '4001001',
      nome: 'Wrong',
      cognome: 'Name',
      email: 'wrong-name@test.it',
    });
    expect(res.status).toBe(400);
  });

  test('request requires all fields', async () => {
    const res = await apiPost('/api/registration/request', {
      numeroUtenza: '4001001',
    });
    expect(res.status).toBe(400);
  });

  test('request with invalid email format returns 400', async () => {
    const res = await apiPost('/api/registration/request', {
      numeroUtenza: '4001001',
      nome: 'Mario',
      cognome: 'Rossi',
      email: 'not-an-email',
    });
    expect(res.status).toBe(400);
  });
});