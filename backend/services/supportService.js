const crypto = require('node:crypto');
const STATUSES = ['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED'];
const CATEGORIES = ['BILLING', 'READING', 'PROFILE', 'OTHER'];
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const failure = (statusCode, message) => Object.assign(new Error(message), { statusCode, publicMessage: message });
function identifier(value) { if (!UUID.test(value || '')) throw failure(400, 'Identificativo non valido.'); return value; }
function text(value, max) { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw failure(400, `Inserisci un testo da 1 a ${max} caratteri.`); return value.trim(); }
function pageOf(value) { const n = Number(value ?? 1); if (!Number.isInteger(n) || n < 1 || n > 10000) throw failure(400, 'Pagina non valida.'); return n; }

function createSupportService({ database, ensureSchema = async () => {} }) {
  const query = async (sql, values = [], conn = database) => (await conn.query(sql, values))[0];
  async function ready() { await ensureSchema(); }
  async function customer(actor, conn = database) {
    if (actor.kind !== 'CUSTOMER' || !UUID.test(actor.id || '')) throw failure(401, 'Sessione non valida.');
    const rows = await query(`SELECT id_auto FROM activated_portal_users WHERE account_group_id = ? AND status = 'ACTIVE' AND must_change_password = 0`, [actor.id], conn);
    if (!rows.length) throw failure(403, 'Account non attivo oppure password da aggiornare.');
    return rows;
  }
  async function owned(id, actor, conn = database, lock = false) {
    identifier(id);
    if (actor.kind === 'CUSTOMER') await customer(actor, conn);
    else if (actor.kind !== 'OPERATOR' || !actor.id) throw failure(403, 'Permessi insufficienti.');
    const rows = await query(`SELECT * FROM portal_support_requests WHERE id = ? ${actor.kind === 'CUSTOMER' ? 'AND account_group_id = ?' : ''}${lock ? ' FOR UPDATE' : ''}`,
      actor.kind === 'CUSTOMER' ? [id, actor.id] : [id], conn);
    if (!rows[0]) throw failure(404, 'Richiesta non trovata.');
    return rows[0];
  }
  async function transaction(action) {
    const conn = await database.getConnection();
    try { await conn.beginTransaction(); const result = await action(conn); await conn.commit(); return result; }
    catch (error) { await conn.rollback(); throw error; }
    finally { conn.release(); }
  }
  async function audit(conn, request, actor, action, details) {
    await query(`INSERT INTO portal_support_audit (id, account_group_id, request_id, actor_id, action, details_json) VALUES (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), request.account_group_id, request.id || null, actor.id, action, JSON.stringify(details)], conn);
  }
  function present(request, actor) {
    if (actor.kind === 'OPERATOR') return request;
    const { id, utenza_id, subject, category, status, version, created_at, updated_at } = request;
    return { id, utenza_id, subject, category, status, version, created_at, updated_at };
  }
  const joined = `FROM portal_support_requests r LEFT JOIN (
    SELECT apu.account_group_id, MIN(CONCAT_WS(' ', u.Nome, u.Cognome)) AS customer_name,
      MIN(apu.access_identifier) AS access_identifier, MIN(c.nome) AS building
    FROM activated_portal_users apu LEFT JOIN utenze_v2 u ON u.id COLLATE utf8mb4_unicode_ci = apu.id_auto COLLATE utf8mb4_unicode_ci
    LEFT JOIN condomini_v2 c ON c.id = u.condominio_id GROUP BY apu.account_group_id
  ) p ON p.account_group_id = r.account_group_id`;
  return {
    async identity(actor) {
      await ready(); await customer(actor);
      const profile = await this.account(actor.id);
      return { links: profile.links.filter(link => link.status === 'ACTIVE') };
    },
    async list(actor, { page, q = '', status = '', account = '', assigned = '' } = {}) {
      await ready(); const currentPage = pageOf(page), conditions = [], values = [];
      if (actor.kind === 'CUSTOMER') { await customer(actor); conditions.push('r.account_group_id = ?'); values.push(actor.id); }
      else if (actor.kind !== 'OPERATOR') throw failure(403, 'Permessi insufficienti.');
      if (status) { if (!STATUSES.includes(status)) throw failure(400, 'Stato non valido.'); conditions.push('r.status = ?'); values.push(status); }
      if (account && actor.kind === 'OPERATOR') { conditions.push('r.account_group_id = ?'); values.push(identifier(account)); }
      if (assigned && actor.kind === 'OPERATOR') { conditions.push('r.assigned_to = ?'); values.push(identifier(assigned)); }
      if (q) { if (typeof q !== 'string' || q.length > 160) throw failure(400, 'Ricerca non valida.'); conditions.push('(r.subject LIKE ? OR p.customer_name LIKE ? OR p.access_identifier LIKE ?)'); values.push(...Array(3).fill(`%${q}%`)); }
      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      const [count] = await query(`SELECT COUNT(*) AS total ${joined} ${where}`, values);
      const readColumn = actor.kind === 'CUSTOMER' ? 'customer_read_at' : 'operator_read_at';
      const sender = actor.kind === 'CUSTOMER' ? 'OPERATOR' : 'CUSTOMER';
      const rows = await query(`SELECT r.*, p.customer_name, p.access_identifier, p.building,
        (SELECT COUNT(*) FROM portal_support_messages m WHERE m.request_id = r.id AND m.visibility = 'PUBLIC' AND m.sender = ?
          AND (r.${readColumn} IS NULL OR m.created_at > r.${readColumn})) AS unread
        ${joined} ${where} ORDER BY r.updated_at DESC, r.id DESC LIMIT 25 OFFSET ?`, [sender, ...values, (currentPage - 1) * 25]);
      return { items: rows.map(row => ({ ...present(row, actor), unread: Number(row.unread) })), total: Number(count.total), page: currentPage, pageSize: 25 };
    },
    async detail(id, actor, before) {
      await ready(); const request = await owned(id, actor), values = [id];
      let older = '';
      if (before) {
        const [cursor] = await query(`SELECT created_at, id FROM portal_support_messages WHERE id = ? AND request_id = ? ${actor.kind === 'CUSTOMER' ? "AND visibility = 'PUBLIC'" : ''}`, [identifier(before), id]);
        if (!cursor) throw failure(404, 'Messaggio non trovato.');
        older = 'AND (created_at < ? OR (created_at = ? AND id < ?))'; values.push(cursor.created_at, cursor.created_at, cursor.id);
      }
      const rows = await query(`SELECT id, sender, visibility, body, created_at FROM portal_support_messages WHERE request_id = ?
        ${actor.kind === 'CUSTOMER' ? "AND visibility = 'PUBLIC'" : ''} ${older} ORDER BY created_at DESC, id DESC LIMIT 101`, values);
      return { request: present(request, actor), messages: rows.slice(0, 100).reverse(), hasMore: rows.length > 100 };
    },
    async create(actor, input) {
      await ready(); const id = identifier(input.id), subject = text(input.subject, 160), body = text(input.body, 4000);
      const category = input.category || 'OTHER'; if (!CATEGORIES.includes(category)) throw failure(400, 'Categoria non valida.');
      const utenza = input.utenzaId ? identifier(input.utenzaId) : null;
      const hash = crypto.createHash('sha256').update(JSON.stringify({ subject, body, category, utenza })).digest('hex');
      await transaction(async conn => {
        const links = await customer(actor, conn);
        if (utenza && !links.some(row => String(row.id_auto) === utenza)) throw failure(404, 'Utenza non trovata.');
        const existing = await query('SELECT * FROM portal_support_requests WHERE id = ? FOR UPDATE', [id], conn);
        if (existing[0]) {
          if (existing[0].account_group_id !== actor.id) throw failure(404, 'Richiesta non trovata.');
          if (existing[0].creation_hash !== hash) throw failure(409, 'Questa richiesta è già stata inviata con un contenuto diverso.');
          return;
        }
        await query('INSERT INTO portal_support_requests (id, account_group_id, utenza_id, subject, category, creation_hash) VALUES (?, ?, ?, ?, ?, ?)', [id, actor.id, utenza, subject, category, hash], conn);
        await query("INSERT INTO portal_support_messages (id, request_id, actor_id, sender, body) VALUES (?, ?, ?, 'CUSTOMER', ?)", [crypto.randomUUID(), id, actor.id, body], conn);
        await audit(conn, { id, account_group_id: actor.id }, actor, 'CREATED', {});
      });
      return this.detail(id, actor);
    },
    async contact(accountId, actor, input) {
      await ready(); identifier(accountId);
      if (actor.kind !== 'OPERATOR') throw failure(403, 'Permessi insufficienti.');
      const profile = await this.account(accountId);
      if (!profile.links.some(link => link.status === 'ACTIVE')) throw failure(409, 'Riattiva l’accesso del cliente prima di inviare una comunicazione.');
      const id = identifier(input.id), subject = text(input.subject, 160), body = text(input.body, 4000);
      const hash = crypto.createHash('sha256').update(JSON.stringify({ subject, body, accountId, actor: actor.id })).digest('hex');
      await transaction(async conn => {
        const existing = await query('SELECT * FROM portal_support_requests WHERE id = ? FOR UPDATE', [id], conn);
        if (existing[0]) {
          if (existing[0].account_group_id !== accountId || existing[0].creation_hash !== hash) throw failure(409, 'Comunicazione già utilizzata.');
          return;
        }
        await query("INSERT INTO portal_support_requests (id, account_group_id, subject, category, status, creation_hash) VALUES (?, ?, ?, 'OTHER', 'WAITING_CUSTOMER', ?)", [id, accountId, subject, hash], conn);
        await query("INSERT INTO portal_support_messages (id, request_id, actor_id, sender, visibility, body) VALUES (?, ?, ?, 'OPERATOR', 'PUBLIC', ?)", [crypto.randomUUID(), id, actor.id, body], conn);
        await audit(conn, { id, account_group_id: accountId }, actor, 'CONTACTED', {});
      }); return this.detail(id, actor);
    },
    async send(id, actor, input) {
      await ready(); const messageId = identifier(input.id), body = text(input.body, 4000);
      const internal = actor.kind === 'OPERATOR' && input.internal === true;
      if (actor.kind === 'CUSTOMER' && input.internal) throw failure(403, 'Operazione non consentita.');
      await transaction(async conn => {
        const request = await owned(id, actor, conn, true);
        const existing = await query('SELECT request_id, actor_id, body, visibility FROM portal_support_messages WHERE id = ?', [messageId], conn);
        if (existing[0]) {
          if (existing[0].request_id !== id || existing[0].actor_id !== actor.id || existing[0].body !== body || existing[0].visibility !== (internal ? 'INTERNAL' : 'PUBLIC')) throw failure(409, 'Messaggio già utilizzato.');
          return;
        }
        await query('INSERT INTO portal_support_messages (id, request_id, actor_id, sender, visibility, body) VALUES (?, ?, ?, ?, ?, ?)', [messageId, id, actor.id, actor.kind, internal ? 'INTERNAL' : 'PUBLIC', body], conn);
        const status = internal ? request.status : actor.kind === 'OPERATOR' ? 'WAITING_CUSTOMER' : request.assigned_to ? 'IN_PROGRESS' : 'NEW';
        await query('UPDATE portal_support_requests SET status = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [status, id], conn);
        await audit(conn, request, actor, internal ? 'INTERNAL_NOTE' : 'MESSAGE', { messageId, status });
      });
      return this.detail(id, actor);
    },
    async update(id, actor, input) {
      await ready(); if (actor.kind !== 'OPERATOR') throw failure(403, 'Permessi insufficienti.');
      if (!STATUSES.includes(input.status) || !Number.isSafeInteger(input.version)) throw failure(400, 'Stato non valido.');
      const assigned = input.assignedTo ? identifier(input.assignedTo) : null;
      await transaction(async conn => {
        const request = await owned(id, actor, conn, true);
        if (request.version !== input.version) throw failure(409, 'La richiesta è stata aggiornata. Ricaricala prima di modificare lo stato.');
        if (assigned) {
          const people = await query("SELECT id FROM app_auth_users WHERE id = ? AND role IN ('ADMIN', 'REVIEWER')", [assigned], conn);
          if (!people.length) throw failure(400, 'Operatore non valido.');
        }
        await query('UPDATE portal_support_requests SET status = ?, assigned_to = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [input.status, assigned, id], conn);
        await audit(conn, request, actor, 'UPDATED', { from: request.status, status: input.status, assignedTo: assigned });
      }); return this.detail(id, actor);
    },
    async read(id, actor, messageId) {
      await ready(); await owned(id, actor);
      const column = actor.kind === 'CUSTOMER' ? 'customer_read_at' : 'operator_read_at';
      await query(`UPDATE portal_support_requests r JOIN portal_support_messages m ON m.request_id = r.id AND m.id = ?
        SET r.${column} = GREATEST(COALESCE(r.${column}, m.created_at), m.created_at) WHERE r.id = ? ${actor.kind === 'CUSTOMER' ? "AND m.visibility = 'PUBLIC'" : ''}`, [identifier(messageId), id]);
      return { success: true };
    },
    async accounts({ page, q = '', status = '' } = {}) {
      await ready(); const currentPage = pageOf(page), values = [], conditions = [];
      if (status && !['ACTIVE', 'DISABLED'].includes(status)) throw failure(400, 'Stato account non valido.');
      if (status) { conditions.push('apu.status = ?'); values.push(status); }
      if (q) { if (typeof q !== 'string' || q.length > 160) throw failure(400, 'Ricerca non valida.'); conditions.push("CONCAT_WS(' ', u.Nome, u.Cognome, apu.email, apu.access_identifier, c.nome) LIKE ?"); values.push(`%${q}%`); }
      const from = `FROM activated_portal_users apu LEFT JOIN utenze_v2 u ON u.id COLLATE utf8mb4_unicode_ci = apu.id_auto COLLATE utf8mb4_unicode_ci
        LEFT JOIN condomini_v2 c ON c.id = u.condominio_id ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}`;
      const [total] = await query(`SELECT COUNT(DISTINCT apu.account_group_id) AS total ${from}`, values);
      const items = await query(`SELECT apu.account_group_id AS id, MIN(CONCAT_WS(' ', u.Nome, u.Cognome)) AS name,
        MIN(apu.access_identifier) AS accessIdentifier, MIN(apu.email) AS email, MAX(u.Mobile) AS phone,
        COUNT(*) AS linkedCount, MIN(c.nome) AS building, MIN(apu.activated_at) AS registeredAt, MAX(apu.last_login_at) AS lastLogin,
        IF(SUM(apu.status = 'ACTIVE') > 0, 'ACTIVE', 'DISABLED') AS status,
        (SELECT COUNT(*) FROM portal_support_requests r WHERE r.account_group_id = apu.account_group_id AND r.status <> 'RESOLVED') AS openRequests
        ${from} GROUP BY apu.account_group_id ORDER BY registeredAt DESC LIMIT 25 OFFSET ?`, [...values, (currentPage - 1) * 25]);
      return { items, total: Number(total.total), page: currentPage, pageSize: 25 };
    },
    async account(id) {
      await ready(); identifier(id);
      const links = await query(`SELECT apu.id_auto AS id, apu.id_user AS number, apu.access_identifier AS accessIdentifier,
        apu.status, apu.email, apu.last_login_at AS lastLogin, u.Nome AS firstName, u.Cognome AS lastName, u.Mobile AS phone,
        u.Interno AS interno, u.Scala AS scala, c.id AS buildingId, c.nome AS building, c.codice AS buildingCode
        FROM activated_portal_users apu LEFT JOIN utenze_v2 u ON u.id COLLATE utf8mb4_unicode_ci = apu.id_auto COLLATE utf8mb4_unicode_ci
        LEFT JOIN condomini_v2 c ON c.id = u.condominio_id WHERE apu.account_group_id = ? ORDER BY apu.id_user`, [id]);
      if (!links.length) throw failure(404, 'Account non trovato.'); return { id, links };
    },
    async accountStatus(id, actor, status) {
      await ready(); identifier(id);
      if (actor.kind !== 'OPERATOR' || actor.role !== 'ADMIN') throw failure(403, 'Solo gli amministratori possono modificare l’accesso.');
      if (!['ACTIVE', 'DISABLED'].includes(status)) throw failure(400, 'Stato account non valido.');
      await transaction(async conn => {
        const rows = await query('SELECT id FROM activated_portal_users WHERE account_group_id = ? FOR UPDATE', [id], conn);
        if (!rows.length) throw failure(404, 'Account non trovato.');
        await query('UPDATE activated_portal_users SET status = ?, updated_at = NOW() WHERE account_group_id = ?', [status, id], conn);
        await audit(conn, { account_group_id: id }, actor, 'ACCOUNT_STATUS', { status });
      }); return this.account(id);
    },
    async summary(actor) {
      await ready();
      if (actor?.kind === 'CUSTOMER') {
        await customer(actor);
        const [count] = await query(`SELECT COUNT(DISTINCT r.id) AS unreadRequests FROM portal_support_requests r
          JOIN portal_support_messages m ON m.request_id = r.id AND m.visibility = 'PUBLIC' AND m.sender = 'OPERATOR'
          WHERE r.account_group_id = ? AND (r.customer_read_at IS NULL OR m.created_at > r.customer_read_at)`, [actor.id]);
        return { unreadRequests: Number(count.unreadRequests) };
      }
      const [accounts] = await query('SELECT COUNT(DISTINCT account_group_id) AS total FROM activated_portal_users');
      const counts = await query('SELECT status, COUNT(*) AS total FROM portal_support_requests GROUP BY status');
      const operators = await query("SELECT id, username FROM app_auth_users WHERE role IN ('ADMIN', 'REVIEWER') ORDER BY username");
      return { users: Number(accounts.total), statuses: Object.fromEntries(STATUSES.map(status => [status, Number(counts.find(row => row.status === status)?.total || 0)])), operators };
    },
  };
}
module.exports = { createSupportService, STATUSES, CATEGORIES, UUID };
