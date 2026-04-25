'use strict';

const { IS_PRODUCTION } = require('../config/env');

function errorHandler(err, req, res, _next) {
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
}

module.exports = { errorHandler };
