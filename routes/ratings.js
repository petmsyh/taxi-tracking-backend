const express = require('express');
const pool = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateInput } = require('../middleware/validator');

const router = express.Router();

// Create a rating for a doctor
router.post('/',
  authenticate,
  authorize('patient'),
  validateInput({
    doctor_id: { required: true, uuid: true },
    chat_id: { required: true, uuid: true },
    rating: { required: true, numeric: true },
    review_text: { required: false }
  }),
  async (req, res) => {
    const patientId = req.user.id;
    const { doctor_id, chat_id, rating, review_text } = req.body;

    try {
      // Validate rating range
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      // Check if chat exists and belongs to patient
      const chatCheck = await pool.query(
        `SELECT id, status FROM chats 
         WHERE id = $1 AND patient_id = $2 AND doctor_id = $3`,
        [chat_id, patientId, doctor_id]
      );

      if (chatCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Chat not found or unauthorized' });
      }

      // Check if rating already exists for this chat
      const existingRating = await pool.query(
        'SELECT id FROM ratings WHERE chat_id = $1',
        [chat_id]
      );

      if (existingRating.rows.length > 0) {
        return res.status(400).json({ error: 'Rating already exists for this chat' });
      }

      // Create rating
      const result = await pool.query(
        `INSERT INTO ratings (doctor_id, patient_id, chat_id, rating, review_text) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [doctor_id, patientId, chat_id, rating, review_text]
      );

      res.status(201).json({
        message: 'Rating submitted successfully',
        rating: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating rating:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get ratings for a doctor
router.get('/doctor/:doctorId', async (req, res) => {
  const { doctorId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const offset = (page - 1) * limit;

    // Get ratings with patient info
    const result = await pool.query(
      `
      SELECT 
        r.id, r.rating, r.review_text, r.created_at,
        u.first_name as patient_first_name, u.last_name as patient_last_name
      FROM ratings r
      JOIN users u ON r.patient_id = u.id
      WHERE r.doctor_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [doctorId, limit, offset]
    );

    // Get rating statistics
    const stats = await pool.query(
      `
      SELECT 
        COUNT(*) as total_ratings,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM ratings
      WHERE doctor_id = $1
      `,
      [doctorId]
    );

    res.json({
      ratings: result.rows,
      statistics: stats.rows[0],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(stats.rows[0].total_ratings)
      }
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
