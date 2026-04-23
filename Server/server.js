'use strict';

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { testConnection, closePool } = require('./config/database');
const { version: appVersion } = require('./package.json');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const connectionRoutes = require('./routes/connections');
const eventRoutes = require('./routes/events');

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const CLIENT_DIR = path.join(__dirname, '../Client');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const VALID_NODE_ENVS = new Set(['development', 'test', 'production']);

function parsePort() {
  const raw = process.env.PORT;
  if (!raw) {
    return 5500;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return value;
}

function parsePositiveIntEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

const PORT = parsePort();
const RATE_LIMIT_WINDOW_MS = parsePositiveIntEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000);
const RATE_LIMIT_MAX_REQUESTS = parsePositiveIntEnv('RATE_LIMIT_MAX_REQUESTS', 300);
const AUTH_RATE_LIMIT_WINDOW_MS = parsePositiveIntEnv('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000);
const AUTH_RATE_LIMIT_MAX_REQUESTS = parsePositiveIntEnv('AUTH_RATE_LIMIT_MAX_REQUESTS', 20);

const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'];
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = IS_PRODUCTION
  ? configuredOrigins
  : Array.from(new Set([...DEFAULT_DEV_ORIGINS, ...configuredOrigins]));

function normalizeOrigin(value) {
  return String(value || '').replace(/\/+$/, '');
}

function isLocalDevOrigin(origin) {
  try {
    const parsed = new URL(origin);
    const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    return isLocalHost && isHttp;
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedAllowed = new Set(allowedOrigins.map((item) => normalizeOrigin(item)));
  if (normalizedAllowed.has(normalizedOrigin)) {
    return true;
  }

  // Development quality-of-life: allow localhost/127.0.0.1 on any port.
  if (!IS_PRODUCTION && isLocalDevOrigin(normalizedOrigin)) {
    return true;
  }

  return false;
}

function validateRuntimeConfig() {
  const issues = [];

  if (!VALID_NODE_ENVS.has(NODE_ENV)) {
    issues.push(`NODE_ENV must be one of: ${Array.from(VALID_NODE_ENVS).join(', ')}`);
  }

  const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
  for (const key of required) {
    if (!process.env[key] || !String(process.env[key]).trim()) {
      issues.push(`${key} is required.`);
    }
  }

  if (process.env.JWT_SECRET) {
    const secret = String(process.env.JWT_SECRET);
    if (secret.includes('replace_with')) {
      issues.push('JWT_SECRET appears to use a placeholder value.');
    }
    if (secret.length < 32) {
      issues.push('JWT_SECRET should be at least 32 characters long.');
    }
  }

  if (process.env.DB_PORT) {
    const dbPort = Number.parseInt(process.env.DB_PORT, 10);
    if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
      issues.push('DB_PORT must be an integer between 1 and 65535.');
    }
  }

  if (IS_PRODUCTION && allowedOrigins.length === 0) {
    issues.push('CORS_ORIGIN is required in production.');
  }

  if (issues.length > 0) {
    throw new Error(`Invalid startup configuration:\n- ${issues.join('\n- ')}`);
  }
}

const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please slow down and try again.',
  },
});

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'AUTH_RATE_LIMITED',
    message: 'Too many authentication attempts. Please try again later.',
  },
});

if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = String(requestId);
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR, {
  dotfiles: 'deny',
  index: false,
  maxAge: IS_PRODUCTION ? '7d' : 0,
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));
app.use(express.static(CLIENT_DIR));
app.use('/Client', express.static(CLIENT_DIR));

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/events', eventRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ProConnect API is running',
    environment: NODE_ENV,
    version: appVersion,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    request_id: req.requestId,
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `API route not found: ${req.originalUrl}`,
    request_id: req.requestId,
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

app.use((err, req, res, _next) => {
  console.error(`[${req.requestId || 'unknown-request'}] Unhandled error:`, err);
  if (err.message === 'CORS origin not allowed') {
    return res.status(403).json({
      success: false,
      code: 'CORS_BLOCKED',
      message: 'Origin not allowed by CORS policy.',
      request_id: req.requestId,
    });
  }

  const parsedStatus = Number(err.status);
  const status = Number.isInteger(parsedStatus) && parsedStatus >= 400 && parsedStatus <= 599
    ? parsedStatus
    : 500;
  const message = status >= 500
    ? 'An unexpected server error occurred.'
    : (err.message || 'Request failed.');

  const payload = {
    success: false,
    code: err.code || (status >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR'),
    message,
    request_id: req.requestId,
  };

  if (!IS_PRODUCTION) {
    payload.details = err.message;
  }

  return res.status(status).json(payload);
});

let serverInstance;
let shutdownInProgress = false;

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

async function startServer() {
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

startServer();
