const { pool } = require('../config/database');

// POST /api/events
async function createEvent(req, res) {
  const organizer_id = req.user.user_id;
  const { title, description, location, event_type, start_date, end_date, max_capacity, is_public } = req.body;

  if (new Date(end_date) <= new Date(start_date)) {
    return res.status(400).json({ success: false, message: 'End date must be after start date.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO events (organizer_id, title, description, location, event_type, start_date, end_date, max_capacity, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizer_id, title, description, location, event_type, start_date, end_date, max_capacity || null, is_public !== false]
    );
    return res.status(201).json({ success: true, message: 'Event created.', data: { event_id: result.insertId } });
  } catch (err) {
    console.error('createEvent error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// GET /api/events  — list upcoming public events
async function getEvents(req, res) {
  try {
    const [events] = await pool.query(
      `SELECT e.*, u.full_name AS organizer_name,
              COUNT(ep.participant_id) AS participant_count
       FROM events e
       JOIN users u ON u.user_id = e.organizer_id
       LEFT JOIN event_participants ep ON ep.event_id = e.event_id AND ep.status != 'cancelled'
       WHERE e.is_public = TRUE AND e.start_date >= NOW()
       GROUP BY e.event_id
       ORDER BY e.start_date ASC
       LIMIT 50`
    );
    return res.status(200).json({ success: true, data: events });
  } catch (err) {
    console.error('getEvents error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// POST /api/events/:eventId/register
async function registerForEvent(req, res) {
  const user_id = req.user.user_id;
  const event_id = Number.parseInt(req.params.eventId, 10);

  try {
    const [event] = await pool.query('SELECT * FROM events WHERE event_id = ?', [event_id]);
    if (event.length === 0) return res.status(404).json({ success: false, message: 'Event not found.' });

    // Check capacity
    if (event[0].max_capacity) {
      const [count] = await pool.query(
        "SELECT COUNT(*) AS c FROM event_participants WHERE event_id = ? AND status != 'cancelled'",
        [event_id]
      );
      if (count[0].c >= event[0].max_capacity) {
        return res.status(409).json({ success: false, message: 'Event is at full capacity.' });
      }
    }

    await pool.query(
      'INSERT INTO event_participants (event_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE status = "registered"',
      [event_id, user_id]
    );

    return res.status(200).json({ success: true, message: 'Successfully registered for event.' });
  } catch (err) {
    console.error('registerForEvent error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { createEvent, getEvents, registerForEvent };
