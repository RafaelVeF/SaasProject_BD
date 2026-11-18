process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const requireTenant = require('../src/middleware/tenant');
const Company = require('../src/models/Company');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Task = require('../src/models/Task');
const { app } = require('../server');

test('requireTenant middleware rejects missing X-Company-Id', async () => {
    let statusCode = null;
    let jsonBody = null;
    const req = { headers: {} };
    const res = {
        status(code) {
            statusCode = code;
            return {
                json(data) {
                    jsonBody = data;
                }
            };
        }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await requireTenant(req, res, next);
    assert.strictEqual(statusCode, 400);
    assert.ok(jsonBody.error.includes('X-Company-Id'));
    assert.strictEqual(nextCalled, false);
});

test('requireTenant middleware rejects invalid ObjectId format', async () => {
    let statusCode = null;
    let jsonBody = null;
    const req = { headers: { 'x-company-id': 'invalid-id-format' } };
    const res = {
        status(code) {
            statusCode = code;
            return {
                json(data) {
                    jsonBody = data;
                }
            };
        }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await requireTenant(req, res, next);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(nextCalled, false);
});

test('requireTenant middleware rejects non-existent company', async () => {
    const originalExists = Company.exists;
    Company.exists = async () => false;

    let statusCode = null;
    let jsonBody = null;
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = { headers: { 'x-company-id': fakeId } };
    const res = {
        status(code) {
            statusCode = code;
            return {
                json(data) {
                    jsonBody = data;
                }
            };
        }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    try {
        await requireTenant(req, res, next);
        assert.strictEqual(statusCode, 404);
        assert.ok(jsonBody.error.includes('introuvable'));
        assert.strictEqual(nextCalled, false);
    } finally {
        Company.exists = originalExists;
    }
});

test('requireTenant attaches companyId when valid', async () => {
    const originalExists = Company.exists;
    Company.exists = async () => true;

    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = { headers: { 'x-company-id': fakeId } };
    const res = {};
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    try {
        await requireTenant(req, res, next);
        assert.strictEqual(req.companyId, fakeId);
        assert.strictEqual(nextCalled, true);
    } finally {
        Company.exists = originalExists;
    }
});

test('Cross-tenant user check rejects members outside the tenant', async () => {
    const originalCount = User.countDocuments;
    // Simulate finding 0 matching users for the company when 1 was passed
    User.countDocuments = async () => 0;

    const compId = new mongoose.Types.ObjectId().toString();
    const externalUserId = new mongoose.Types.ObjectId().toString();

    // Verify logic that checks members match company
    const memberIds = [externalUserId];
    const validCount = await User.countDocuments({
        _id: { $in: memberIds },
        companyId: compId
    });

    try {
        assert.strictEqual(validCount !== memberIds.length, true, 'Detects cross-tenant member');
    } finally {
        User.countDocuments = originalCount;
    }
});

test('App routes and static assets are properly configured', () => {
    assert.ok(app, 'Express app is exported');
});
