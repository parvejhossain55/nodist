import request from 'supertest';
import { createApp } from 'app';

const API = '/api/v1';
const app = createApp();

describe('health endpoints', () => {
  it('GET /health/live reports the service is up', async () => {
    const res = await request(app).get(`${API}/health/live`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('up');
  });

  it('GET /health/ready reports mongo/redis state', async () => {
    const res = await request(app).get(`${API}/health/ready`);

    // ioredis-mock never reports `status === 'ready'`, so the readiness probe
    // deterministically exercises the "not ready" path: mongo up, redis down.
    expect(res.status).toBe(503);
    expect(res.body.data.mongo).toBe('up');
    expect(res.body.data.redis).toBe('down');
  });
});

describe('error handling', () => {
  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get(`${API}/does-not-exist`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not found');
  });
});
