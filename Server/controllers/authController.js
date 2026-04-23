const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
require('dotenv').config();

// POST /api/auth/register
async function register(req, res) {
  const { full_name, email, password } = req.body;

  try {
    // Check for existing user
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password (salt rounds = 12 for strong security)
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [full_name, email, password_hash]
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { user_id: result.insertId, full_name, email },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  try {
    if (!process.env.JWT_SECRET) {
      console.error('Login error: JWT_SECRET is not configured');
      return res.status(500).json({ success: false, message: 'Authentication service is not configured.' });
    }

    // Fetch user by email
    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, password_hash, role FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (rows.length === 0) {
      // Generic message to prevent user enumeration
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      data: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
}

// GET /api/auth/me  (protected)
async function getMe(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, headline, bio, location, avatar_url, resume_url, role, created_at FROM users WHERE user_id = ?',
      [req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { register, login, getMe };
