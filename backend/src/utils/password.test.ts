import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, comparePassword } from './password.js';

test('Password Utility Tests', async (t) => {
  await t.test('should hash a password and produce a non-empty string', async () => {
    const raw = 'SuperSecret123!';
    const hashed = await hashPassword(raw);
    assert.ok(hashed);
    assert.notEqual(hashed, raw);
    assert.ok(hashed.startsWith('$2'));
  });

  await t.test('should return true for matching password', async () => {
    const raw = 'MyPassword123';
    const hashed = await hashPassword(raw);
    const isValid = await comparePassword(raw, hashed);
    assert.equal(isValid, true);
  });

  await t.test('should return false for incorrect password', async () => {
    const raw = 'CorrectPassword';
    const hashed = await hashPassword(raw);
    const isValid = await comparePassword('WrongPassword', hashed);
    assert.equal(isValid, false);
  });

  await t.test('should return false on empty inputs', async () => {
    const isValid = await comparePassword('', '');
    assert.equal(isValid, false);
  });
});
