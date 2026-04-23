const { pool } = require('../config/database');

// POST /api/connections/request/:userId
async function sendRequest(req, res) {
  const requester_id = req.user.user_id;
  const addressee_id = Number.parseInt(req.params.userId, 10);

  if (requester_id === addressee_id) {
    return res.status(400).json({ success: false, message: 'You cannot connect with yourself.' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT * FROM connections WHERE (requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?)',
      [requester_id, addressee_id, addressee_id, requester_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Connection request already exists.' });
    }

    await pool.query('INSERT INTO connections (requester_id, addressee_id) VALUES (?, ?)', [requester_id, addressee_id]);
    return res.status(201).json({ success: true, message: 'Connection request sent.' });
  } catch (err) {
    console.error('sendRequest error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// PUT /api/connections/:connectionId/respond
async function respondToRequest(req, res) {
  const { status } = req.body; // 'accepted' or 'rejected'
  const { connectionId } = req.params;
  const user_id = req.user.user_id;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be accepted or rejected.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM connections WHERE connection_id = ? AND addressee_id = ? AND status = "pending"',
      [connectionId, user_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Pending request not found.' });

    await pool.query('UPDATE connections SET status = ? WHERE connection_id = ?', [status, connectionId]);
    return res.status(200).json({ success: true, message: `Connection ${status}.` });
  } catch (err) {
    console.error('respondToRequest error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// GET /api/connections  — list accepted connections
async function getConnections(req, res) {
  const user_id = req.user.user_id;

  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.headline, u.avatar_url, c.created_at AS connected_since
       FROM connections c
       JOIN users u ON u.user_id = IF(c.requester_id = ?, c.addressee_id, c.requester_id)
       WHERE (c.requester_id = ? OR c.addressee_id = ?) AND c.status = 'accepted'`,
      [user_id, user_id, user_id]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('getConnections error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// GET /api/connections/pending  — incoming pending requests
async function getPendingRequests(req, res) {
  const user_id = req.user.user_id;

  try {
    const [rows] = await pool.query(
      `SELECT c.connection_id, u.user_id, u.full_name, u.headline, u.avatar_url, c.created_at
       FROM connections c
       JOIN users u ON u.user_id = c.requester_id
       WHERE c.addressee_id = ? AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [user_id]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('getPendingRequests error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { sendRequest, respondToRequest, getConnections, getPendingRequests };
