const test = require('node:test');
const assert = require('node:assert/strict');
const { createSchemaInitializer } = require('./supportSchema');
const columns = ['account_group_id', 'id_auto', 'status'].map(COLUMN_NAME => ({ COLUMN_NAME }));

test('schema initialization is shared across simultaneous requests and only creates support tables', async () => {
  const calls = [], database = { async query(sql) { calls.push(sql); return sql.includes('INFORMATION_SCHEMA.COLUMNS') ? [columns] : [[]]; } };
  const ready = createSchemaInitializer(database); await Promise.all([ready(), ready(), ready()]); await ready();
  assert.equal(calls.length, 5); assert(calls.slice(2).every(sql => sql.includes('CREATE TABLE IF NOT EXISTS portal_support_')));
  assert(!calls.slice(2).some(sql => /(?:DROP|DELETE|UPDATE|ALTER|TRUNCATE)\s/i.test(sql)));
});

test('missing customer ownership schema prevents DDL and a transient failure can be retried', async () => {
  let available = false; const calls = [];
  const ready = createSchemaInitializer({ async query(sql) { calls.push(sql); return sql.includes('INFORMATION_SCHEMA.COLUMNS') ? [available ? columns : []] : [[]]; } });
  await assert.rejects(ready(), { statusCode: 503 }); assert.equal(calls.length, 1);
  available = true; await ready(); assert.equal(calls.length, 6);
});

test('existing support tables work without CREATE permission or a packaged migration file', async () => {
  const calls = [], tables = ['portal_support_requests', 'portal_support_messages', 'portal_support_audit'].map(TABLE_NAME => ({ TABLE_NAME }));
  const ready = createSchemaInitializer({ async query(sql) {
    calls.push(sql); if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) return [columns];
    if (sql.includes('INFORMATION_SCHEMA.TABLES')) return [tables];
    throw Object.assign(new Error('CREATE permission denied'), { code: 'ER_TABLEACCESS_DENIED_ERROR' });
  } }, 'this-file-is-not-deployed.sql');
  await ready(); assert.equal(calls.length, 2);
});

test('setup failures identify their stage and can be retried without exposing database SQL', async () => {
  const ready = createSchemaInitializer({ async query(sql) { return sql.includes('INFORMATION_SCHEMA.COLUMNS') ? [columns] : [[]]; } }, 'this-file-is-not-deployed.sql');
  await assert.rejects(ready(), { code: 'ENOENT', supportStage: 'schema-file' });
});
