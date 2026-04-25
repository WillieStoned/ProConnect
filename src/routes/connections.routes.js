'use strict';

const express = require('express');
const {
  sendRequest,
  respondToRequest,
  getConnections,
  getPendingRequests,
} = require('../controllers/connection.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.get('/', getConnections);
router.get('/pending', getPendingRequests);
router.post('/request/:userId', sendRequest);
router.put('/:connectionId/respond', respondToRequest);

module.exports = router;
