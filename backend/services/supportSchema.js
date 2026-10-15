const fs = require('node:fs');
const path = require('node:path');
function createSchemaInitializer(database, filename = path.resolve(__dirname, '../database/009_customer_support.sql')) {
  let ready;
  return () => {
    if (!ready) ready = (async () => {
      let stage = 'schema-owner-check';
      try {
        const [columns] = await database.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activated_portal_users'");
        if (!['account_group_id', 'id_auto', 'status'].every(name => columns.some(column => column.COLUMN_NAME === name))) {
          throw Object.assign(new Error('Collegamento agli account clienti non disponibile. Verifica il database del portale.'), { statusCode: 503, code: 'SUPPORT_OWNER_SCHEMA_MISSING' });
        }
        stage = 'schema-table-check';
        const [tables] = await database.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('portal_support_requests', 'portal_support_messages', 'portal_support_audit')");
        if (['portal_support_requests', 'portal_support_messages', 'portal_support_audit'].every(name => tables.some(table => table.TABLE_NAME === name))) return;
        // A provisioned archive must not require CREATE privileges or SQL files
        // to be present in every customer backend deployment.
        stage = 'schema-file';
        const statements = fs.readFileSync(filename, 'utf8').split(';').map(value => value.trim()).filter(Boolean);
        stage = 'schema-create';
        for (const statement of statements) await database.query(statement);
      } catch (error) {
        error.supportStage = stage;
        throw error;
      }
    })().catch(error => { ready = null; throw error; });
    return ready;
  };
}
module.exports = { createSchemaInitializer };
