const mysql = require('mysql2/promise');
require('./env');

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_NAME', 'DB_PORT'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Missing database environment variables: ${missingEnv.join(', ')}`);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 8000),
  dateStrings: true,
});

module.exports = pool;
