const express = require('express');
const pool = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/users',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    const { role, verified, page = 1, limit = 20 } = req.query;

    try {
      const offset = (page - 1) * limit;
      let query = 'SELECT id, email, role, first_name, last_name, phone, verified, created_at FROM users WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (role) {
        query += ` AND role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }

      if (verified !== undefined) {
        query += ` AND verified = $${paramIndex}`;
        params.push(verified === 'true');
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count
      const countResult = await pool.query('SELECT COUNT(*) FROM users');

      res.json({
        users: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count)
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Verify/unverify a doctor (admin only)
router.put('/doctors/:doctorId/verify',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    const { doctorId } = req.params;
    const { verified } = req.body;

    try {
      // Update user verification status
      const result = await pool.query(
        'UPDATE users SET verified = $1 WHERE id = $2 AND role = $\'doctor\' RETURNING *',
        [verified, doctorId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      // Log the action
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) 
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, 'DOCTOR_VERIFICATION', 'user', doctorId, JSON.stringify({ verified })]
      );

      res.json({
        message: `Doctor ${verified ? 'verified' : 'unverified'} successfully`,
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Error verifying doctor:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get system statistics (admin only)
router.get('/statistics',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      // User statistics
      const userStats = await pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'patient' THEN 1 END) as total_patients,
          COUNT(CASE WHEN role = 'doctor' THEN 1 END) as total_doctors,
          COUNT(CASE WHEN role = 'student' THEN 1 END) as total_students,
          COUNT(CASE WHEN verified = true THEN 1 END) as verified_users
        FROM users
      `);

      // Chat statistics
      const chatStats = await pool.query(`
        SELECT 
          COUNT(*) as total_chats,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_chats,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_chats
        FROM chats
      `);

      // Rating statistics
      const ratingStats = await pool.query(`
        SELECT 
          COUNT(*) as total_ratings,
          AVG(rating) as average_rating
        FROM ratings
      `);

      // Symptom check statistics
      const symptomStats = await pool.query(`
        SELECT COUNT(*) as total_symptom_checks
        FROM symptom_checks
      `);

      res.json({
        users: userStats.rows[0],
        chats: chatStats.rows[0],
        ratings: ratingStats.rows[0],
        symptom_checks: symptomStats.rows[0]
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get audit logs (admin only)
router.get('/audit-logs',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    const { page = 1, limit = 50, action, user_id } = req.query;

    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT 
          al.id, al.action, al.entity_type, al.entity_id, al.details, 
          al.ip_address, al.created_at,
          u.email as user_email, u.first_name, u.last_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (action) {
        query += ` AND al.action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
      }

      if (user_id) {
        query += ` AND al.user_id = $${paramIndex}`;
        params.push(user_id);
        paramIndex++;
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      res.json({
        logs: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
