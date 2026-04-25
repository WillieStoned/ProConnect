'use strict';

function apiNotFound(req, res) {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `API route not found: ${req.originalUrl}`,
    request_id: req.requestId,
  });
}

module.exports = { apiNotFound };
