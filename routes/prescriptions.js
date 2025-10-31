const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateInput } = require('../middleware/validator');

// Create a new prescription (doctor only)
router.post('/', authenticate, requireRole(['doctor']), validateInput, async (req, res) => {
  try {
    const { patient_id, chat_id, appointment_id, diagnosis, medications, additional_instructions, valid_until } = req.body;
    const doctor_id = req.userId;

    // Validate required fields
    if (!patient_id || !diagnosis || !medications) {
      return res.status(400).json({ error: 'Patient ID, diagnosis, and medications are required' });
    }

    // Validate medications is an array
    if (!Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ error: 'Medications must be a non-empty array' });
    }

    // Validate each medication has required fields
    for (const med of medications) {
      if (!med.name || !med.dosage || !med.frequency || !med.duration) {
        return res.status(400).json({ 
          error: 'Each medication must have name, dosage, frequency, and duration' 
        });
      }
    }

    // Verify patient exists
    const patientCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [patient_id, 'patient']
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // If chat_id provided, verify the chat exists and involves both doctor and patient
    if (chat_id) {
      const chatCheck = await pool.query(
        'SELECT id FROM chats WHERE id = $1 AND patient_id = $2 AND doctor_id = $3',
        [chat_id, patient_id, doctor_id]
      );

      if (chatCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid chat ID or not associated with this doctor-patient relationship' });
      }
    }

    // If appointment_id provided, verify it exists
    if (appointment_id) {
      const apptCheck = await pool.query(
        'SELECT id FROM appointments WHERE id = $1 AND patient_id = $2 AND doctor_id = $3',
        [appointment_id, patient_id, doctor_id]
      );

      if (apptCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid appointment ID or not associated with this doctor-patient relationship' });
      }
    }

    // Create prescription
    const result = await pool.query(
      `INSERT INTO prescriptions 
       (patient_id, doctor_id, chat_id, appointment_id, diagnosis, medications, additional_instructions, valid_until, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        patient_id,
        doctor_id,
        chat_id,
        appointment_id,
        diagnosis,
        JSON.stringify(medications),
        additional_instructions,
        valid_until,
        'active'
      ]
    );

    // Create notification for patient
    await pool.query(
      `INSERT INTO notifications 
       (user_id, notification_type, title, message, related_entity_type, related_entity_id, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        patient_id,
        'prescription',
        'New Prescription',
        'You have received a new prescription from your doctor',
        'prescription',
        result.rows[0].id,
        'high'
      ]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [doctor_id, 'CREATE_PRESCRIPTION', 'prescription', result.rows[0].id]
    );

    res.status(201).json({
      message: 'Prescription created successfully',
      prescription: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

// Get prescriptions (patients see their prescriptions, doctors see prescriptions they wrote)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const { status, page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        p.*,
        pat.first_name as patient_first_name,
        pat.last_name as patient_last_name,
        pat.email as patient_email,
        doc.first_name as doctor_first_name,
        doc.last_name as doctor_last_name,
        doc.email as doctor_email,
        d.specialties as doctor_specialties
      FROM prescriptions p
      JOIN users pat ON p.patient_id = pat.id
      JOIN users doc ON p.doctor_id = doc.id
      LEFT JOIN doctors d ON doc.id = d.user_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // Filter by user role
    if (userRole === 'patient') {
      query += ` AND p.patient_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    } else if (userRole === 'doctor') {
      query += ` AND p.doctor_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM prescriptions p WHERE 1=1`;
    const countParams = [];
    let countIndex = 1;

    if (userRole === 'patient') {
      countQuery += ` AND p.patient_id = $${countIndex}`;
      countParams.push(userId);
      countIndex++;
    } else if (userRole === 'doctor') {
      countQuery += ` AND p.doctor_id = $${countIndex}`;
      countParams.push(userId);
      countIndex++;
    }

    if (status) {
      countQuery += ` AND p.status = $${countIndex}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      prescriptions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});

// Get specific prescription details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
        p.*,
        pat.first_name as patient_first_name,
        pat.last_name as patient_last_name,
        pat.email as patient_email,
        pat.phone as patient_phone,
        doc.first_name as doctor_first_name,
        doc.last_name as doctor_last_name,
        doc.email as doctor_email,
        d.specialties as doctor_specialties,
        d.license_number as doctor_license_number
      FROM prescriptions p
      JOIN users pat ON p.patient_id = pat.id
      JOIN users doc ON p.doctor_id = doc.id
      LEFT JOIN doctors d ON doc.id = d.user_id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const prescription = result.rows[0];

    // Check if user has access to this prescription
    if (prescription.patient_id !== userId && prescription.doctor_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ prescription });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
});

// Update prescription status (doctor only)
router.put('/:id/status', authenticate, requireRole(['doctor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const doctor_id = req.userId;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['active', 'expired', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Fetch prescription
    const prescResult = await pool.query(
      'SELECT * FROM prescriptions WHERE id = $1',
      [id]
    );

    if (prescResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const prescription = prescResult.rows[0];

    // Only the prescribing doctor can update the status
    if (prescription.doctor_id !== doctor_id) {
      return res.status(403).json({ error: 'Only the prescribing doctor can update the status' });
    }

    // Update prescription status
    const result = await pool.query(
      'UPDATE prescriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    // Create notification for patient if cancelled
    if (status === 'cancelled') {
      await pool.query(
        `INSERT INTO notifications 
         (user_id, notification_type, title, message, related_entity_type, related_entity_id, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          prescription.patient_id,
          'prescription',
          'Prescription Cancelled',
          'One of your prescriptions has been cancelled by your doctor',
          'prescription',
          id,
          'high'
        ]
      );
    }

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [doctor_id, `UPDATE_PRESCRIPTION_STATUS_${status.toUpperCase()}`, 'prescription', id]
    );

    res.json({
      message: 'Prescription status updated successfully',
      prescription: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating prescription status:', error);
    res.status(500).json({ error: 'Failed to update prescription status' });
  }
});

// Get patient's prescription history with a specific doctor
router.get('/history/:patientId', authenticate, requireRole(['doctor']), async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctor_id = req.userId;

    const result = await pool.query(
      `SELECT p.* FROM prescriptions p
       WHERE p.patient_id = $1 AND p.doctor_id = $2
       ORDER BY p.created_at DESC`,
      [patientId, doctor_id]
    );

    res.json({
      prescriptions: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching prescription history:', error);
    res.status(500).json({ error: 'Failed to fetch prescription history' });
  }
});

module.exports = router;
