'use strict';

const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = String(requestId);
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

module.exports = { requestIdMiddleware };
