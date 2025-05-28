const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Create booking
router.post('/', async (req, res) => {
  const { passengerId, taxiId, pickupLat, pickupLng, destinationLat, destinationLng, pickupAddress, destinationAddress } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO bookings (passenger_id, taxi_id, pickup_lat, pickup_lng, destination_lat, destination_lng, pickup_address, destination_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [passengerId, taxiId, pickupLat, pickupLng, destinationLat, destinationLng, pickupAddress, destinationAddress]
    );

    // Update taxi availability
    await pool.query('UPDATE taxis SET is_available = false WHERE id = $1', [taxiId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get booking by ID
router.get('/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT b.*, 
             t.vehicle_type, t.plate_number, t.current_lat, t.current_lng,
             u.first_name as driver_first_name, u.last_name as driver_last_name, u.phone as driver_phone
      FROM bookings b
      JOIN taxis t ON b.taxi_id = t.id
      JOIN users u ON t.driver_id = u.id
      WHERE b.id = $1
    `, [bookingId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update booking status
router.put('/:bookingId/status', async (req, res) => {
  const { bookingId } = req.params;
  const { status } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, bookingId]
    );

    // If booking is completed or cancelled, make taxi available again
    if (status === 'completed' || status === 'cancelled') {
      const booking = result.rows[0];
      await pool.query('UPDATE taxis SET is_available = true WHERE id = $1', [booking.taxi_id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
