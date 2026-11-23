process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Notification = require('../src/models/Notification');
const { taskPayload, changesFor, actorFor, notifySafely } = require('../src/utils/taskActivity');

test('taskPayload trims and deduplicates tags and assigneeIds while validating dates', () => {
    const u1 = new mongoose.Types.ObjectId().toString();
    const u2 = new mongoose.Types.ObjectId().toString();
    const payload = taskPayload({
        title: 'API Hardening',
        tags: ['  MongoDB ', 'API', 'MongoDB', '', '  '],
        assigneeIds: [u1, u2, u1, ''],
        dueDate: '2024-02-29T18:45:00.000Z',
        history: [{ actorName: 'forged' }],
        companyId: 'foreign',
        projectId: 'foreign'
    });

    assert.deepEqual(payload.tags, ['MongoDB', 'API']);
    assert.deepEqual(payload.assigneeIds, [u1, u2]);
    assert.equal(payload.dueDate.toISOString(), '2024-02-29T00:00:00.000Z');
    assert.equal(payload.history, undefined);
    assert.equal(payload.companyId, undefined);
    assert.equal(payload.projectId, undefined);

    assert.throws(() => taskPayload({ dueDate: '2025-02-29' }), /échéance/i);
    assert.throws(() => taskPayload({ dueDate: '2026-13-01' }), /échéance/i);
    assert.throws(() => taskPayload({ dueDate: 'not-a-date' }), /échéance/i);
    assert.deepEqual(taskPayload({ tags: 'invalid' }).tags, []);
});

test('changesFor ignores unchanged normalized arrays and dates', () => {
    const u1 = new mongoose.Types.ObjectId().toString();
    const u2 = new mongoose.Types.ObjectId().toString();
    const existing = {
        title: 'Tâche',
        dueDate: new Date('2026-11-23T00:00:00.000Z'),
        assigneeIds: [u2, u1],
        tags: ['B', 'A']
    };
    const same = changesFor(existing, {
        title: 'Tâche',
        dueDate: new Date('2026-11-23T00:00:00.000Z'),
        assigneeIds: [u1, u2],
        assigneeId: u1,
        tags: ['A', 'B']
    });
    assert.deepEqual(same, []);

    const changed = changesFor(existing, { dueDate: null, tags: ['A', 'C'] });
    assert.equal(changed.length, 2);
    assert.deepEqual(changed[0], { field: 'dueDate', before: '2026-11-23', after: '' });
    assert.deepEqual(changed[1], { field: 'tags', before: 'A, B', after: 'A, C' });
});

test('actorFor validates X-User-Id format and tenant membership', async () => {
    const anon = await actorFor({ get: () => undefined, companyId: 'c1' });
    assert.deepEqual(anon, { actorId: null, actorName: 'Collaborateur' });

    await assert.rejects(
        actorFor({ get: () => 'bad-id', companyId: 'c1' }),
        /Identifiant utilisateur invalide/
    );

    const origFindOne = User.findOne;
    const companyId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();
    try {
        User.findOne = async () => null;
        await assert.rejects(
            actorFor({ get: () => userId, companyId }),
            /n’appartient pas/
        );

        User.findOne = async query => {
            assert.equal(query._id, userId);
            assert.equal(query.companyId, companyId);
            return { _id: userId, name: 'Sarah Connor' };
        };
        const resolved = await actorFor({ get: () => userId, companyId });
        assert.deepEqual(resolved, { actorId: userId, actorName: 'Sarah Connor' });
    } finally {
        User.findOne = origFindOne;
    }
});

test('notifySafely deduplicates recipients, excludes actor, and swallows delivery errors', async () => {
    const origFind = User.find;
    const origInsert = Notification.insertMany;
    const origErr = console.error;
    const companyId = new mongoose.Types.ObjectId();
    const projectId = new mongoose.Types.ObjectId();
    const taskId = new mongoose.Types.ObjectId();
    const actorId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();

    let inserted = null;
    let loggedError = null;
    try {
        User.find = () => ({
            select: async () => [{ _id: targetId }]
        });
        Notification.insertMany = async docs => { inserted = docs; };

        await notifySafely(
            { _id: taskId, companyId, projectId, title: 'Sharding' },
            [actorId, targetId, targetId, null],
            { actorId, actorName: 'Sarah' },
            'assignment'
        );
        assert.equal(inserted.length, 1);
        assert.equal(String(inserted[0].userId), String(targetId));
        assert.equal(inserted[0].type, 'assignment');
        assert.ok(inserted[0].message.includes('Sarah vous a assigné : Sharding'));

        console.error = (...args) => { loggedError = args.join(' '); };
        Notification.insertMany = async () => { throw new Error('MongoDB unavailable'); };
        await notifySafely(
            { _id: taskId, companyId, projectId, title: 'Sharding' },
            [targetId],
            { actorId, actorName: 'Sarah' },
            'comment'
        );
        assert.ok(loggedError.includes('MongoDB unavailable'));
    } finally {
        User.find = origFind;
        Notification.insertMany = origInsert;
        console.error = origErr;
    }
});

test('Notification schema enforces immutable tenant and recipient fields and compound index', () => {
    assert.equal(Notification.schema.path('companyId').options.immutable, true);
    assert.equal(Notification.schema.path('userId').options.immutable, true);
    const indexes = Notification.schema.indexes();
    assert.ok(indexes.some(([fields]) => fields.companyId === 1 && fields.userId === 1));
});
