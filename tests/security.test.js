process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Task = require('../src/models/Task');
const { app } = require('../server');

test('Schema security: companyId is immutable across child collections', () => {
    assert.strictEqual(User.schema.path('companyId').options.immutable, true, 'User.companyId must be immutable');
    assert.strictEqual(Project.schema.path('companyId').options.immutable, true, 'Project.companyId must be immutable');
    assert.strictEqual(Task.schema.path('companyId').options.immutable, true, 'Task.companyId must be immutable');
    assert.strictEqual(Task.schema.path('projectId').options.immutable, true, 'Task.projectId must be immutable');
});

test('API security: Invalid ObjectId params return HTTP 400 on DELETE', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
        const res = await fetch(`http://127.0.0.1:${port}/api/companies/invalid-id`, {
            method: 'DELETE'
        });
        assert.strictEqual(res.status, 400, 'Invalid company id parameter on DELETE must return 400 Bad Request');
    } finally {
        server.close();
    }
});
