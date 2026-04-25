'use strict';

const express = require('express');
const { sendMessage, getConversation, getInbox } = require('../controllers/message.controller');
const { authenticateToken } = require('../middleware/auth');
const { validateMessage } = require('../middleware/validate');

const router = express.Router();

router.use(authenticateToken);
router.get('/', getInbox);
router.post('/', validateMessage, sendMessage);
router.get('/:userId', getConversation);

module.exports = router;
