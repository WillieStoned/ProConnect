const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pro_connect',
    connectTimeout: 10000,
  };

  let connection;
  try {
    connection = await mysql.createConnection(config);
    const [rows] = await connection.query('SELECT DATABASE() AS db_name, NOW() AS db_time');
    console.log('Database connection successful.');
    console.log(rows[0]);
  } catch (err) {
    console.error('Database connection failed.');
    console.error(`Code: ${err.code || 'UNKNOWN'}`);
    console.error(`Host: ${config.host}:${config.port}`);
    console.error(`Database: ${config.database}`);
    console.error(`Details: ${err.message || 'No details provided.'}`);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testDatabase();
