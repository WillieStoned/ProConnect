'use strict';

const express = require('express');
const { register, login, getMe } = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', authenticateToken, getMe);

module.exports = router;
