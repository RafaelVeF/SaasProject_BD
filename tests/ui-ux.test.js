const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const TaskTools = require('../public/task-tools');

function setupUiApp() {
    const html = fs.readFileSync('public/index.html', 'utf8');
    const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
        .map(match => match[1])
        .find(code => code.includes('function selectProject'));

    const elements = new Map();
    const docListeners = {};

    function makeEl(id) {
        const classes = new Set();
        const attrs = {};
        let focused = false;
        return {
            id,
            value: '',
            checked: false,
            disabled: false,
            innerHTML: '',
            textContent: '',
            style: {},
            open: false,
            onsubmit: null,
            scrollTop: 0,
            scrollHeight: 0,
            get focused() { return focused; },
            focus() { focused = true; },
            showModal() { this.open = true; },
            close() { this.open = false; },
            querySelector() { return null; },
            setAttribute(name, val) { attrs[name] = String(val); },
            getAttribute(name) { return attrs[name]; },
            classList: {
                add(...names) { names.forEach(n => classes.add(n)); },
                remove(...names) { names.forEach(n => classes.delete(n)); },
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
        FormData: class { constructor() {} },
        localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
        document: {
            documentElement: { classList: { add() {}, remove() {}, toggle() { return true; } } },
            getElementById(id) {
                if (!elements.has(id)) elements.set(id, makeEl(id));
                return elements.get(id);
            },
            querySelectorAll() { return []; },
            addEventListener(type, fn) { (docListeners[type] ||= []).push(fn); },
            dispatchKey(event) {
                const full = { preventDefault() { full.defaultPrevented = true; }, defaultPrevented: false, ...event };
                (docListeners.keydown || []).forEach(fn => fn(full));
                return full;
            }
        }
    });

    vm.runInContext(script.replace(/\binit\(\);/, ''), context);
    return { html, elements, document: context.document, run: code => vm.runInContext(code, context) };
}

test('TaskTools.filterTasks supports overdueOnly combined with search and filters', () => {
    const tasks = [
        { title: 'Migration', tags: ['DB'], priority: 'HIGH', status: 'TODO', dueDate: '2026-11-20', assigneeIds: [{ _id: 'u1' }] },
        { title: 'Migration OK', tags: ['DB'], priority: 'HIGH', status: 'DONE', dueDate: '2026-11-20', assigneeIds: [{ _id: 'u1' }] },
        { title: 'Future', tags: ['DB'], priority: 'HIGH', status: 'TODO', dueDate: '2026-11-30', assigneeIds: [{ _id: 'u1' }] }
    ];
    const result = TaskTools.filterTasks(tasks, {
        query: 'migration',
        priority: 'HIGH',
        assignee: 'u1',
        overdueOnly: true,
        today: '2026-11-23'
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].title, 'Migration');
});

test('resetFilters clears all Kanban filters and hides reset button', () => {
    const app = setupUiApp();
    app.run(`
        currentProject = { _id: 'p1', name: 'Proj', memberIds: [] };
        tasks = [
            { _id: 't1', title: 'Alpha', status: 'TODO', priority: 'HIGH', tags: [], dueDate: '2020-01-01' },
            { _id: 't2', title: 'Beta', status: 'DONE', priority: 'LOW', tags: [] }
        ];
        document.getElementById('taskSearch').value = 'alpha';
        document.getElementById('filterAssignee').value = 'u1';
        document.getElementById('filterPriority').value = 'HIGH';
        document.getElementById('filterOverdue').checked = true;
        renderKanban();
    `);
    assert.equal(app.elements.get('resetFiltersBtn').classList.contains('hidden'), false);
    assert.equal(app.elements.get('searchResultCount').textContent, '0 tâche(s) sur 2');

    app.run('resetFilters()');
    assert.equal(app.elements.get('taskSearch').value, '');
    assert.equal(app.elements.get('filterAssignee').value, '');
    assert.equal(app.elements.get('filterPriority').value, '');
    assert.equal(app.elements.get('filterOverdue').checked, false);
    assert.equal(app.elements.get('resetFiltersBtn').classList.contains('hidden'), true);
    assert.equal(app.elements.get('searchResultCount').textContent, '2 tâche(s) sur 2');
});

test('column quick-add preselects the column status in task modal', () => {
    const app = setupUiApp();
    app.run(`
        currentProject = { _id: 'p1', name: 'Proj', memberIds: [] };
        users = [];
        openTaskModal(null, 'REVIEW');
    `);
    const formHtml = app.elements.get('modalForm').innerHTML;
    assert.ok(formHtml.includes('<option value="REVIEW" selected>En revue</option>'));
});

test('dropTask skips redundant API call when dropped in same column and updates on move', async () => {
    const app = setupUiApp();
    app.run(`
        currentProject = { _id: 'p1', name: 'Proj', memberIds: [] };
        tasks = [{ _id: 't1', title: 'Test', status: 'TODO' }];
        globalThis.apiCalls = [];
        api = async (url, opts) => {
            apiCalls.push({ url, opts });
            return [{ _id: 't1', title: 'Test', status: 'IN_PROGRESS' }];
        };
    `);

    const card = { classList: new Set(), add(c) { this.classList.add(c); }, remove(c) { this.classList.delete(c); } };
    app.run(`dragTask({ currentTarget: { classList: { add() {} } }, dataTransfer: { setData() {} } }, 't1')`);
    await app.run(`dropTask({ preventDefault() {} }, 'TODO')`);
    assert.equal(app.run('apiCalls.length'), 0, 'Same-column drop must not call API');

    app.run(`dragTask({ currentTarget: { classList: { add() {} } }, dataTransfer: { setData() {} } }, 't1')`);
    await app.run(`dropTask({ preventDefault() {} }, 'IN_PROGRESS')`);
    assert.equal(app.run('apiCalls.length'), 2, 'Cross-column drop must PUT task and reload');
    assert.equal(app.run('apiCalls[0].opts.method'), 'PUT');
    assert.equal(card.classList.size, 0);
});

test('deleteProject respects active scope and clears currentProject when only archived projects remain', async () => {
    const app = setupUiApp();
    app.run(`
        currentProject = { _id: 'p-active', name: 'Active', archived: false };
        projects = [{ _id: 'p-active', name: 'Active', archived: false }, { _id: 'p-arch', name: 'Arch', archived: true }];
        document.getElementById('projectScope').value = 'active';
        showConfirmation = async () => true;
        api = async () => ({});
        loadProjects = async () => { projects = [{ _id: 'p-arch', name: 'Arch', archived: true }]; };
        globalThis.selectedId = null;
        selectProject = async id => { selectedId = id; };
    `);
    await app.run(`deleteProject('p-active')`);
    assert.equal(app.run('selectedId'), null);
    assert.equal(app.run('currentProject'), null);
});

test('showModal locks submit button during submission and unlocks after error', async () => {
    const app = setupUiApp();
    const submitBtn = app.document.getElementById('modalSubmitBtn');
    submitBtn.textContent = 'Enregistrer';
    app.run(`
        globalThis.submits = 0;
        showModal('Test', '<input name="x">', async () => {
            submits++;
            assertBtnDisabledDuringSubmit = document.getElementById('modalSubmitBtn').disabled;
            throw new Error('Boom');
        });
    `);
    await assert.rejects(app.run(`document.getElementById('modalForm').onsubmit({ preventDefault() {} })`), /Boom/);
    assert.equal(app.run('assertBtnDisabledDuringSubmit'), true);
    assert.equal(submitBtn.disabled, false);
    assert.equal(submitBtn.textContent, 'Enregistrer');
});

test('keyboard shortcuts switch views and open task modal only when safe', () => {
    const app = setupUiApp();
    app.run(`
        currentProject = { _id: 'p1', name: 'Proj', memberIds: [] };
        currentView = 'kanban';
        document.getElementById('authView').classList.add('hidden');
        renderCurrentView = () => {};
    `);

    const evInput = app.document.dispatchKey({ key: '2', target: { tagName: 'INPUT' } });
    assert.equal(evInput.defaultPrevented, false);
    assert.equal(app.run('currentView'), 'kanban');

    const evDash = app.document.dispatchKey({ key: '2', target: { tagName: 'BODY' } });
    assert.equal(evDash.defaultPrevented, true);
    assert.equal(app.run('currentView'), 'dashboard');
    assert.equal(app.elements.get('tabDashboard').getAttribute('aria-selected'), 'true');
    assert.equal(app.elements.get('tabKanban').getAttribute('aria-selected'), 'false');

    app.elements.get('modalOverlay').open = true;
    const evBlocked = app.document.dispatchKey({ key: '1', target: { tagName: 'BODY' } });
    assert.equal(evBlocked.defaultPrevented, false);
    assert.equal(app.run('currentView'), 'dashboard');
});

test('Dashboard renders overdue KPI, status bars, French priority labels, and ARIA tab semantics', () => {
    const app = setupUiApp();
    assert.match(app.html, /role="tablist"/);
    assert.match(app.html, /id="tabKanban" role="tab"/);
    assert.match(app.html, /id="kpiOverdue"/);
    assert.match(app.html, /id="statusBars"/);

    app.run(`
        currentProject = { _id: 'p1', name: 'Proj', memberIds: [] };
        tasks = [
            { _id: 't1', title: 'Late', status: 'TODO', priority: 'CRITICAL', dueDate: '2020-01-01' },
            { _id: 't2', title: 'Done', status: 'DONE', priority: 'LOW', dueDate: '2020-01-01' }
        ];
        renderDashboard();
    `);

    assert.equal(app.elements.get('kpiTotal').textContent, 2);
    assert.equal(app.elements.get('kpiDone').textContent, 1);
    assert.equal(app.elements.get('kpiOverdue').textContent, 1);
    assert.ok(app.elements.get('priorityBars').innerHTML.includes('Critique'));
    assert.ok(app.elements.get('statusBars').innerHTML.includes('En cours'));
});
