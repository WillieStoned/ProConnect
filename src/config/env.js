'use strict';

require('../lib/load-env');

const VALID_NODE_ENVS = new Set(['development', 'test', 'production']);
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_VERCEL = Boolean(process.env.VERCEL);

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

module.exports = {
  NODE_ENV,
  IS_PRODUCTION,
  IS_VERCEL,
  PORT,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX_REQUESTS,
  isAllowedOrigin,
  validateRuntimeConfig,
};
