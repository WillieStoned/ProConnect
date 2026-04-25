'use strict';

const app = require('../src/app');
const { startLocalServer } = require('../src/server-local');

if (require.main === module && !process.env.VERCEL) {
  void startLocalServer();
}

module.exports = app;
