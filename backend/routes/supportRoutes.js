const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { createSupportService } = require('../services/supportService');
const { createSchemaInitializer } = require('../services/supportSchema');
const { reportSupportError } = require('../services/supportErrors');
const service = createSupportService({ database: pool, ensureSchema: createSchemaInitializer(pool) });
function createCustomerRouter({ support = service, authenticate = authMiddleware } = {}) {
  const router = express.Router(); router.use(authenticate);
  const actor = req => ({ kind: 'CUSTOMER', id: req.user?.accountGroupId });
  const route = action => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { res.json(await action(req)); }
    catch (error) {
      if (!error.statusCode || error.statusCode >= 500) {
        const reference = reportSupportError(error, req);
        return res.status(503).json({ message: 'Assistenza momentaneamente non disponibile. Riprova tra poco.', reference });
      }
      res.status(error.statusCode).json({ message: error.publicMessage || error.message });
    }
  };
  router.get('/identity', route(req => support.identity(actor(req))));
  router.get('/summary', route(req => support.summary(actor(req))));
  router.get('/requests', route(req => support.list(actor(req), req.query)));
  router.post('/requests', route(req => support.create(actor(req), req.body)));
  router.get('/requests/:id', route(req => support.detail(req.params.id, actor(req), req.query.before)));
  router.post('/requests/:id/messages', route(req => support.send(req.params.id, actor(req), req.body)));
  router.post('/requests/:id/read', route(req => support.read(req.params.id, actor(req), req.body.messageId)));
  return router;
}
module.exports = createCustomerRouter();
module.exports.createCustomerRouter = createCustomerRouter;
