const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const taxiRoutes = require('./routes/taxis');
const bookingRoutes = require('./routes/bookings');
const { initializeSocket } = require('./socket/socketHandler');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/taxis', taxiRoutes);
app.use('/api/bookings', bookingRoutes);

// Initialize Socket.IO
initializeSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
