'use strict';

require('./lib/load-env');

const app = require('./app');
const { testConnection, closePool } = require('./db/mysql');
const { PORT, NODE_ENV, IS_VERCEL, validateRuntimeConfig } = require('./config/env');

let serverInstance;
let shutdownInProgress = false;
let processHandlersRegistered = false;

async function shutdown(signal, exitCode = 0) {
  if (shutdownInProgress) {
    return;
  }

  shutdownInProgress = true;
  console.log(`[shutdown] ${signal} received. Closing resources...`);

  try {
    if (serverInstance) {
      await new Promise((resolve, reject) => {
        serverInstance.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }

    await closePool();
  } catch (err) {
    console.error('[shutdown] Error while closing resources:', err.message || err);
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
}

function registerProcessHandlers() {
  if (processHandlersRegistered) {
    return;
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
    void shutdown('UNHANDLED_REJECTION', 1);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    void shutdown('UNCAUGHT_EXCEPTION', 1);
  });

  processHandlersRegistered = true;
}

async function startLocalServer() {
  registerProcessHandlers();

  try {
    validateRuntimeConfig();
    await testConnection();
    serverInstance = app.listen(PORT, () => {
      console.log(`ProConnect API running on http://localhost:${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });

    serverInstance.on('error', (err) => {
      console.error('HTTP server error:', err.message || err);
      void shutdown('HTTP_SERVER_ERROR', 1);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message || err);
    process.exit(1);
  }
}

if (require.main === module && !IS_VERCEL) {
  void startLocalServer();
}

module.exports = { startLocalServer, shutdown };
