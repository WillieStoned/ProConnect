'use strict';

const app = require('../src/app');

// For Vercel serverless functions, export the Express app directly
// For local development, start the server if this file is run directly
if (require.main === module) {
  const { startLocalServer } = require('../src/server-local');
  if (!process.env.VERCEL) {
    void startLocalServer();
  }
}

module.exports = app;
