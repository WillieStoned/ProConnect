const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

function resolveUploadRoot() {
  return process.env.UPLOAD_PATH || path.join(__dirname, '../uploads');
}

function deleteStoredFileIfPresent(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
    return;
  }

  const uploadRoot = resolveUploadRoot();
  const storedPath = path.join(uploadRoot, path.basename(fileUrl));
  if (fs.existsSync(storedPath)) {
    fs.unlinkSync(storedPath);
  }
}

// GET /api/users/:userId - public profile
async function getProfile(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, full_name, headline, bio, location, avatar_url, created_at FROM users WHERE user_id = ? AND is_active = TRUE',
      [req.params.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// PUT /api/users/me - update own profile
async function updateProfile(req, res) {
  const user_id = req.user.user_id;
  const { full_name, headline, bio, location } = req.body;

  try {
    await pool.query(
      'UPDATE users SET full_name = COALESCE(?, full_name), headline = ?, bio = ?, location = ? WHERE user_id = ?',
      [full_name, headline, bio, location, user_id]
    );
    return res.status(200).json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// POST /api/users/me/resume - upload resume PDF
async function uploadResume(req, res) {
  const user_id = req.user.user_id;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  try {
    const [existing] = await pool.query('SELECT resume_url FROM users WHERE user_id = ?', [user_id]);
    deleteStoredFileIfPresent(existing[0]?.resume_url);

    const resume_url = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE users SET resume_url = ? WHERE user_id = ?', [resume_url, user_id]);

    return res.status(200).json({ success: true, message: 'Resume uploaded.', data: { resume_url } });
  } catch (err) {
    console.error('uploadResume error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// POST /api/users/me/avatar - upload profile photo
async function uploadAvatar(req, res) {
  const user_id = req.user.user_id;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  try {
    const [existing] = await pool.query('SELECT avatar_url FROM users WHERE user_id = ?', [user_id]);
    deleteStoredFileIfPresent(existing[0]?.avatar_url);

    const avatar_url = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE users SET avatar_url = ? WHERE user_id = ?', [avatar_url, user_id]);

    return res.status(200).json({ success: true, message: 'Profile photo uploaded.', data: { avatar_url } });
  } catch (err) {
    console.error('uploadAvatar error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// GET /api/users - search users
async function searchUsers(req, res) {
  const { q, limit = 20, offset = 0 } = req.query;
  const search = `%${q || ''}%`;

  try {
    const [rows] = await pool.query(
      `SELECT user_id, full_name, headline, location, avatar_url
       FROM users
       WHERE is_active = TRUE AND (full_name LIKE ? OR headline LIKE ? OR bio LIKE ?)
       LIMIT ? OFFSET ?`,
      [search, search, search, Number.parseInt(limit, 10), Number.parseInt(offset, 10)]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('searchUsers error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getProfile, updateProfile, uploadResume, uploadAvatar, searchUsers };
