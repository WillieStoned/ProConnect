const { pool } = require('../config/database');

// POST /api/messages  — send a message
async function sendMessage(req, res) {
  const sender_id = req.user.user_id;
  const { receiver_id, content } = req.body;

  if (sender_id === Number.parseInt(receiver_id, 10)) {
    return res.status(400).json({ success: false, message: 'You cannot message yourself.' });
  }

  try {
    // Verify receiver exists
    const [receiver] = await pool.query('SELECT user_id FROM users WHERE user_id = ? AND is_active = TRUE', [receiver_id]);
    if (receiver.length === 0) return res.status(404).json({ success: false, message: 'Recipient not found.' });

    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [sender_id, receiver_id, content]
    );

    return res.status(201).json({
      success: true,
      message: 'Message sent.',
      data: { message_id: result.insertId, sender_id, receiver_id, content },
    });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// GET /api/messages/:userId  — conversation with a specific user
async function getConversation(req, res) {
  const my_id = req.user.user_id;
  const other_id = Number.parseInt(req.params.userId, 10);

  try {
    const [messages] = await pool.query(
      `SELECT m.message_id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at,
              u.full_name AS sender_name
       FROM messages m
       JOIN users u ON u.user_id = m.sender_id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [my_id, other_id, other_id, my_id]
    );

    // Mark messages as read
    await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE',
      [my_id, other_id]
    );

    return res.status(200).json({ success: true, data: messages });
  } catch (err) {
    console.error('getConversation error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// GET /api/messages  — inbox: list of conversations
async function getInbox(req, res) {
  const my_id = req.user.user_id;

  try {
    const [inbox] = await pool.query(
      `SELECT
         peers.other_user_id AS user_id,
         u.full_name,
         u.avatar_url,
         latest.content AS last_message,
         latest.created_at AS last_message_time,
         COALESCE(unread.unread_count, 0) AS unread_count
       FROM (
         SELECT DISTINCT
           IF(sender_id = ?, receiver_id, sender_id) AS other_user_id
         FROM messages
         WHERE sender_id = ? OR receiver_id = ?
       ) peers
       JOIN users u ON u.user_id = peers.other_user_id
       LEFT JOIN (
         SELECT
           IF(sender_id = ?, receiver_id, sender_id) AS other_user_id,
           content,
           created_at,
           ROW_NUMBER() OVER (
             PARTITION BY LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)
             ORDER BY created_at DESC, message_id DESC
           ) AS rn
         FROM messages
         WHERE sender_id = ? OR receiver_id = ?
       ) latest ON latest.other_user_id = peers.other_user_id AND latest.rn = 1
       LEFT JOIN (
         SELECT
           sender_id AS other_user_id,
           COUNT(*) AS unread_count
         FROM messages
         WHERE receiver_id = ? AND is_read = FALSE
         GROUP BY sender_id
       ) unread ON unread.other_user_id = peers.other_user_id
       ORDER BY latest.created_at DESC`,
      [my_id, my_id, my_id, my_id, my_id, my_id, my_id]
    );

    return res.status(200).json({ success: true, data: inbox });
  } catch (err) {
    console.error('getInbox error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { sendMessage, getConversation, getInbox };
