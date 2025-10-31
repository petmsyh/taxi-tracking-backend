const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateInput } = require('../middleware/validator');
const path = require('path');
const fs = require('fs').promises;

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'medical_records');

// Helper function to ensure uploads directory exists
async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
}

// Upload a medical record (patients can upload their own records, doctors can upload for patients)
router.post('/', authenticate, validateInput, async (req, res) => {
  try {
    const { patient_id, record_type, title, description, appointment_id, file_name, file_size, file_type } = req.body;
    const uploaded_by = req.userId;
    const userRole = req.userRole;

    // Validate required fields
    if (!patient_id || !record_type || !title || !file_name) {
      return res.status(400).json({ error: 'Patient ID, record type, title, and file name are required' });
    }

    // Validate record type
    const validRecordTypes = ['lab_result', 'xray', 'scan', 'report', 'prescription', 'other'];
    if (!validRecordTypes.includes(record_type)) {
      return res.status(400).json({ error: 'Invalid record type' });
    }

    // Authorization check: patients can only upload their own records, doctors can upload for any patient
    if (userRole === 'patient' && patient_id !== uploaded_by) {
      return res.status(403).json({ error: 'Patients can only upload their own medical records' });
    }

    // Verify patient exists
    const patientCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [patient_id]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // If appointment_id provided, verify it exists and involves the patient
    if (appointment_id) {
      const apptCheck = await pool.query(
        'SELECT id FROM appointments WHERE id = $1 AND patient_id = $2',
        [appointment_id, patient_id]
      );

      if (apptCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid appointment ID for this patient' });
      }
    }

    // Ensure uploads directory exists
    await ensureUploadsDir();

    // Generate file path (in real implementation, file would be uploaded here)
    // For now, we're just tracking metadata. Actual file upload would use multer or similar
    const file_path = path.join('uploads', 'medical_records', `${Date.now()}_${file_name}`);

    // Create medical record entry
    const result = await pool.query(
      `INSERT INTO medical_records 
       (patient_id, uploaded_by, record_type, title, description, file_path, file_name, file_size, file_type, appointment_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        patient_id,
        uploaded_by,
        record_type,
        title,
        description,
        file_path,
        file_name,
        file_size,
        file_type,
        appointment_id
      ]
    );

    // Create notification for patient (if uploaded by doctor)
    if (userRole === 'doctor' && patient_id !== uploaded_by) {
      await pool.query(
        `INSERT INTO notifications 
         (user_id, notification_type, title, message, related_entity_type, related_entity_id, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          patient_id,
          'system',
          'New Medical Record',
          `Your doctor has uploaded a new ${record_type.replace('_', ' ')} to your medical records`,
          'medical_record',
          result.rows[0].id,
          'normal'
        ]
      );
    }

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [uploaded_by, 'UPLOAD_MEDICAL_RECORD', 'medical_record', result.rows[0].id]
    );

    res.status(201).json({
      message: 'Medical record uploaded successfully',
      record: result.rows[0],
      note: 'File upload endpoint: In production, use multipart/form-data with actual file upload'
    });
  } catch (error) {
    console.error('Error uploading medical record:', error);
    res.status(500).json({ error: 'Failed to upload medical record' });
  }
});

// Get medical records (patients see their own, doctors see records for their patients)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const { patient_id, record_type, page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        mr.*,
        u.first_name as uploader_first_name,
        u.last_name as uploader_last_name,
        u.role as uploader_role
      FROM medical_records mr
      LEFT JOIN users u ON mr.uploaded_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // Authorization: patients only see their own records
    if (userRole === 'patient') {
      query += ` AND mr.patient_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    } else if (userRole === 'doctor' && patient_id) {
      // Doctors can query specific patient's records (if they have treated them)
      // TODO: Add verification that doctor has treated this patient
      query += ` AND mr.patient_id = $${paramIndex}`;
      params.push(patient_id);
      paramIndex++;
    } else if (userRole === 'doctor') {
      // If no patient_id specified, return empty (doctors must specify patient)
      return res.json({
        records: [],
        pagination: { page: 1, limit, total: 0, pages: 0 }
      });
    }

    // Filter by record type
    if (record_type) {
      query += ` AND mr.record_type = $${paramIndex}`;
      params.push(record_type);
      paramIndex++;
    }

    query += ` ORDER BY mr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM medical_records mr WHERE 1=1';
    const countParams = [];
    let countIndex = 1;

    if (userRole === 'patient') {
      countQuery += ` AND mr.patient_id = $${countIndex}`;
      countParams.push(userId);
      countIndex++;
    } else if (userRole === 'doctor' && patient_id) {
      countQuery += ` AND mr.patient_id = $${countIndex}`;
      countParams.push(patient_id);
      countIndex++;
    }

    if (record_type) {
      countQuery += ` AND mr.record_type = $${countIndex}`;
      countParams.push(record_type);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      records: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
});

// Get specific medical record details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    const result = await pool.query(
      `SELECT 
        mr.*,
        u.first_name as uploader_first_name,
        u.last_name as uploader_last_name,
        u.role as uploader_role,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name
      FROM medical_records mr
      LEFT JOIN users u ON mr.uploaded_by = u.id
      LEFT JOIN users p ON mr.patient_id = p.id
      WHERE mr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    const record = result.rows[0];

    // Authorization check
    if (userRole === 'patient' && record.patient_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // TODO: For doctors, verify they have treated this patient before allowing access

    res.json({ record });
  } catch (error) {
    console.error('Error fetching medical record:', error);
    res.status(500).json({ error: 'Failed to fetch medical record' });
  }
});

// Update medical record metadata
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, record_type } = req.body;
    const userId = req.userId;

    // Fetch record
    const recordResult = await pool.query(
      'SELECT * FROM medical_records WHERE id = $1',
      [id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    const record = recordResult.rows[0];

    // Only the uploader can update the record
    if (record.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Only the uploader can update this record' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }

    if (description) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (record_type) {
      const validRecordTypes = ['lab_result', 'xray', 'scan', 'report', 'prescription', 'other'];
      if (!validRecordTypes.includes(record_type)) {
        return res.status(400).json({ error: 'Invalid record type' });
      }
      updates.push(`record_type = $${paramIndex}`);
      params.push(record_type);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE medical_records SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, params);

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [userId, 'UPDATE_MEDICAL_RECORD', 'medical_record', id]
    );

    res.json({
      message: 'Medical record updated successfully',
      record: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating medical record:', error);
    res.status(500).json({ error: 'Failed to update medical record' });
  }
});

// Delete medical record
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    const recordResult = await pool.query(
      'SELECT * FROM medical_records WHERE id = $1',
      [id]
    );

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    const record = recordResult.rows[0];

    // Authorization: only the uploader or the patient can delete the record
    if (record.uploaded_by !== userId && record.patient_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // TODO: In production, also delete the actual file from storage
    await pool.query('DELETE FROM medical_records WHERE id = $1', [id]);

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [userId, 'DELETE_MEDICAL_RECORD', 'medical_record', id]
    );

    res.json({ message: 'Medical record deleted successfully' });
  } catch (error) {
    console.error('Error deleting medical record:', error);
    res.status(500).json({ error: 'Failed to delete medical record' });
  }
});

// Get medical record statistics for a patient
router.get('/stats/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    // Authorization: patient can view their own stats, doctors can view patient stats
    if (userRole === 'patient' && patientId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // TODO: For doctors, verify they have treated this patient

    const result = await pool.query(
      `SELECT 
        record_type,
        COUNT(*) as count,
        SUM(file_size) as total_size
       FROM medical_records
       WHERE patient_id = $1
       GROUP BY record_type`,
      [patientId]
    );

    const totalResult = await pool.query(
      `SELECT 
        COUNT(*) as total_records,
        SUM(file_size) as total_size
       FROM medical_records
       WHERE patient_id = $1`,
      [patientId]
    );

    res.json({
      total_records: parseInt(totalResult.rows[0]?.total_records || 0),
      total_size_bytes: parseInt(totalResult.rows[0]?.total_size || 0),
      by_type: result.rows
    });
  } catch (error) {
    console.error('Error fetching medical record statistics:', error);
    res.status(500).json({ error: 'Failed to fetch medical record statistics' });
  }
});

module.exports = router;
