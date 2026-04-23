const express = require('express');
const router = express.Router();
const { sendMessage, getConversation, getInbox } = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');
const { validateMessage } = require('../middleware/validate');

router.use(authenticateToken); // All message routes are protected
router.get('/', getInbox);
router.post('/', validateMessage, sendMessage);
router.get('/:userId', getConversation);

module.exports = router;
