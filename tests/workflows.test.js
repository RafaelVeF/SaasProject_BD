const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function frontend() {
    const html = fs.readFileSync('public/index.html', 'utf8');
    const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
        .map(match => match[1]).find(code => code.includes('function selectProject'));
    const elements = new Map();
    const context = vm.createContext({
        console: { error() {} },
        localStorage: { getItem() { return null; }, setItem() {} },
        document: {
            getElementById(id) {
                if (!elements.has(id)) {
                    const classes = new Set();
                    elements.set(id, {
                        value: '', innerHTML: '', textContent: '',
                        classList: {
                            add(name) { classes.add(name); },
                            remove(name) { classes.delete(name); },
                            contains(name) { return classes.has(name); }
                        }
                    });
                }
                return elements.get(id);
            }
        }
    });
    vm.runInContext(script.replace(/\binit\(\);/, ''), context);
    return { context, elements, run: code => vm.runInContext(code, context) };
}

test('failed demo login neither resets data nor retries', async () => {
    const app = frontend();
    app.run(`api = async () => { throw new Error('offline'); };
        seedDemoData = () => { throw new Error('must not seed'); };`);
    await app.run(`loginAsDemo('demo@example.com')`);
});

test('empty project hides all views and clears tasks regardless of selected tab', () => {
    const app = frontend();
    app.run(`currentView = 'dashboard'; currentProject = null;
        tasks = [{title: 'stale'}]; renderCurrentView();`);
    assert.equal(app.run('tasks.length'), 0);
    for (const view of ['Kanban', 'Dashboard', 'Team']) {
        assert.ok(app.elements.get(`view${view}Container`).classList.contains('hidden'));
    }
});

test('late project response cannot replace tasks for newer selection', async () => {
    const app = frontend();
    app.run(`projects = [{_id:'a', name:'A'}, {_id:'b', name:'B'}];
        loadProjects = () => {};
        switchView = () => {};
        renderCurrentView = () => {};
        globalThis.pending = {};
        api = path => new Promise(resolve => { pending[path] = resolve; });`);
    const first = app.run(`selectProject('a')`);
    const second = app.run(`selectProject('b')`);
    app.run(`pending['/api/projects/b/tasks']([{title:'B'}])`);
    await second;
    app.run(`pending['/api/projects/a/tasks']([{title:'A'}])`);
    await first;
    assert.equal(app.run('tasks[0].title'), 'B');
});
