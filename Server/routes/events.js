const express = require('express');
const router = express.Router();
const { createEvent, getEvents, registerForEvent } = require('../controllers/eventController');
const { authenticateToken } = require('../middleware/auth');
const { validateEvent } = require('../middleware/validate');

router.get('/', getEvents);
router.post('/', authenticateToken, validateEvent, createEvent);
router.post('/:eventId/register', authenticateToken, registerForEvent);

module.exports = router;
