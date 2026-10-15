const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { fixture } = require('./support.test-fixture');
test('customer request history remains available without staff profile-table joins', async () => {
  const f = fixture(); await f.service.create(f.customer, f.input());
  const originalQuery = f.database.query;
  f.database.query = (sql, ...args) => {
    if (sql.includes('JOIN utenze_v2') || sql.includes('JOIN condomini_v2')) throw Object.assign(new Error('Profile tables unavailable'), { code: 'ER_TABLEACCESS_DENIED_ERROR' });
    return originalQuery(sql, ...args);
  };
  const listing = await f.service.list(f.customer);
  assert.equal(listing.total, 1); assert.equal(listing.items.length, 1);
  assert.equal((await f.service.list(f.other)).total, 0);
  assert(!('customer_name' in listing.items[0]));
});
test('customer requests are scoped to verified account groups and linked utenze; retries do not duplicate', async () => {
  const f = fixture(), input = f.input(); input.accountGroupId = f.other.id;
  const created = await f.service.create(f.customer, input); assert.equal(created.request.status, 'NEW');
  assert.equal(f.state().requests.get(input.id).account_group_id, f.customer.id);
  assert.equal(created.request.account_group_id, undefined); assert.equal(created.request.assigned_to, undefined);
  await f.service.create(f.customer, input); assert.equal(f.state().requests.size, 1); assert.equal(f.state().messages.size, 1);
  await assert.rejects(f.service.create(f.customer, { ...input, body: 'Changed content' }), error => error.statusCode === 409);
  await assert.rejects(f.service.create(f.customer, { ...f.input(), utenzaId: f.groups.get(f.other.id).ids[0] }), error => error.statusCode === 404);
  for (const run of [() => f.service.detail(input.id, f.other), () => f.service.send(input.id, f.other, { id: crypto.randomUUID(), body: 'Spoofed' }), () => f.service.read(input.id, f.other, created.messages[0].id)]) await assert.rejects(run(), error => error.statusCode === 404);
  assert.equal((await f.service.list(f.other)).items.length, 0); assert.equal((await f.service.list(f.customer)).items.length, 1);
});
test('operator replies persist, private notes never reach customers, and unread receipts only cover delivered messages', async () => {
  const f = fixture(), initial = await f.service.create(f.customer, f.input()), id = initial.request.id;
  const reply = { id: crypto.randomUUID(), body: 'Controlliamo la lettura.' };
  await f.service.send(id, f.operator, reply); await f.service.send(id, f.operator, reply);
  assert.equal(f.state().messages.size, 2);
  await f.service.send(id, f.operator, { id: crypto.randomUUID(), body: 'INTERNAL_SECRET_NOTE', internal: true });
  const client = await f.service.detail(id, f.customer), staff = await f.service.detail(id, f.operator);
  assert.equal(client.messages.length, 2); assert.equal(staff.messages.length, 3);
  assert(!JSON.stringify(client).includes('INTERNAL_SECRET_NOTE')); assert.equal(client.request.status, 'WAITING_CUSTOMER');
  assert.equal((await f.service.summary(f.customer)).unreadRequests, 1);
  await f.service.read(id, f.customer, staff.messages.at(-1).id); assert.equal((await f.service.summary(f.customer)).unreadRequests, 1);
  await f.service.read(id, f.customer, client.messages.at(-1).id); assert.equal((await f.service.summary(f.customer)).unreadRequests, 0);
  await f.service.send(id, f.operator, { id: crypto.randomUUID(), body: 'Una nuova risposta dopo la lettura.' });
  assert.equal((await f.service.summary(f.customer)).unreadRequests, 1);
  await assert.rejects(f.service.send(id, f.customer, { id: crypto.randomUUID(), body: 'Attempted note', internal: true }), error => error.statusCode === 403);
});
test('assignment and statuses enforce operator permissions and optimistic concurrency, customer replies reopen resolved requests', async () => {
  const f = fixture(), created = await f.service.create(f.customer, f.input()), id = created.request.id;
  const input = { version: 1, status: 'RESOLVED', assignedTo: f.operator.id };
  await assert.rejects(f.service.update(id, f.customer, input), error => error.statusCode === 403);
  await assert.rejects(f.service.update(id, f.operator, { ...input, assignedTo: crypto.randomUUID() }), error => error.statusCode === 400);
  const updated = await f.service.update(id, f.reviewer, input); assert.equal(updated.request.status, 'RESOLVED');
  await assert.rejects(f.service.update(id, f.operator, input), error => error.statusCode === 409);
  const reply = await f.service.send(id, f.customer, { id: crypto.randomUUID(), body: 'Ho ancora bisogno di assistenza.' });
  assert.equal(reply.request.status, 'IN_PROGRESS'); assert.equal(f.state().requests.get(id).assigned_to, f.operator.id);
  assert(f.state().audit.some(event => event.action === 'UPDATED')); assert(f.state().rollbacks > 0);
});
test('operator can contact a registered customer without an existing request; only ADMIN controls account access', async () => {
  const f = fixture(), input = { id: crypto.randomUUID(), subject: 'Aggiornamento della tua utenza', body: 'Contattaci per verificare una lettura.' };
  await assert.rejects(f.service.contact(f.customer.id, f.customer, input), error => error.statusCode === 403);
  const started = await f.service.contact(f.customer.id, f.reviewer, input); assert.equal(started.request.status, 'WAITING_CUSTOMER');
  await f.service.contact(f.customer.id, f.reviewer, input); assert.equal(f.state().requests.size, 1);
  assert.equal((await f.service.detail(input.id, f.customer)).messages[0].sender, 'OPERATOR');
  await assert.rejects(f.service.accountStatus(f.customer.id, f.reviewer, 'DISABLED'), error => error.statusCode === 403);
  await f.service.accountStatus(f.customer.id, f.operator, 'DISABLED');
  await assert.rejects(f.service.list(f.customer), error => error.statusCode === 403);
  await assert.rejects(f.service.send(input.id, f.customer, { id: crypto.randomUUID(), body: 'Disabled user' }), error => error.statusCode === 403);
  await f.service.accountStatus(f.customer.id, f.operator, 'ACTIVE'); assert.equal((await f.service.identity(f.customer)).links.length, 2);
  assert.equal(f.state().audit.filter(event => event.action === 'ACCOUNT_STATUS').length, 2);
});
test('temporary-password accounts cannot access support, inputs are bounded and messages paginate without exposing notes', async () => {
  const f = fixture(); f.groups.get(f.customer.id).mustChange = true;
  await assert.rejects(f.service.identity(f.customer), error => error.statusCode === 403); f.groups.get(f.customer.id).mustChange = false;
  for (const input of [{ ...f.input(), body: 'x'.repeat(4001) }, { ...f.input(), subject: ' ' }, { ...f.input(), category: 'INVALID' }]) await assert.rejects(f.service.create(f.customer, input), error => error.statusCode === 400);
  const created = await f.service.create(f.customer, f.input());
  for (let i = 0; i < 105; i++) await f.service.send(created.request.id, f.operator, { id: crypto.randomUUID(), body: `Reply ${i}`, internal: i % 3 === 0 });
  const newest = await f.service.detail(created.request.id, f.operator); assert.equal(newest.messages.length, 100); assert.equal(newest.hasMore, true);
  const oldest = await f.service.detail(created.request.id, f.operator, newest.messages[0].id); assert.equal(oldest.messages.length, 6);
  assert.equal(new Set([...oldest.messages, ...newest.messages].map(message => message.id)).size, 106);
  const customer = await f.service.detail(created.request.id, f.customer); assert(customer.messages.every(message => message.visibility === 'PUBLIC'));
});
