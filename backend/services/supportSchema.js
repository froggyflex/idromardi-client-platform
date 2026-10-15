const fs = require('node:fs');
const path = require('node:path');
function createSchemaInitializer(database, filename = path.resolve(__dirname, '../database/009_customer_support.sql')) {
  let ready;
  return () => {
    if (!ready) ready = (async () => {
      const [columns] = await database.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activated_portal_users'");
      if (!['account_group_id', 'id_auto', 'status'].every(name => columns.some(column => column.COLUMN_NAME === name))) throw Object.assign(new Error('Collegamento agli account clienti non disponibile.'), { statusCode: 503 });
      for (const statement of fs.readFileSync(filename, 'utf8').split(';').map(value => value.trim()).filter(Boolean)) await database.query(statement);
    })().catch(error => { ready = null; throw error; });
    return ready;
  };
}
module.exports = { createSchemaInitializer };
