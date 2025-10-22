const request = require('supertest');
const { app } = require('../server');

describe('Health Check', () => {
  it('should return 200 and status ok', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'Arba Minch University Medical Platform');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return 404 for unknown routes', async () => {
    await request(app)
      .get('/api/unknown-endpoint')
      .expect(404);
  });
});
