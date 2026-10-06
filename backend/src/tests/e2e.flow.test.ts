import request from 'supertest';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import app from '../app.js';

describe('Fairway AI CRM - End-to-End User Flow', () => {
  let authToken = '';
  let createdInquiryId = '';

  it('Step 1: User authenticates and obtains secure JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@fairway.co.in',
        password: 'fairway123',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.strictEqual(res.body.data.user.email, 'admin@fairway.co.in');

    authToken = res.body.data.token;
  });

  it('Step 2: User profile is fetched with authorized roles and permissions', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.user.id);
  });

  it('Step 3: User accesses Today Overview dashboard with tasks & stats', async () => {
    const res = await request(app)
      .get('/api/today')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data !== undefined);
  });

  it('Step 4: User creates a new Inquiry in the CRM pipeline', async () => {
    const newInquiryPayload = {
      companyName: 'Acme Logistics & Pharma E2E',
      contactName: 'Test Contact Lead',
      contactPhone: '+91 9988776655',
      contactEmail: 'e2e-contact@acme.com',
      requirement: 'Specialized chemical & cold storage facility 35,000 sq.ft',
      requiredAreaSqFt: 35000,
      location: 'Sanand Industrial Estate',
      targetCorridor: 'Sanand Industrial Corridor',
      industry: 'Pharmaceuticals',
      priority: 'High',
      stage: 'new',
      status: 'Active',
    };

    const res = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newInquiryPayload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.ok(res.body.data.inquiry_number);
    assert.strictEqual(res.body.data.company_name, 'Acme Logistics & Pharma E2E');
    assert.strictEqual(Number(res.body.data.required_area_sq_ft), 35000);

    createdInquiryId = res.body.data.id;
  });

  it('Step 5: User retrieves the newly created inquiry by ID from database', async () => {
    assert.ok(createdInquiryId);
    const res = await request(app)
      .get(`/api/inquiries/${createdInquiryId}`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.id, createdInquiryId);
    assert.strictEqual(res.body.data.companyName, 'Acme Logistics & Pharma E2E');
    assert.strictEqual(res.body.data.requiredAreaSqFt, 35000);
  });

  it('Step 6: User progresses inquiry stage in the deal pipeline', async () => {
    assert.ok(createdInquiryId);
    const res = await request(app)
      .put(`/api/inquiries/${createdInquiryId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        stage: 'proposal_sent',
        priority: 'High',
        nextAction: 'Client scheduled for facility walk-through.',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify stage update persisted in DB
    const verifyRes = await request(app)
      .get(`/api/inquiries/${createdInquiryId}`)
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(verifyRes.body.data.stage, 'proposal_sent');
  });

  it('Step 7: User queries available properties for matching warehouse options', async () => {
    const res = await request(app)
      .get('/api/properties')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  it('Step 8: User queries intelligence categories for AI prospecting', async () => {
    const res = await request(app)
      .get('/api/intelligence/companies/business-types')
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data?.items) || Array.isArray(res.body.data));
  });

  it('Step 9: Clean up test inquiry and verify hard deletion', async () => {
    assert.ok(createdInquiryId);
    const delRes = await request(app)
      .delete(`/api/inquiries/${createdInquiryId}`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);

    // Verify it is no longer found
    const getRes = await request(app)
      .get(`/api/inquiries/${createdInquiryId}`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(getRes.status, 404);
  });
});
