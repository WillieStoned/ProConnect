const mysql = require('mysql2/promise');
require('dotenv').config();

function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function buildSslConfig() {
  const isSslEnabled = parseBooleanEnv(process.env.DB_SSL, false);
  if (!isSslEnabled) {
    return undefined;
  }

  const sslConfig = {
    rejectUnauthorized: parseBooleanEnv(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
  };

  const caFromBase64 = process.env.DB_SSL_CA_BASE64;
  if (caFromBase64) {
    sslConfig.ca = Buffer.from(caFromBase64, 'base64').toString('utf8');
    return sslConfig;
  }

  const caFromPlainEnv = process.env.DB_SSL_CA;
  if (caFromPlainEnv) {
    sslConfig.ca = caFromPlainEnv.replace(/\\n/g, '\n');
  }

  return sslConfig;
}

const ssl = buildSslConfig();

// Create a connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pro_connect',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ...(ssl ? { ssl } : {}),
});

let poolClosed = false;

// Test database connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL database connected successfully');
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`Database: ${process.env.DB_NAME || 'pro_connect'}`);
    console.log(`SSL: ${ssl ? 'enabled' : 'disabled'}`);
    connection.release();
  } catch (err) {
    const message = err.message || 'No database error message was provided.';
    console.error('Database connection failed');
    console.error(`Code: ${err.code || 'UNKNOWN'}`);
    console.error(`Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    console.error(`Database: ${process.env.DB_NAME || 'pro_connect'}`);
    console.error(`Details: ${message}`);
    throw err;
  }
}

async function closePool() {
  if (poolClosed) {
    return;
  }
  await pool.end();
  poolClosed = true;
  console.log('MySQL pool closed');
}

module.exports = { pool, testConnection, closePool };
