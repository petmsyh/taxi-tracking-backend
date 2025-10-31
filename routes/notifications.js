const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticate } = require('../middleware/auth');

// Get user's notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { is_read, notification_type, page = 1, limit = 50 } = req.query;

    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    
    const params = [userId];
    let paramIndex = 2;

    // Filter by read status
    if (is_read !== undefined) {
      query += ` AND is_read = $${paramIndex}`;
      params.push(is_read === 'true');
      paramIndex++;
    }

    // Filter by notification type
    if (notification_type) {
      query += ` AND notification_type = $${paramIndex}`;
      params.push(notification_type);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get unread count
    const unreadResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1';
    const countParams = [userId];
    let countIndex = 2;

    if (is_read !== undefined) {
      countQuery += ` AND is_read = $${countIndex}`;
      countParams.push(is_read === 'true');
      countIndex++;
    }

    if (notification_type) {
      countQuery += ` AND notification_type = $${countIndex}`;
      countParams.push(notification_type);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadResult.rows[0].count),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Verify notification belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Mark as read
    const result = await pool.query(
      'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete a notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Verify notification belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Clear all read notifications (use POST for action-based endpoint)
router.post('/clear-read', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      'DELETE FROM notifications WHERE user_id = $1 AND is_read = true RETURNING id',
      [userId]
    );

    res.json({ 
      message: 'Read notifications cleared',
      deleted_count: result.rows.length
    });
  } catch (error) {
    console.error('Error clearing read notifications:', error);
    res.status(500).json({ error: 'Failed to clear read notifications' });
  }
});

// Get notification statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
        notification_type,
        COUNT(*) as total,
        SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread
       FROM notifications
       WHERE user_id = $1
       GROUP BY notification_type`,
      [userId]
    );

    const totalResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread
       FROM notifications
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      total: parseInt(totalResult.rows[0]?.total || 0),
      unread: parseInt(totalResult.rows[0]?.unread || 0),
      by_type: result.rows
    });
  } catch (error) {
    console.error('Error fetching notification statistics:', error);
    res.status(500).json({ error: 'Failed to fetch notification statistics' });
  }
});

module.exports = router;
