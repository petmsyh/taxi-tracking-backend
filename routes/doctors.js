const express = require('express');
const pool = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all doctors with optional filters
router.get('/', async (req, res) => {
  const { specialty, available, search, lat, lng, radius = 50 } = req.query;

  try {
    let query = `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.phone,
        d.specialties, d.qualifications, d.bio, d.consultation_fee,
        d.location_lat, d.location_lng, d.location_address,
        d.profile_photo_url, d.is_available, d.years_of_experience,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as rating_count
      FROM users u
      JOIN doctors d ON u.id = d.user_id
      LEFT JOIN ratings r ON u.id = r.doctor_id
      WHERE u.role = 'doctor'
    `;

    const params = [];
    let paramIndex = 1;

    // Filter by specialty
    if (specialty) {
      query += ` AND $${paramIndex} = ANY(d.specialties)`;
      params.push(specialty);
      paramIndex++;
    }

    // Filter by availability
    if (available === 'true') {
      query += ` AND d.is_available = true`;
    }

    // Search by name
    if (search) {
      query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY u.id, d.id`;

    // Filter by location (if lat/lng provided)
    if (lat && lng) {
      query = `
        SELECT *, 
        (6371 * acos(cos(radians($${paramIndex})) * cos(radians(location_lat)) 
        * cos(radians(location_lng) - radians($${paramIndex + 1})) + sin(radians($${paramIndex})) 
        * sin(radians(location_lat)))) AS distance
        FROM (${query}) AS doctors_with_ratings
        WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL
        HAVING distance < $${paramIndex + 2}
        ORDER BY distance
      `;
      params.push(parseFloat(lat), parseFloat(lng), parseFloat(radius));
    } else {
      query += ` ORDER BY average_rating DESC, rating_count DESC`;
    }

    const result = await pool.query(query, params);

    res.json({
      doctors: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific doctor profile
router.get('/:doctorId', async (req, res) => {
  const { doctorId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.phone, u.verified,
        d.specialties, d.qualifications, d.bio, d.consultation_fee,
        d.location_lat, d.location_lng, d.location_address,
        d.profile_photo_url, d.is_available, d.availability_schedule,
        d.years_of_experience, d.license_number,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as rating_count
      FROM users u
      JOIN doctors d ON u.id = d.user_id
      LEFT JOIN ratings r ON u.id = r.doctor_id
      WHERE u.id = $1 AND u.role = 'doctor'
      GROUP BY u.id, d.id
      `,
      [doctorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Get recent reviews
    const reviews = await pool.query(
      `
      SELECT r.id, r.rating, r.review_text, r.created_at,
             u.first_name, u.last_name
      FROM ratings r
      JOIN users u ON r.patient_id = u.id
      WHERE r.doctor_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
      `,
      [doctorId]
    );

    res.json({
      doctor: result.rows[0],
      recent_reviews: reviews.rows
    });
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update doctor profile (doctor only)
router.put('/profile',
  authenticate,
  authorize('doctor'),
  async (req, res) => {
    const doctorId = req.user.id;
    const {
      specialties,
      qualifications,
      bio,
      consultation_fee,
      location_lat,
      location_lng,
      location_address,
      profile_photo_url,
      is_available,
      availability_schedule,
      years_of_experience
    } = req.body;

    try {
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      if (specialties !== undefined) {
        updateFields.push(`specialties = $${paramIndex}`);
        params.push(specialties);
        paramIndex++;
      }
      if (qualifications !== undefined) {
        updateFields.push(`qualifications = $${paramIndex}`);
        params.push(qualifications);
        paramIndex++;
      }
      if (bio !== undefined) {
        updateFields.push(`bio = $${paramIndex}`);
        params.push(bio);
        paramIndex++;
      }
      if (consultation_fee !== undefined) {
        updateFields.push(`consultation_fee = $${paramIndex}`);
        params.push(consultation_fee);
        paramIndex++;
      }
      if (location_lat !== undefined && location_lng !== undefined) {
        updateFields.push(`location_lat = $${paramIndex}, location_lng = $${paramIndex + 1}`);
        params.push(location_lat, location_lng);
        paramIndex += 2;
      }
      if (location_address !== undefined) {
        updateFields.push(`location_address = $${paramIndex}`);
        params.push(location_address);
        paramIndex++;
      }
      if (profile_photo_url !== undefined) {
        updateFields.push(`profile_photo_url = $${paramIndex}`);
        params.push(profile_photo_url);
        paramIndex++;
      }
      if (is_available !== undefined) {
        updateFields.push(`is_available = $${paramIndex}`);
        params.push(is_available);
        paramIndex++;
      }
      if (availability_schedule !== undefined) {
        updateFields.push(`availability_schedule = $${paramIndex}`);
        params.push(JSON.stringify(availability_schedule));
        paramIndex++;
      }
      if (years_of_experience !== undefined) {
        updateFields.push(`years_of_experience = $${paramIndex}`);
        params.push(years_of_experience);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(doctorId);

      const query = `
        UPDATE doctors 
        SET ${updateFields.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, params);

      res.json({
        message: 'Profile updated successfully',
        doctor: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating doctor profile:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
