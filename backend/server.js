const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

require("./config/env");

const registrationRoutes = require("./routes/registrationRoutes");
const authRoutes = require("./routes/authRoutes");
const portalRoutes = require("./routes/portalRoutes");

const app = express();
const port = process.env.PORT || 4000;
app.use((req, res, next) => {
  const origin = req.headers.origin;

  const allowedOrigins = [
    "http://localhost:5173",
    "https://app.idromardi.it",
    "http://app.idromardi.it"
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/* =========================
   DEBUG LOGGING (FILE)
========================= */
function logToFile(message) {
  try {
    fs.appendFileSync(
      path.join(__dirname, "debug.log"),
      `[${new Date().toISOString()}] ${message}\n`
    );
  } catch (e) {
    console.error("LOG ERROR:", e);
  }
}

logToFile("BOOTING SERVER: " + __filename);

/* =========================
   REQUEST LOGGER
========================= */
app.use((req, res, next) => {
  logToFile(
    `${req.method} ${req.url} ORIGIN=${req.headers.origin || "none"}`
  );
  next();
});

/* =========================
   CORS (STRONG + SAFE FOR cPANEL)
========================= */
// app.use(
//   cors({
//     origin: true, // reflect origin dynamically
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

// IMPORTANT: handle preflight explicitly
// app.options(
//   /.*/,
//   cors({
//     origin: true,
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

/* =========================
   BODY PARSER
========================= */
app.use(express.json());

/* =========================
   TIMEOUT HANDLING
========================= */
app.use((req, res, next) => {
  res.setTimeout(
    Number(process.env.HTTP_RESPONSE_TIMEOUT_MS || 15000),
    () => {
      if (!res.headersSent) {
        res
          .status(504)
          .json({ message: "La richiesta ha impiegato troppo tempo." });
      }
    }
  );
  next();
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "idromardi-client-api" });
});

app.get("/api/debug", (_req, res) => {
  res.json({
    runningFile: __filename,
    cwd: process.cwd(),
    time: new Date().toISOString()
  });
});


/* =========================
   ROUTES
========================= */
app.use("/api/registration", registrationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/portal", portalRoutes);

/* =========================
   ERROR HANDLER
========================= */
app.use((err, _req, res, _next) => {
  console.error(err);
  logToFile("ERROR: " + err.message);

  res.status(err.statusCode || 500).json({
    message: err.publicMessage || "Errore interno del server.",
  });
});

/* =========================
   START SERVER
========================= */

app.listen(process.env.PORT || 4000, () => {
  console.log(`Idromardi API listening`);
});

module.exports = app;