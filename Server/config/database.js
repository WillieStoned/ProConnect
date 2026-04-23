const mysql = require('mysql2/promise');
require('dotenv').config();

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
});

let poolClosed = false;

// Test database connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL database connected successfully');
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`Database: ${process.env.DB_NAME || 'pro_connect'}`);
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
