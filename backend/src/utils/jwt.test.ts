import test from 'node:test';
import assert from 'node:assert/strict';
import { generateToken, verifyToken } from './jwt.js';

test('JWT Utility Tests', async (t) => {
  const payload = {
    userId: 'usr_test_123',
    email: 'tester@fairway.co.in',
    role: 'admin',
  };

  await t.test('should generate a valid JWT token string', () => {
    const token = generateToken(payload);
    assert.ok(token);
    assert.equal(typeof token, 'string');
    assert.equal(token.split('.').length, 3);
  });

  await t.test('should verify a valid token and return identical payload', () => {
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    assert.equal(decoded.userId, payload.userId);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.role, payload.role);
  });

  await t.test('should throw an error when verifying an invalid token', () => {
    assert.throws(() => {
      verifyToken('invalid.malformed.token');
    });
  });
});
