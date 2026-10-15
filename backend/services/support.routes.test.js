const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { fixture } = require('./support.test-fixture');
// Loading the production pool performs a connection probe. Tests must never
// open that connection; all support routes below receive the in-memory service.
const databasePath = require.resolve('../config/db');
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: { query() { throw new Error('Real database access is forbidden in support tests'); } } };
const { createCustomerRouter } = require('../routes/supportRoutes');

test('customer HTTP API accepts only portal sessions and scopes all requests, linked utenze and public replies', async () => {
  const previousSecret = process.env.JWT_SECRET; process.env.JWT_SECRET = 'test-only-support-session-secret-never-a-production-key';
  const f = fixture(); const initial = await f.service.create(f.customer, f.input());
  await f.service.send(initial.request.id, f.operator, { id: crypto.randomUUID(), body: 'INTERNAL_ONLY', internal: true });
  await f.service.send(initial.request.id, f.operator, { id: crypto.randomUUID(), body: 'Public answer' });
  const app = express(); app.use(express.json()); app.use('/support', createCustomerRouter({ support: f.service }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/support`;
  const token = payload => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10m' });
  const ownToken = token({ accountGroupId: f.customer.id, portalUserId: 1 });
  const otherToken = token({ accountGroupId: f.other.id, portalUserId: 2 });
  const call = (path, auth = ownToken, method = 'GET', body) => fetch(base + path, { method, headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    assert.equal((await call('/requests', null)).status, 401);
    assert.equal((await call('/requests', token({ accountGroupId: f.customer.id, portalUserId: 1, purpose: 'password-reset' }))).status, 401);
    assert.equal((await call('/requests', token({ sub: f.operator.id, role: 'ADMIN' }))).status, 401);
    const response = await call(`/requests/${initial.request.id}`); assert.equal(response.headers.get('cache-control'), 'no-store');
    const thread = await response.json(); assert.equal(thread.messages.length, 2); assert(!JSON.stringify(thread).includes('INTERNAL_ONLY')); assert(!('account_group_id' in thread.request));
    for (const [suffix, method, body] of [['', 'GET'], ['/messages', 'POST', { id: crypto.randomUUID(), body: 'spoof' }], ['/read', 'POST', { messageId: thread.messages[0].id }]]) {
      assert.equal((await call(`/requests/${initial.request.id}${suffix}`, otherToken, method, body)).status, 404);
    }
    assert.equal((await call('/requests', otherToken).then(r => r.json())).total, 0);
    assert.equal((await call('/identity').then(r => r.json())).links.length, 2);
    assert.equal((await call(`/requests/${initial.request.id}/messages`, ownToken, 'POST', { id: crypto.randomUUID(), body: 'private', internal: true })).status, 403);
    assert.equal((await call(`/requests/${initial.request.id}`, ownToken, 'PATCH', { status: 'RESOLVED' })).status, 404);
    await f.service.accountStatus(f.customer.id, f.operator, 'DISABLED');
    assert.equal((await call('/requests')).status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; }
});
