const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const Company = require('../src/models/Company');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Task = require('../src/models/Task');

test('Company schema validates required fields and plan enum', () => {
    const invalidCompany = new Company({});
    const err = invalidCompany.validateSync();
    assert.ok(err.errors.name, 'Name is required');

    const validCompany = new Company({ name: 'Acme', plan: 'ENTERPRISE' });
    assert.strictEqual(validCompany.name, 'Acme');
    assert.strictEqual(validCompany.plan, 'ENTERPRISE');

    const badPlanCompany = new Company({ name: 'Acme', plan: 'INVALID_PLAN' });
    const planErr = badPlanCompany.validateSync();
    assert.ok(planErr.errors.plan, 'Plan must be FREE, PRO, or ENTERPRISE');
});

test('User schema validates required fields and unique index on (companyId, email)', () => {
    const invalidUser = new User({});
    const err = invalidUser.validateSync();
    assert.ok(err.errors.companyId, 'companyId is required');
    assert.ok(err.errors.name, 'name is required');
    assert.ok(err.errors.email, 'email is required');

    const indexes = User.schema.indexes();
    const hasCompoundUnique = indexes.some(
        ([fields, options]) => fields.companyId === 1 && fields.email === 1 && options.unique === true
    );
    assert.ok(hasCompoundUnique, 'User must have compound unique index on { companyId: 1, email: 1 }');
});

test('Project schema validates required fields and shard index on (companyId, _id)', () => {
    const invalidProject = new Project({});
    const err = invalidProject.validateSync();
    assert.ok(err.errors.companyId, 'companyId is required');
    assert.ok(err.errors.name, 'name is required');

    const indexes = Project.schema.indexes();
    const hasShardIndex = indexes.some(
        ([fields]) => fields.companyId === 1 && fields._id === 1
    );
    assert.ok(hasShardIndex, 'Project must have compound index on { companyId: 1, _id: 1 }');
});

test('Task schema validates required fields, status enum, and Kanban index', () => {
    const invalidTask = new Task({});
    const err = invalidTask.validateSync();
    assert.ok(err.errors.companyId, 'companyId is required');
    assert.ok(err.errors.projectId, 'projectId is required');
    assert.ok(err.errors.title, 'title is required');

    const validTask = new Task({
        companyId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        title: 'Task 1',
        status: 'IN_PROGRESS',
        priority: 'HIGH'
    });
    assert.strictEqual(validTask.status, 'IN_PROGRESS');
    assert.strictEqual(validTask.priority, 'HIGH');

    const badStatusTask = new Task({
        companyId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        title: 'Task 1',
        status: 'INVALID_STATUS'
    });
    const statusErr = badStatusTask.validateSync();
    assert.ok(statusErr.errors.status, 'Status must be TODO, IN_PROGRESS, REVIEW, or DONE');

    const indexes = Task.schema.indexes();
    const hasKanbanIndex = indexes.some(
        ([fields]) => fields.companyId === 1 && fields.projectId === 1 && fields.status === 1
    );
    assert.ok(hasKanbanIndex, 'Task must have compound index on { companyId: 1, projectId: 1, status: 1 }');
});
