process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert');
const { hashPassword, verifyPassword } = require('../src/utils/auth');

test('Auth utility hashes and verifies passwords securely', () => {
    const raw = 'mySecretPass123';
    const hash = hashPassword(raw);
    assert.ok(hash.includes(':'), 'Hash must contain salt separator');
    assert.strictEqual(verifyPassword(raw, hash), true, 'Valid password must verify');
    assert.strictEqual(verifyPassword('wrongPass', hash), false, 'Wrong password must be rejected');
});

test('Auth utility handles empty or null passwords gracefully', () => {
    const defaultHash = hashPassword();
    assert.strictEqual(verifyPassword('password123', defaultHash), true, 'Default password is password123');
    assert.strictEqual(verifyPassword('', defaultHash), false);
    assert.strictEqual(verifyPassword(null, defaultHash), false);
});
