'use strict';

const express = require('express');
const { createEvent, getEvents, registerForEvent } = require('../controllers/event.controller');
const { authenticateToken } = require('../middleware/auth');
const { validateEvent } = require('../middleware/validate');

const router = express.Router();

router.get('/', getEvents);
router.post('/', authenticateToken, validateEvent, createEvent);
router.post('/:eventId/register', authenticateToken, registerForEvent);

module.exports = router;
