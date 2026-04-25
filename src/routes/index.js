'use strict';

const express = require('express');
const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const messagesRoutes = require('./messages.routes');
const connectionsRoutes = require('./connections.routes');
const eventsRoutes = require('./events.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/messages', messagesRoutes);
router.use('/connections', connectionsRoutes);
router.use('/events', eventsRoutes);

module.exports = router;
