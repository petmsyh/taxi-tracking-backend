const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateInput } = require('../middleware/validator');
const validator = require('validator');

// Create a new appointment
router.post('/', authenticate, validateInput, async (req, res) => {
  try {
    const { doctor_id, appointment_date, duration_minutes, appointment_type, reason } = req.body;
    const patient_id = req.userId;

    // Validate required fields
    if (!doctor_id || !appointment_date) {
      return res.status(400).json({ error: 'Doctor ID and appointment date are required' });
    }

    // Validate appointment_date is a valid date
    if (!validator.isISO8601(appointment_date)) {
      return res.status(400).json({ error: 'Invalid appointment date format' });
    }

    // Check if appointment date is in the future
    const apptDate = new Date(appointment_date);
    if (apptDate <= new Date()) {
      return res.status(400).json({ error: 'Appointment date must be in the future' });
    }

    // Verify doctor exists
    const doctorCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [doctor_id, 'doctor']
    );

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Check for scheduling conflicts (doctor already has appointment at that time)
    const conflictCheck = await pool.query(
      `SELECT id FROM appointments 
       WHERE doctor_id = $1 
       AND status NOT IN ('cancelled', 'completed', 'no_show')
       AND appointment_date BETWEEN $2 - INTERVAL '1 hour' AND $2 + INTERVAL '1 hour'`,
      [doctor_id, appointment_date]
    );

    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Doctor is not available at this time' });
    }

    // Create appointment
    const result = await pool.query(
      `INSERT INTO appointments 
       (patient_id, doctor_id, appointment_date, duration_minutes, appointment_type, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        patient_id,
        doctor_id,
        appointment_date,
        duration_minutes || 30,
        appointment_type || 'consultation',
        reason,
        'pending'
      ]
    );

    // Create notification for doctor
    await pool.query(
      `INSERT INTO notifications 
       (user_id, notification_type, title, message, related_entity_type, related_entity_id, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        doctor_id,
        'appointment',
        'New Appointment Request',
        `You have a new appointment request for ${new Date(appointment_date).toLocaleString()}`,
        'appointment',
        result.rows[0].id,
        'normal'
      ]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [patient_id, 'CREATE_APPOINTMENT', 'appointment', result.rows[0].id]
    );

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Get user's appointments (patient sees their appointments, doctor sees appointments with them)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const { status, from_date, to_date, page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        a.*,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.email as patient_email,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        d.email as doctor_email
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // Filter by user role
    if (userRole === 'patient') {
      query += ` AND a.patient_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    } else if (userRole === 'doctor') {
      query += ` AND a.doctor_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Filter by date range
    if (from_date) {
      query += ` AND a.appointment_date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      query += ` AND a.appointment_date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    query += ` ORDER BY a.appointment_date ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM appointments a
      WHERE 1=1
    `;
    const countParams = [];
    let countIndex = 1;

    if (userRole === 'patient') {
      countQuery += ` AND a.patient_id = $${countIndex}`;
      countParams.push(userId);
      countIndex++;
    } else if (userRole === 'doctor') {
      countQuery += ` AND a.doctor_id = $${countIndex}`;
      countParams.push(userId);
      countIndex++;
    }

    if (status) {
      countQuery += ` AND a.status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }

    if (from_date) {
      countQuery += ` AND a.appointment_date >= $${countIndex}`;
      countParams.push(from_date);
      countIndex++;
    }

    if (to_date) {
      countQuery += ` AND a.appointment_date <= $${countIndex}`;
      countParams.push(to_date);
      countIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      appointments: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get specific appointment details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
        a.*,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.email as patient_email,
        p.phone as patient_phone,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        d.email as doctor_email,
        doc.specialties,
        doc.consultation_fee
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
      LEFT JOIN doctors doc ON d.id = doc.user_id
      WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = result.rows[0];

    // Check if user has access to this appointment
    if (appointment.patient_id !== userId && appointment.doctor_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Update appointment status (confirm, complete, cancel)
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, cancellation_reason } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Fetch appointment
    const apptResult = await pool.query(
      'SELECT * FROM appointments WHERE id = $1',
      [id]
    );

    if (apptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = apptResult.rows[0];

    // Authorization checks
    if (appointment.patient_id !== userId && appointment.doctor_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only doctors can confirm or mark as no_show
    if ((status === 'confirmed' || status === 'no_show') && userRole !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can confirm appointments or mark as no-show' });
    }

    // Only doctors can complete appointments
    if (status === 'completed' && userRole !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can mark appointments as completed' });
    }

    // Update appointment
    const updateQuery = status === 'cancelled'
      ? 'UPDATE appointments SET status = $1, notes = $2, cancelled_by = $3, cancellation_reason = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *'
      : 'UPDATE appointments SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *';

    const updateParams = status === 'cancelled'
      ? [status, notes, userId, cancellation_reason, id]
      : [status, notes, id];

    const result = await pool.query(updateQuery, updateParams);

    // Create notification for the other party
    const notifyUserId = appointment.patient_id === userId ? appointment.doctor_id : appointment.patient_id;
    const notifyMessage = status === 'confirmed' 
      ? 'Your appointment has been confirmed'
      : status === 'cancelled'
      ? 'Your appointment has been cancelled'
      : status === 'completed'
      ? 'Your appointment has been completed'
      : `Appointment status updated to ${status}`;

    await pool.query(
      `INSERT INTO notifications 
       (user_id, notification_type, title, message, related_entity_type, related_entity_id, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        notifyUserId,
        'appointment',
        'Appointment Update',
        notifyMessage,
        'appointment',
        id,
        status === 'cancelled' ? 'high' : 'normal'
      ]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [userId, `UPDATE_APPOINTMENT_STATUS_${status.toUpperCase()}`, 'appointment', id]
    );

    res.json({
      message: 'Appointment status updated successfully',
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
});

// Update appointment details (reschedule)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date, duration_minutes, reason, notes } = req.body;
    const userId = req.userId;

    // Fetch appointment
    const apptResult = await pool.query(
      'SELECT * FROM appointments WHERE id = $1',
      [id]
    );

    if (apptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = apptResult.rows[0];

    // Check access
    if (appointment.patient_id !== userId && appointment.doctor_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Cannot reschedule completed or cancelled appointments
    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Cannot modify completed or cancelled appointments' });
    }

    // If rescheduling, validate new date
    if (appointment_date) {
      if (!validator.isISO8601(appointment_date)) {
        return res.status(400).json({ error: 'Invalid appointment date format' });
      }

      const newDate = new Date(appointment_date);
      if (newDate <= new Date()) {
        return res.status(400).json({ error: 'Appointment date must be in the future' });
      }

      // Check for conflicts
      const conflictCheck = await pool.query(
        `SELECT id FROM appointments 
         WHERE doctor_id = $1 
         AND id != $2
         AND status NOT IN ('cancelled', 'completed', 'no_show')
         AND appointment_date BETWEEN $3 - INTERVAL '1 hour' AND $3 + INTERVAL '1 hour'`,
        [appointment.doctor_id, id, appointment_date]
      );

      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Doctor is not available at this time' });
      }
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (appointment_date) {
      updates.push(`appointment_date = $${paramIndex}`);
      params.push(appointment_date);
      paramIndex++;
    }

    if (duration_minutes) {
      updates.push(`duration_minutes = $${paramIndex}`);
      params.push(duration_minutes);
      paramIndex++;
    }

    if (reason) {
      updates.push(`reason = $${paramIndex}`);
      params.push(reason);
      paramIndex++;
    }

    if (notes) {
      updates.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    // Notify the other party about the update
    const notifyUserId = appointment.patient_id === userId ? appointment.doctor_id : appointment.patient_id;
    await pool.query(
      `INSERT INTO notifications 
       (user_id, notification_type, title, message, related_entity_type, related_entity_id, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        notifyUserId,
        'appointment',
        'Appointment Updated',
        appointment_date ? 'Your appointment has been rescheduled' : 'Your appointment details have been updated',
        'appointment',
        id,
        'normal'
      ]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [userId, 'UPDATE_APPOINTMENT', 'appointment', id]
    );

    res.json({
      message: 'Appointment updated successfully',
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Delete appointment (only if pending and by patient)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const apptResult = await pool.query(
      'SELECT * FROM appointments WHERE id = $1',
      [id]
    );

    if (apptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = apptResult.rows[0];

    // Only patient can delete their own pending appointments
    if (appointment.patient_id !== userId) {
      return res.status(403).json({ error: 'Only the patient can delete their appointment' });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending appointments can be deleted. Use cancel instead.' });
    }

    await pool.query('DELETE FROM appointments WHERE id = $1', [id]);

    // Notify doctor
    await pool.query(
      `INSERT INTO notifications 
       (user_id, notification_type, title, message, related_entity_type, related_entity_id, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        appointment.doctor_id,
        'appointment',
        'Appointment Deleted',
        'A patient has deleted their appointment request',
        'appointment',
        id,
        'low'
      ]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [userId, 'DELETE_APPOINTMENT', 'appointment', id]
    );

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

module.exports = router;
