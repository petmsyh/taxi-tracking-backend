const request = require('supertest');
const { app } = require('../server');

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new patient', async () => {
      const userData = {
        email: `test${Date.now()}@example.com`,
        password: 'Test1234!',
        first_name: 'Test',
        last_name: 'User',
        role: 'patient',
        phone: '+251912345678'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.role).toBe('patient');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Test1234!',
        first_name: 'Test',
        last_name: 'User',
        role: 'patient'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });

    it('should reject registration with short password', async () => {
      const userData = {
        email: `test${Date.now()}@example.com`,
        password: '123',
        first_name: 'Test',
        last_name: 'User',
        role: 'patient'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: `logintest${Date.now()}@example.com`,
      password: 'Test1234!',
      first_name: 'Login',
      last_name: 'Test',
      role: 'patient'
    };

    beforeAll(async () => {
      // Create test user
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject login with invalid password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should reject login with non-existent email', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test1234!'
        })
        .expect(401);
    });
  });
});
