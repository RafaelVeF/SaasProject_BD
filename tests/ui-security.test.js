const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const TaskTools = require('../public/task-tools');

function setupFrontend() {
    const html = fs.readFileSync('public/index.html', 'utf8');
    const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
        .map(match => match[1])
        .find(code => code.includes('function selectProject'));

    const elements = new Map();
    function makeEl(id) {
        const classes = new Set();
        return {
            id,
            value: '',
            innerHTML: '',
            textContent: '',
            style: {},
            scrollTop: 0,
            scrollHeight: 0,
            onsubmit: null,
            open: false,
            showModal() { this.open = true; },
            close() { this.open = false; },
            focus() {},
            querySelector() { return null; },
            classList: {
                add(name) { classes.add(name); },
                remove(name) { classes.delete(name); },
                toggle(name, force) {
                    if (force === undefined) {
                        if (classes.has(name)) { classes.delete(name); return false; }
                        classes.add(name); return true;
                    }
                    if (force) classes.add(name); else classes.delete(name);
                    return force;
                },
                contains(name) { return classes.has(name); }
            }
        };
    }

    const context = vm.createContext({
        console: { error() {} },
        TaskTools,
        localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
        document: {
            documentElement: { classList: { add() {}, remove() {}, toggle() { return true; } } },
            getElementById(id) {
                if (!elements.has(id)) elements.set(id, makeEl(id));
                return elements.get(id);
            },
            addEventListener() {}
        }
    });

    vm.runInContext(script.replace(/\binit\(\);/, ''), context);
    return { elements, run: code => vm.runInContext(code, context) };
}

test('renderKanban escapes XSS payloads in titles, descriptions, tags and assignees', () => {
    const app = setupFrontend();
    app.run(`
        currentProject = { _id: 'p1', name: 'Proj', memberIds: [] };
        tasks = [{
            _id: 't1',
            title: '<img src=x onerror=alert(1)>',
            description: '<script>evil()</script>',
            status: 'TODO',
            priority: 'HIGH',
            tags: ['" onmouseover="alert(1)'],
            assigneeIds: [{ _id: 'u1', name: '<b>Bob</b>', avatarColor: 'red; background:url(javascript:alert(1))' }],
            comments: []
        }];
        renderKanban();
    `);

    const boardHtml = app.elements.get('kanbanBoard').innerHTML;
    assert.ok(!boardHtml.includes('<img src=x onerror=alert(1)>'), 'Raw img tag must not appear');
    assert.ok(!boardHtml.includes('<script>evil()</script>'), 'Raw script tag must not appear');
    assert.ok(!boardHtml.includes('<b>Bob</b>'), 'Raw bold tag must not appear');
    assert.ok(!boardHtml.includes('javascript:alert(1)'), 'Unsafe CSS color must be rejected');
    assert.ok(boardHtml.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(boardHtml.includes('&lt;script&gt;evil()&lt;/script&gt;'));
    assert.ok(boardHtml.includes('#3b82f6'), 'Invalid avatarColor must fall back to safe default');
});

test('renderProjectList and renderChatMessages escape HTML and attribute injections', () => {
    const app = setupFrontend();
    app.run(`
        projects = [{
            _id: 'p1',
            name: '<svg onload=alert(1)>',
            description: 'Desc " onclick="alert(2)',
            archived: false,
            memberIds: [{ _id: 'u1', name: 'Eve <script>', avatarColor: '#10b981' }]
        }];
        renderProjectList();
        renderChatMessages([{
            userId: { name: '<img src=x>', avatarColor: 'expression(alert(1))' },
            text: '<script>steal()</script>',
            createdAt: '2026-11-23T12:00:00Z'
        }]);
    `);

    const projectHtml = app.elements.get('projectList').innerHTML;
    const chatHtml = app.elements.get('chatMessageList').innerHTML;
    assert.ok(!projectHtml.includes('<svg onload=alert(1)>'));
    assert.ok(projectHtml.includes('&lt;svg onload=alert(1)&gt;'));
    assert.ok(projectHtml.includes('&quot; onclick=&quot;alert(2)'));
    assert.ok(!chatHtml.includes('<script>steal()</script>'));
    assert.ok(!chatHtml.includes('expression(alert(1))'));
    assert.ok(chatHtml.includes('&lt;script&gt;steal()&lt;/script&gt;'));
});

test('edit modals escape quotes in existing field values', () => {
    const app = setupFrontend();
    app.run(`
        companies = [{ _id: 'c1', name: 'Acme "Corp" <1>', plan: 'PRO' }];
        currentCompanyId = 'c1';
        openEditCompanyModal();
    `);
    const formHtml = app.elements.get('modalForm').innerHTML;
    assert.ok(formHtml.includes('value="Acme &quot;Corp&quot; &lt;1&gt;"'));
});
