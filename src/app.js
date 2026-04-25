'use strict';

const path = require('path');
require('./lib/load-env');

const { loadDependency } = require('./lib/dependency-loader');

const express = loadDependency('express');
const cors = loadDependency('cors');
const rateLimit = loadDependency('express-rate-limit');

const apiRoutes = require('./routes');
const { requestIdMiddleware } = require('./middleware/request-id');
const { apiNotFound } = require('./middleware/not-found');
const { errorHandler } = require('./middleware/error-handler');
const {
  NODE_ENV,
  IS_PRODUCTION,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX_REQUESTS,
  isAllowedOrigin,
} = require('./config/env');
const {
  isBlobStorageEnabled,
  getLocalUploadsDir,
} = require('./services/asset-storage');

const { version: serverVersion } = require('../Server/package.json');

const app = express();
const CLIENT_DIR = path.join(__dirname, '../Client');
const UPLOADS_DIR = getLocalUploadsDir();

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
app.use(requestIdMiddleware);

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

if (!isBlobStorageEnabled()) {
  app.use('/uploads', express.static(UPLOADS_DIR, {
    dotfiles: 'deny',
    index: false,
    maxAge: IS_PRODUCTION ? '7d' : 0,
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }));
}

app.use(express.static(CLIENT_DIR));
app.use('/Client', express.static(CLIENT_DIR));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ProConnect API is running',
    environment: NODE_ENV,
    version: serverVersion,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    request_id: req.requestId,
    storage: isBlobStorageEnabled() ? 'vercel_blob' : 'local_disk',
  });
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api', apiRoutes);
app.use('/api', apiNotFound);

app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

app.use(errorHandler);

module.exports = app;
