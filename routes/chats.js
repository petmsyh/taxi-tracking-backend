const express = require('express');
const pool = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateInput } = require('../middleware/validator');

const router = express.Router();

// Create a new chat session
router.post('/',
  authenticate,
  authorize('patient'),
  validateInput({
    doctor_id: { required: true, uuid: true }
  }),
  async (req, res) => {
    const patientId = req.user.id;
    const { doctor_id } = req.body;

    try {
      // Check if doctor exists and is available
      const doctorCheck = await pool.query(
        `SELECT u.id, d.is_available 
         FROM users u 
         JOIN doctors d ON u.id = d.user_id 
         WHERE u.id = $1 AND u.role = 'doctor'`,
        [doctor_id]
      );

      if (doctorCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      if (!doctorCheck.rows[0].is_available) {
        return res.status(400).json({ error: 'Doctor is not available' });
      }

      // Check if there's an active chat already
      const existingChat = await pool.query(
        `SELECT id FROM chats 
         WHERE patient_id = $1 AND doctor_id = $2 AND status = 'active'`,
        [patientId, doctor_id]
      );

      if (existingChat.rows.length > 0) {
        return res.status(400).json({
          error: 'Active chat already exists',
          chat_id: existingChat.rows[0].id
        });
      }

      // Create new chat
      const result = await pool.query(
        `INSERT INTO chats (patient_id, doctor_id, status) 
         VALUES ($1, $2, 'pending') 
         RETURNING *`,
        [patientId, doctor_id]
      );

      res.status(201).json({
        message: 'Chat session created',
        chat: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get user's chats
router.get('/', authenticate, async (req, res) => {
  const userId = req.user.id;
  const { status } = req.query;

  try {
    let query = `
      SELECT 
        c.id, c.status, c.created_at, c.updated_at,
        p.id as patient_id, p.first_name as patient_first_name, p.last_name as patient_last_name,
        d.id as doctor_id, d.first_name as doctor_first_name, d.last_name as doctor_last_name,
        doc.specialties,
        (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND read_flag = false AND sender_id != $1) as unread_count
      FROM chats c
      JOIN users p ON c.patient_id = p.id
      JOIN users d ON c.doctor_id = d.id
      LEFT JOIN doctors doc ON d.id = doc.user_id
      WHERE (c.patient_id = $1 OR c.doctor_id = $1)
    `;

    const params = [userId];

    if (status) {
      query += ' AND c.status = $2';
      params.push(status);
    }

    query += ' ORDER BY c.updated_at DESC';

    const result = await pool.query(query, params);

    res.json({
      chats: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific chat details
router.get('/:chatId', authenticate, async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    // Get chat details
    const chatResult = await pool.query(
      `
      SELECT 
        c.id, c.status, c.created_at, c.updated_at,
        p.id as patient_id, p.first_name as patient_first_name, p.last_name as patient_last_name,
        d.id as doctor_id, d.first_name as doctor_first_name, d.last_name as doctor_last_name,
        doc.specialties, doc.profile_photo_url
      FROM chats c
      JOIN users p ON c.patient_id = p.id
      JOIN users d ON c.doctor_id = d.id
      LEFT JOIN doctors doc ON d.id = doc.user_id
      WHERE c.id = $1 AND (c.patient_id = $2 OR c.doctor_id = $2)
      `,
      [chatId, userId]
    );

    if (chatResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found or access denied' });
    }

    // Get messages
    const messagesResult = await pool.query(
      `
      SELECT 
        m.id, m.content, m.attachments, m.message_type, m.read_flag, m.created_at,
        m.sender_id,
        u.first_name as sender_first_name, u.last_name as sender_last_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1
      ORDER BY m.created_at ASC
      `,
      [chatId]
    );

    // Mark messages as read
    await pool.query(
      `UPDATE messages SET read_flag = true 
       WHERE chat_id = $1 AND sender_id != $2`,
      [chatId, userId]
    );

    res.json({
      chat: chatResult.rows[0],
      messages: messagesResult.rows
    });
  } catch (error) {
    console.error('Error fetching chat details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update chat status
router.put('/:chatId/status',
  authenticate,
  validateInput({
    status: { required: true, enum: ['active', 'pending', 'completed', 'cancelled'] }
  }),
  async (req, res) => {
    const { chatId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    try {
      // Verify user is part of the chat
      const chatCheck = await pool.query(
        'SELECT patient_id, doctor_id FROM chats WHERE id = $1',
        [chatId]
      );

      if (chatCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const chat = chatCheck.rows[0];
      if (chat.patient_id !== userId && chat.doctor_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update status
      const result = await pool.query(
        `UPDATE chats SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 RETURNING *`,
        [status, chatId]
      );

      res.json({
        message: 'Chat status updated',
        chat: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating chat status:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
