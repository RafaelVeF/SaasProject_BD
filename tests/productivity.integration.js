// Run explicitly against a local disposable-capable instance:
// node tests/productivity.integration.js
// Only companies created by this run are removed in finally; demo data is never reset.
const assert = require('node:assert/strict');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const companies = [];
async function request(path, { method = 'GET', companyId, userId, body, expected = 200 } = {}) {
    const response = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(companyId ? { 'X-Company-Id': companyId } : {}),
            ...(userId ? { 'X-User-Id': userId } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    const result = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
    return result;
}

async function main() {
    try {
        const company = await request('/api/companies', { method: 'POST', body: { name: `Integration ${Date.now()}` }, expected: 201 });
        companies.push(company._id);
        const foreign = await request('/api/companies', { method: 'POST', body: { name: `Foreign ${Date.now()}` }, expected: 201 });
        companies.push(foreign._id);
        const companyId = company._id;
        const actor = await request('/api/users', { method: 'POST', companyId, body: { name: 'Actor', email: 'actor@example.com' }, expected: 201 });
        const recipient = await request('/api/users', { method: 'POST', companyId, body: { name: 'Recipient', email: 'recipient@example.com' }, expected: 201 });
        const outsider = await request('/api/users', { method: 'POST', companyId: foreign._id, body: { name: 'Outsider', email: 'outside@example.com' }, expected: 201 });
        const context = { companyId, userId: actor._id };
        const project = await request('/api/projects', { ...context, method: 'POST', body: { name: 'Project', memberIds: [actor._id, recipient._id] }, expected: 201 });
        const task = await request(`/api/projects/${project._id}/tasks`, {
            ...context, method: 'POST', expected: 201,
            body: { title: 'Énergie', tags: ['API'], dueDate: '2026-11-22', assigneeIds: [recipient._id],
                history: [{ actorName: 'Forged' }] }
        });
        assert.equal(task.history.length, 1);
        assert.equal(task.history[0].actorName, 'Actor');
        assert.equal(task.history[0].action, 'created');
        const unchanged = await request(`/api/tasks/${task._id}`, {
            ...context, method: 'PUT', body: { title: '  Énergie  ', tags: ['  API  '] }
        });
        assert.equal(unchanged.history.length, 1, 'History must compare normalized persisted values, not raw whitespace');
        const inbox = () => request('/api/notifications', { companyId, userId: recipient._id });
        let notices = await inbox();
        assert.equal(notices.unreadCount, 1);
        assert.equal(notices.items[0].type, 'assignment');
        assert.equal((await request('/api/notifications', context)).unreadCount, 0);
        await request('/api/notifications', { companyId, userId: outsider._id, expected: 403 });
        await request(`/api/notifications/${notices.items[0]._id}/read`, { ...context, method: 'PUT', expected: 404 });
        await request(`/api/tasks/${task._id}`, { ...context, method: 'PUT', body: { dueDate: '2026-02-30' }, expected: 400 });
        const updated = await request(`/api/tasks/${task._id}`, { ...context, method: 'PUT', body: { status: 'DONE', dueDate: null, history: [] } });
        assert.equal(updated.history.length, 2);
        assert.equal(updated.history[1].actorName, 'Actor');
        assert.equal(updated.dueDate, null);
        assert.equal((await inbox()).unreadCount, 1, 'Unchanged assignees must not be notified twice');
        await request(`/api/tasks/${task._id}/comments`, { ...context, method: 'POST', body: { text: 'Bonjour', authorName: 'Forged' }, expected: 201 });
        notices = await inbox();
        assert.equal(notices.unreadCount, 2);
        assert.equal(notices.items[0].type, 'comment');
        await request(`/api/tasks/${task._id}/comments`, {
            companyId, userId: recipient._id, method: 'POST', body: { text: 'Réponse' }, expected: 201
        });
        assert.equal((await inbox()).unreadCount, 2, 'The comment author must not notify themselves');
        const actorNotices = await request('/api/notifications', context);
        assert.equal(actorNotices.unreadCount, 1, 'A previous participant receives the reply');
        await request(`/api/notifications/${actorNotices.items[0]._id}/read`, { ...context, method: 'PUT' });
        assert.equal((await request('/api/notifications', context)).unreadCount, 0);
        await request('/api/notifications/read-all', { companyId, userId: recipient._id, method: 'PUT' });
        assert.equal((await inbox()).unreadCount, 0);
        await request(`/api/projects/${project._id}`, { ...context, method: 'PUT', body: { archived: true } });
        assert.equal((await request('/api/projects?archived=false', context)).length, 0);
        assert.equal((await request('/api/projects?archived=true', context)).length, 1);
        const tasks = await request(`/api/projects/${project._id}/tasks`, context);
        assert.equal(tasks.length, 1, 'Archiving must preserve tasks');
        assert.equal(tasks[0].history.length, 4);
        await request(`/api/projects/${project._id}`, { ...context, method: 'PUT', body: { archived: false } });
        assert.equal((await request('/api/projects?archived=false', context)).length, 1);
        await request(`/api/tasks/${task._id}`, { ...context, method: 'PUT', body: { assigneeIds: [outsider._id] }, expected: 403 });
        await request(`/api/tasks/${task._id}`, { companyId: foreign._id, userId: outsider._id, method: 'PUT', body: { title: 'Forbidden' }, expected: 404 });
        await request(`/api/tasks/${task._id}`, { ...context, method: 'DELETE' });
        assert.equal((await inbox()).items.length, 0);
        console.log('Integration OK: dates, history, assignments, comments, archives, tenant/recipient isolation and cleanup.');
    } finally {
        for (const id of companies) await request(`/api/companies/${id}`, { method: 'DELETE' });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
