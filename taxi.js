const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get nearby taxis
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius = 5 } = req.query;
  
  try {
    const result = await pool.query(`
      SELECT t.id, t.vehicle_type, t.plate_number, t.current_lat, t.current_lng, t.is_available,
             u.first_name, u.last_name,
             COALESCE(AVG(dr.rating), 4.5) as rating,
             (6371 * acos(cos(radians($1)) * cos(radians(t.current_lat)) 
             * cos(radians(t.current_lng) - radians($2)) + sin(radians($1)) 
             * sin(radians(t.current_lat)))) AS distance
      FROM taxis t
      JOIN users u ON t.driver_id = u.id
      LEFT JOIN driver_ratings dr ON u.id = dr.driver_id
      WHERE t.current_lat IS NOT NULL 
      AND t.current_lng IS NOT NULL
      HAVING distance < $3
      GROUP BY t.id, u.first_name, u.last_name
      ORDER BY distance
    `, [lat, lng, radius]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update taxi location
router.put('/:taxiId/location', async (req, res) => {
  const { taxiId } = req.params;
  const { lat, lng } = req.body;
  
  try {
    await pool.query(
      'UPDATE taxis SET current_lat = $1, current_lng = $2, last_location_update = CURRENT_TIMESTAMP WHERE id = $3',
      [lat, lng, taxiId]
    );

    await pool.query(
      'INSERT INTO taxi_locations (taxi_id, lat, lng) VALUES ($1, $2, $3)',
      [taxiId, lat, lng]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
