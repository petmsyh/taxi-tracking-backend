const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database');
const { validateInput } = require('../middleware/validator');
const { authLimiter } = require('../middleware/rateLimiter');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register',
  authLimiter,
  validateInput({
    email: { required: true, email: true },
    password: { required: true, minLength: 8 },
    first_name: { required: true, minLength: 2 },
    last_name: { required: true, minLength: 2 },
    role: { required: true, enum: ['patient', 'doctor', 'student'] },
    phone: { required: false }
  }),
  async (req, res) => {
    const { email, password, first_name, last_name, role, phone } = req.body;

    try {
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Create user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, phone) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, email, role, first_name, last_name, phone, verified, created_at`,
        [email, password_hash, role, first_name, last_name, phone]
      );

      const user = result.rows[0];

      // If registering as doctor, create doctor profile
      if (role === 'doctor') {
        await pool.query(
          `INSERT INTO doctors (user_id, specialties, qualifications) 
           VALUES ($1, $2, $3)`,
          [user.id, [], []]
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          verified: user.verified
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Server error during registration' });
    }
  }
);

// Login
router.post('/login',
  authLimiter,
  validateInput({
    email: { required: true, email: true },
    password: { required: true }
  }),
  async (req, res) => {
    const { email, password } = req.body;

    try {
      // Find user
      const result = await pool.query(
        'SELECT id, email, password_hash, role, first_name, last_name, verified FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          verified: user.verified
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error during login' });
    }
  }
);

module.exports = router;
