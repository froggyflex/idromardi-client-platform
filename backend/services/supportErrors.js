const crypto = require('node:crypto');

function reportSupportError(error, request, logger = console.error) {
  const reference = crypto.randomUUID();
  const details = {
    reference,
    method: request.method,
    route: request.route?.path || 'unknown',
    code: error.code || error.name || 'UNEXPECTED_ERROR',
  };
  if (Number.isInteger(error.errno)) details.errno = error.errno;
  if (/^[A-Z0-9]{5}$/i.test(error.sqlState || '')) details.sqlState = error.sqlState;
  if (/^[a-z-]+$/.test(error.supportStage || '')) details.stage = error.supportStage;
  // SQL text, parameters, message bodies, credentials and session IDs stay out
  // of logs and customer responses. Unknown-column names are schema metadata.
  if (error.code === 'ER_BAD_FIELD_ERROR') {
    const column = /Unknown column '([a-z0-9_.]+)'/i.exec(error.sqlMessage || '')?.[1];
    if (column) details.column = column;
  }
  logger('[Customer support]', JSON.stringify(details));
  return reference;
}
module.exports = { reportSupportError };
