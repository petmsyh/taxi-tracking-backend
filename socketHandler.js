const pool = require('../config/database');

const connectedDrivers = new Map(); // Store driver socket connections
const connectedPassengers = new Map(); // Store passenger socket connections

function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Driver joins with taxi ID
    socket.on('driver_join', async (data) => {
      const { taxiId, driverId } = data;
      connectedDrivers.set(taxiId, { socketId: socket.id, driverId });
      socket.join(`taxi_${taxiId}`);
      console.log(`Driver ${driverId} joined with taxi ${taxiId}`);
    });

    // Passenger joins with user ID
    socket.on('passenger_join', (data) => {
      const { passengerId } = data;
      connectedPassengers.set(passengerId, socket.id);
      socket.join(`passenger_${passengerId}`);
      console.log(`Passenger ${passengerId} joined`);
    });

    // Real-time location updates from drivers
    socket.on('location_update', async (data) => {
      const { taxiId, lat, lng, timestamp } = data;
      
      try {
        // Update taxi location in database
        await pool.query(
          'UPDATE taxis SET current_lat = $1, current_lng = $2, last_location_update = $3 WHERE id = $4',
          [lat, lng, new Date(timestamp), taxiId]
        );

        // Store in location history
        await pool.query(
          'INSERT INTO taxi_locations (taxi_id, lat, lng, timestamp) VALUES ($1, $2, $3, $4)',
          [taxiId, lat, lng, new Date(timestamp)]
        );

        // Broadcast location to nearby passengers
        socket.broadcast.emit('taxi_location_update', {
          taxiId,
          lat,
          lng,
          timestamp
        });

        console.log(`Location updated for taxi ${taxiId}: ${lat}, ${lng}`);
      } catch (error) {
        console.error('Error updating location:', error);
      }
    });

    // Booking request from passenger
    socket.on('booking_request', async (data) => {
      const { passengerId, pickupLat, pickupLng, destinationLat, destinationLng } = data;
      
      try {
        // Find nearby available taxis (within 5km radius)
        const nearbyTaxis = await pool.query(`
          SELECT t.id, t.driver_id, t.vehicle_type, t.plate_number, t.current_lat, t.current_lng,
                 u.first_name, u.last_name,
                 (6371 * acos(cos(radians($1)) * cos(radians(t.current_lat)) 
                 * cos(radians(t.current_lng) - radians($2)) + sin(radians($1)) 
                 * sin(radians(t.current_lat)))) AS distance
          FROM taxis t
          JOIN users u ON t.driver_id = u.id
          WHERE t.is_available = true 
          AND t.current_lat IS NOT NULL 
          AND t.current_lng IS NOT NULL
          HAVING distance < 5
          ORDER BY distance
          LIMIT 10
        `, [pickupLat, pickupLng]);

        // Send booking request to nearby drivers
        nearbyTaxis.rows.forEach(taxi => {
          const driverConnection = connectedDrivers.get(taxi.id);
          if (driverConnection) {
            io.to(driverConnection.socketId).emit('booking_request', {
              passengerId,
              pickupLat,
              pickupLng,
              destinationLat,
              destinationLng,
              distance: taxi.distance
            });
          }
        });

        // Notify passenger about request sent
        socket.emit('booking_request_sent', {
          nearbyTaxisCount: nearbyTaxis.rows.length
        });

      } catch (error) {
        console.error('Error processing booking request:', error);
        socket.emit('booking_error', { message: 'Failed to process booking request' });
      }
    });

    // Driver accepts booking
    socket.on('accept_booking', async (data) => {
      const { taxiId, passengerId, estimatedArrival } = data;
      
      try {
        // Create booking record
        const booking = await pool.query(
          'INSERT INTO bookings (passenger_id, taxi_id, pickup_lat, pickup_lng, destination_lat, destination_lng, status, estimated_arrival) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
          [passengerId, taxiId, data.pickupLat, data.pickupLng, data.destinationLat, data.destinationLng, 'accepted', estimatedArrival]
        );

        // Update taxi availability
        await pool.query('UPDATE taxis SET is_available = false WHERE id = $1', [taxiId]);

        // Notify passenger
        const passengerSocketId = connectedPassengers.get(passengerId);
        if (passengerSocketId) {
          io.to(passengerSocketId).emit('booking_accepted', {
            bookingId: booking.rows[0].id,
            taxiId,
            estimatedArrival
          });
        }

        socket.emit('booking_accepted_confirmation', {
          bookingId: booking.rows[0].id
        });

      } catch (error) {
        console.error('Error accepting booking:', error);
        socket.emit('booking_error', { message: 'Failed to accept booking' });
      }
    });

    socket.on('disconnect', () => {
      // Remove from connected drivers/passengers
      for (const [taxiId, connection] of connectedDrivers.entries()) {
        if (connection.socketId === socket.id) {
          connectedDrivers.delete(taxiId);
          break;
        }
      }
      
      for (const [passengerId, socketId] of connectedPassengers.entries()) {
        if (socketId === socket.id) {
          connectedPassengers.delete(passengerId);
          break;
        }
      }
      
      console.log('User disconnected:', socket.id);
    });
  });
}

module.exports = { initializeSocket };
