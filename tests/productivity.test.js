const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('search matches titles and tags without case or accents and combines filters', () => {
    assert.ok(fs.existsSync('public/task-tools.js'), 'Task tools must exist');
    const tools = require('../public/task-tools');
    const tasks = [
        { title: 'Énergie solaire', tags: ['API'], priority: 'HIGH', assigneeIds: [{ _id: 'u1' }] },
        { title: 'Autre', tags: ['énergie'], priority: 'LOW', assigneeIds: [] }
    ];
    assert.equal(tools.filterTasks(tasks, { query: 'energie', priority: 'HIGH', assignee: 'u1' }).length, 1);
    assert.equal(tools.filterTasks(tasks, { query: 'api' }).length, 1);
    assert.equal(tools.filterTasks(tasks, { query: 'absent' }).length, 0);
});

test('overdue uses calendar days and excludes done tasks or absent dates', () => {
    assert.ok(fs.existsSync('public/task-tools.js'), 'Task tools must exist');
    const { isOverdue } = require('../public/task-tools');
    assert.equal(isOverdue({ dueDate: '2026-11-22', status: 'TODO' }, '2026-11-23'), true);
    assert.equal(isOverdue({ dueDate: '2026-11-23', status: 'TODO' }, '2026-11-23'), false);
    assert.equal(isOverdue({ dueDate: '2026-11-22', status: 'DONE' }, '2026-11-23'), false);
    assert.equal(isOverdue({ dueDate: null }, '2026-11-23'), false);
});

test('task payload excludes forged history and validates calendar dates', () => {
    assert.ok(fs.existsSync('src/utils/taskActivity.js'), 'Task activity must exist');
    const { taskPayload } = require('../src/utils/taskActivity');
    const payload = taskPayload({ title: 'Test', history: [{ actorName: 'forged' }], companyId: 'foreign', dueDate: '2026-11-23' });
    assert.equal(payload.history, undefined);
    assert.equal(payload.companyId, undefined);
    assert.equal(payload.dueDate.toISOString(), '2026-11-23T00:00:00.000Z');
    assert.throws(() => taskPayload({ dueDate: '2026-02-30' }), /échéance/i);
    assert.equal(taskPayload({ dueDate: '' }).dueDate, null);
});

test('history includes only changed fields with old and new values', () => {
    assert.ok(fs.existsSync('src/utils/taskActivity.js'), 'Task activity must exist');
    const { changesFor } = require('../src/utils/taskActivity');
    const changes = changesFor({ title: 'Avant', priority: 'HIGH' }, { title: 'Après', priority: 'HIGH' });
    assert.equal(changes.length, 1);
    assert.equal(changes[0].field, 'title');
    assert.equal(changes[0].before, 'Avant');
    assert.equal(changes[0].after, 'Après');
});

test('project archive and task history fields are backwards compatible', () => {
    const Project = require('../src/models/Project');
    const Task = require('../src/models/Task');
    assert.equal(new Project({ name: 'Test' }).archived, false);
    assert.deepEqual(new Task({ title: 'Test' }).history?.toObject(), []);
});
