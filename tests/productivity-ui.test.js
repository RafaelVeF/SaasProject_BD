const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
    const elements = new Map();
    const context = vm.createContext({
        console,
        document: {
            getElementById(id) {
                if (!elements.has(id)) elements.set(id, { textContent: '', innerHTML: '', showModal() {} });
                return elements.get(id);
            }
        },
        currentCompanyId: 'c1', currentUserId: 'u1',
        tasks: [], projects: []
    });
    vm.runInContext(fs.readFileSync('public/productivity.js', 'utf8'), context);
    return { elements, run: code => vm.runInContext(code, context) };
}

test('notification results from a previous user cannot overwrite the active inbox', async () => {
    const app = setup();
    app.run('globalThis.pending = []; api = () => new Promise(resolve => pending.push(resolve));');
    const first = app.run('refreshNotifications()');
    app.run(`currentUserId = 'u2'`);
    const second = app.run('refreshNotifications()');
    app.run(`pending[1]({items: [], unreadCount: 2})`);
    await second;
    app.run(`pending[0]({items: [], unreadCount: 99})`);
    await first;
    assert.equal(app.elements.get('notificationCount').textContent, '2');
});

test('history escapes task changes and retains an actor name after user removal', () => {
    const app = setup();
    app.run(`tasks = [{_id:'t', title:'Test', history:[{
        action:'updated', actorName:'Ancien membre', createdAt:'2026-11-23T12:00:00Z',
        changes:[{field:'title', before:'Avant', after:'<script>danger()</script>'}]
    }]}]; openTaskHistory('t')`);
    const html = app.elements.get('activityList').innerHTML;
    assert.ok(html.includes('Ancien membre'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
});

test('empty company clears the previous user identity before requesting notifications', async () => {
    const app = setup();
    const html = fs.readFileSync('public/index.html', 'utf8');
    const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
        .map(match => match[1]).find(code => code.includes('function selectProject'));
    app.run(script.replace(/\binit\(\);/, ''));
    app.run(`api = async () => []; renderUserSession = () => {}; currentUserId = 'previous-tenant-user';`);
    await app.run('loadUsers()');
    assert.equal(app.run('currentUserId'), null);
});

test('project response from a previous company cannot replace the active project list', async () => {
    const app = setup();
    const html = fs.readFileSync('public/index.html', 'utf8');
    const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
        .map(match => match[1]).find(code => code.includes('function selectProject'));
    app.run(script.replace(/\binit\(\);/, ''));
    app.run(`currentCompanyId='c1'; renderProjectList=()=>{};
        api=()=>new Promise(resolve=>{globalThis.resolveProjects=resolve;});`);
    const pending = app.run('loadProjects()');
    app.run(`currentCompanyId='c2'; projects=[{_id:'current'}]; resolveProjects([{_id:'stale'}]);`);
    await pending;
    assert.equal(app.run('projects[0]._id'), 'current');
});
