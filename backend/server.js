const express = require('express');
const cors = require('cors');
require('./config/env');

const registrationRoutes = require('./routes/registrationRoutes');
const authRoutes = require('./routes/authRoutes');
const portalRoutes = require('./routes/portalRoutes');

const app = express();
const port = process.env.PORT || 4000;
const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5174, http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use((req, res, next) => {
  res.setTimeout(Number(process.env.HTTP_RESPONSE_TIMEOUT_MS || 15000), () => {
    if (!res.headersSent) {
      res.status(504).json({ message: 'La richiesta ha impiegato troppo tempo.' });
    }
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'idromardi-client-api' });
});

app.use('/api/registration', registrationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/portal', portalRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    message: err.publicMessage || 'Errore interno del server.',
  });
});

app.listen(port, () => {
  console.log(`Idromardi API listening on http://127.0.0.1:${port}`);
});
