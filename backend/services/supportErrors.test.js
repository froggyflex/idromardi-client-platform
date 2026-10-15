const test = require('node:test');
const assert = require('node:assert/strict');
const { reportSupportError } = require('./supportErrors');

test('support failures log actionable codes and correlation IDs without customer or connection data', () => {
  let output;
  const reference = reportSupportError({ code: 'ER_BAD_FIELD_ERROR', errno: 1054, sqlState: '42S22', sqlMessage: "Unknown column 'apu.some_field' in 'field list'", message: 'private text', sql: 'password=test-secret', supportStage: 'schema-create' },
    { method: 'GET', route: { path: '/requests/:id' }, headers: { authorization: 'secret-token' }, body: { body: 'private-message' }, params: { id: 'private-request-id' } },
    (...values) => { output = values; });
  const details = JSON.parse(output[1]); assert.equal(details.reference, reference); assert.match(reference, /^[a-f0-9-]{36}$/);
  assert.equal(details.code, 'ER_BAD_FIELD_ERROR'); assert.equal(details.column, 'apu.some_field'); assert.equal(details.stage, 'schema-create');
  for (const forbidden of ['private', 'password', 'secret', 'authorization', 'sqlMessage']) assert(!output.join(' ').includes(forbidden));
});
