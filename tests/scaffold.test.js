const test = require('node:test');
const assert = require('node:assert');

test('Task 1: environment and dependencies installed', () => {
    assert.ok(require('express'));
    assert.ok(require('mongoose'));
    assert.ok(require('dotenv'));
    assert.ok(require('cors'));
});
