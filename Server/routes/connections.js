const express = require('express');
const router = express.Router();
const { sendRequest, respondToRequest, getConnections, getPendingRequests } = require('../controllers/connectionController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', getConnections);
router.get('/pending', getPendingRequests);
router.post('/request/:userId', sendRequest);
router.put('/:connectionId/respond', respondToRequest);

module.exports = router;
