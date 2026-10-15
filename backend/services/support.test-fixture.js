const crypto = require('node:crypto');
const { createSupportService, UUID } = require('./supportService');
function fixture() {
  const a = crypto.randomUUID(), b = crypto.randomUUID(), adminId = crypto.randomUUID(), reviewerId = crypto.randomUUID();
  const customer = { kind: 'CUSTOMER', id: a }, other = { kind: 'CUSTOMER', id: b }, operator = { kind: 'OPERATOR', id: adminId, role: 'ADMIN' };
  let requests = new Map(), messages = new Map(), audit = [], clock = 0, rollbacks = 0;
  const groups = new Map([[a, { active: true, mustChange: false, ids: [crypto.randomUUID(), crypto.randomUUID()], name: 'Mario Rossi' }], [b, { active: true, mustChange: false, ids: [crypto.randomUUID()], name: 'Anna Verdi' }]]);
  const operators = [{ id: adminId, username: 'admin' }, { id: reviewerId, username: 'reviewer' }];
  const queries = [];
  const now = () => new Date(Date.UTC(2026, 9, 15, 8, 0, 0, clock++)).toISOString().replace('T', ' ').replace('Z', '');
  const links = id => (groups.get(id)?.ids || []).map((utenza, index) => ({ id: utenza, number: index + 1, id_auto: utenza, status: groups.get(id).active ? 'ACTIVE' : 'DISABLED', accessIdentifier: '40070001', email: 'test@example.invalid', phone: '', firstName: groups.get(id).name.split(' ')[0], lastName: groups.get(id).name.split(' ')[1], interno: String(index + 1), scala: 'A', building: 'Condominio test', buildingId: 'test-building', buildingCode: '7' }));
  function matching(values) {
    let rows = [...requests.values()];
    const group = values.find(value => groups.has(value)); if (group) rows = rows.filter(row => row.account_group_id === group);
    const status = values.find(value => ['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED'].includes(value)); if (status) rows = rows.filter(row => row.status === status);
    return rows;
  }
  const database = {
    async query(raw, values = []) {
      const sql = raw.replace(/\s+/g, ' ').trim(); queries.push({ sql, values }); let result;
      if (sql.startsWith('SELECT id_auto FROM activated_portal_users')) result = groups.get(values[0])?.active && !groups.get(values[0]).mustChange ? links(values[0]) : [];
      else if (sql.startsWith('SELECT * FROM portal_support_requests')) {
        const row = requests.get(values[0]); result = row && (!sql.includes('AND account_group_id = ?') || row.account_group_id === values[1]) ? [{ ...row }] : [];
      } else if (sql.startsWith('INSERT INTO portal_support_requests')) {
        const isCustomer = sql.includes('utenza_id'), [id, group] = values;
        requests.set(id, { id, account_group_id: group, utenza_id: isCustomer ? values[2] : null, subject: isCustomer ? values[3] : values[2], category: isCustomer ? values[4] : 'OTHER', status: isCustomer ? 'NEW' : 'WAITING_CUSTOMER', creation_hash: isCustomer ? values[5] : values[3], version: 1, assigned_to: null, customer_read_at: null, operator_read_at: null, created_at: now(), updated_at: now() }); result = {};
      } else if (sql.startsWith('INSERT INTO portal_support_messages')) {
        const [id, request_id, actor_id] = values;
        const literal = values.length === 4;
        messages.set(id, { id, request_id, actor_id, sender: literal ? sql.includes("'OPERATOR'") ? 'OPERATOR' : 'CUSTOMER' : values[3], visibility: literal ? 'PUBLIC' : values[4], body: literal ? values[3] : values[5], created_at: now() }); result = {};
      } else if (sql.startsWith('INSERT INTO portal_support_audit')) { audit.push({ id: values[0], group: values[1], request: values[2], actor: values[3], action: values[4], details: JSON.parse(values[5]) }); result = {}; }
      else if (sql.startsWith('SELECT request_id, actor_id, body, visibility')) result = messages.has(values[0]) ? [messages.get(values[0])] : [];
      else if (sql.startsWith('UPDATE portal_support_requests SET')) {
        const row = requests.get(values.at(-1)); row.status = values[0]; if (sql.includes('assigned_to = ?')) row.assigned_to = values[1]; row.version++; row.updated_at = now(); result = {};
      } else if (sql.startsWith('SELECT created_at, id FROM portal_support_messages')) {
        const row = messages.get(values[0]); result = row && row.request_id === values[1] && (!sql.includes("visibility = 'PUBLIC'") || row.visibility === 'PUBLIC') ? [row] : [];
      } else if (sql.startsWith('SELECT id, sender, visibility, body')) {
        result = [...messages.values()].filter(row => row.request_id === values[0] && (!sql.includes("AND visibility = 'PUBLIC'") || row.visibility === 'PUBLIC'));
        if (sql.includes('created_at < ?')) result = result.filter(row => row.created_at < values[1] || row.created_at === values[1] && row.id < values[3]);
        result = result.sort((x, y) => y.created_at.localeCompare(x.created_at) || y.id.localeCompare(x.id)).slice(0, 101).map(({ id, sender, visibility, body, created_at }) => ({ id, sender, visibility, body, created_at }));
      } else if (sql.startsWith('UPDATE portal_support_requests r JOIN')) {
        const row = requests.get(values[1]), message = messages.get(values[0]);
        if (message?.request_id === row?.id && (!sql.includes("m.visibility = 'PUBLIC'") || message.visibility === 'PUBLIC')) row[sql.includes('SET r.customer_read_at') ? 'customer_read_at' : 'operator_read_at'] = message.created_at;
        result = {};
      } else if (sql.startsWith('SELECT id FROM app_auth_users')) result = operators.filter(person => person.id === values[0]);
      else if (sql.startsWith('SELECT id, username FROM app_auth_users')) result = operators;
      else if (sql.startsWith('SELECT apu.id_auto')) result = links(values[0]);
      else if (sql.startsWith('SELECT id FROM activated_portal_users')) result = links(values[0]);
      else if (sql.startsWith('UPDATE activated_portal_users')) { groups.get(values[1]).active = values[0] === 'ACTIVE'; result = {}; }
      else if (sql.includes('AS unreadRequests')) {
        result = [{ unreadRequests: [...requests.values()].filter(row => row.account_group_id === values[0] && [...messages.values()].some(message => message.request_id === row.id && message.sender === 'OPERATOR' && message.visibility === 'PUBLIC' && (!row.customer_read_at || message.created_at > row.customer_read_at))).length }];
      } else if (sql.startsWith('SELECT COUNT(*) AS total')) result = [{ total: matching(values).length }];
      else if (sql.startsWith('SELECT COUNT(DISTINCT')) result = [{ total: groups.size }];
      else if (sql.startsWith('SELECT r.*')) {
        const sender = values[0], offset = Number(values.at(-1));
        result = matching(values).sort((x, y) => y.updated_at.localeCompare(x.updated_at)).slice(offset, offset + 25).map(row => ({ ...row, customer_name: groups.get(row.account_group_id).name, access_identifier: '40070001', building: 'Condominio test', unread: [...messages.values()].filter(m => m.request_id === row.id && m.visibility === 'PUBLIC' && m.sender === sender && (!row[sender === 'CUSTOMER' ? 'operator_read_at' : 'customer_read_at'] || m.created_at > row[sender === 'CUSTOMER' ? 'operator_read_at' : 'customer_read_at'])).length }));
      } else if (sql.startsWith('SELECT apu.account_group_id AS id')) result = [...groups.keys()].map(id => ({ id, name: groups.get(id).name, accessIdentifier: '40070001', email: 'test@example.invalid', phone: '', linkedCount: groups.get(id).ids.length, building: 'Condominio test', status: groups.get(id).active ? 'ACTIVE' : 'DISABLED', openRequests: [...requests.values()].filter(row => row.account_group_id === id && row.status !== 'RESOLVED').length }));
      else if (sql.startsWith('SELECT status, COUNT(*)')) result = ['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED'].map(status => ({ status, total: [...requests.values()].filter(row => row.status === status).length }));
      else throw new Error('Unexpected fixture SQL: ' + sql);
      return [result];
    },
    async getConnection() {
      let snapshot;
      return { query: (...args) => database.query(...args), async beginTransaction() { snapshot = structuredClone({ requests, messages, audit, groups }); }, async commit() {}, async rollback() { rollbacks++; requests = snapshot.requests; messages = snapshot.messages; audit = snapshot.audit; for (const [id, group] of snapshot.groups) groups.set(id, group); }, release() {} };
    },
  };
  const service = createSupportService({ database });
  return { service, database, customer, other, operator, reviewer: { kind: 'OPERATOR', id: reviewerId, role: 'REVIEWER' }, groups, queries, UUID,
    state: () => ({ requests, messages, audit, rollbacks }), input: () => ({ id: crypto.randomUUID(), subject: 'Bolletta da verificare', body: 'Vorrei verificare il consumo.', category: 'BILLING', utenzaId: groups.get(a).ids[0] }) };
}
module.exports = { fixture };
