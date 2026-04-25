const express = require('express');
const cors = require('cors');
const path = require('path');
require('./config/env');

const registrationRoutes = require('./routes/registrationRoutes');
const authRoutes = require('./routes/authRoutes');
const portalRoutes = require('./routes/portalRoutes');

const app = express();
const port = process.env.PORT || 4000;
 

 const allowedOrigins = [
  "http://app.idromardi.it",
  "https://app.idromardi.it",
  "https://idromardi-client-platform.onrender.com"
];


app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
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

// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../frontend/dist')));
//   app.get('*splat', (req, res) => {
//     if (!req.path.startsWith('/api')) {
//       res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
//     }
//   });
// }

app.listen(port, () => {
  console.log(`Idromardi API listening on ${port}`);
});
