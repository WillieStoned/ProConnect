const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const schemaPath = path.resolve(__dirname, '..', 'Server', 'database', 'schema.sql');

async function initDatabase() {
  if (!fs.existsSync(schemaPath)) {
    console.error('Schema file not found.');
    console.error(`Expected path: ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  if (!sql.trim()) {
    console.error(`Schema file is empty: ${schemaPath}`);
    process.exit(1);
  }

  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    await connection.query(sql);
    console.log('Database schema applied successfully.');
    console.log(`Schema path: ${schemaPath}`);
    console.log(`Target host: ${connectionConfig.host}:${connectionConfig.port}`);
  } catch (err) {
    console.error('Failed to apply database schema.');
    console.error(`Schema path: ${schemaPath}`);
    console.error(`Code: ${err.code || 'UNKNOWN'}`);
    console.error(`Details: ${err.message || 'No details provided.'}`);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
