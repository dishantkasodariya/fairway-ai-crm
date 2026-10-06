import request from 'supertest';
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import app from '../app.js';
import { pool } from '../config/db.js';

describe('Fairway CRM API Integration Tests', () => {
  let authToken = '';

  after(async () => {
    try {
      await pool.end();
    } catch {}
  });

  describe('Health Checks', () => {
    it('GET /health returns 200 with DB status', async () => {
      const res = await request(app).get('/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'healthy');
      assert.ok(res.body.checks);
      assert.strictEqual(res.body.checks.database.status, 'healthy');
      assert.ok(typeof res.body.checks.database.latencyMs === 'number');
    });

    it('GET /api/health returns 200 with DB status', async () => {
      const res = await request(app).get('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'healthy');
    });
  });

  describe('404 and Error Boundaries', () => {
    it('returns 404 with structured JSON envelope on unknown route', async () => {
      const res = await request(app).get('/api/v1/non-existent-route-404');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error);
      assert.strictEqual(res.body.error.code, 'NOT_FOUND');
      assert.ok(res.body.requestId);
    });
  });

  describe('Authentication Endpoints', () => {
    it('POST /api/auth/login returns 400 when missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.message);
    });

    it('POST /api/auth/login returns 401 with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@fairway.co.in',
          password: 'definitely_wrong_password_123',
        });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.message);
    });

    it('POST /api/auth/login succeeds with valid credentials and issues JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@fairway.co.in',
          password: 'fairway123',
        });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.ok(res.body.data.user);
      assert.strictEqual(res.body.data.user.email, 'admin@fairway.co.in');

      // Store token for subsequent protected endpoint tests
      authToken = res.body.data.token;
    });

    it('GET /api/auth/me returns 401 without Bearer token', async () => {
      const res = await request(app).get('/api/auth/me');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('GET /api/auth/me returns 200 with user profile when authenticated', async () => {
      assert.ok(authToken, 'authToken should be set from prior login');
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.user);
      assert.strictEqual(res.body.data.user.email, 'admin@fairway.co.in');
    });
  });

  describe('Protected Business Resources', () => {
    it('GET /api/companies rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/companies');
      assert.strictEqual(res.status, 401);
    });

    it('GET /api/companies returns 200 and list of companies when authenticated', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it('GET /api/inquiries returns 200 and list of inquiries', async () => {
      const res = await request(app)
        .get('/api/inquiries')
        .set('Authorization', `Bearer ${authToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it('GET /api/properties returns 200 and properties list', async () => {
      const res = await request(app)
        .get('/api/properties')
        .set('Authorization', `Bearer ${authToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it('GET /api/leases returns 200 and leases list', async () => {
      const res = await request(app)
        .get('/api/leases')
        .set('Authorization', `Bearer ${authToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it('GET /api/today returns 200 with today dashboard overview', async () => {
      const res = await request(app)
        .get('/api/today')
        .set('Authorization', `Bearer ${authToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data);
    });
  });

  describe('Role Metadata & Extension Integration', () => {
    it('GET /api/roles/:roleKey/permissions returns permissions array', async () => {
      const res = await request(app).get('/api/roles/admin/permissions');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it('GET /api/ext/activate returns active status', async () => {
      const res = await request(app).get('/api/ext/activate');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.active, true);
    });
  });
});
