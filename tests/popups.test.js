const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
    const elements = new Map();
    const document = {
        activeElement: { focus() { document.activeElement = this; } },
        getElementById(id) {
            if (!elements.has(id)) {
                const listeners = {};
                elements.set(id, {
                    open: false, textContent: '', hidden: false, dataset: {},
                    focus() { document.activeElement = this; },
                    showModal() { this.open = true; },
                    close() { this.open = false; this.fire('close'); },
                    addEventListener(type, callback) {
                        (listeners[type] ||= []).push(callback);
                    },
                    fire(type) { (listeners[type] || []).forEach(callback => callback({ preventDefault() {} })); }
                });
            }
            return elements.get(id);
        }
    };
    const context = vm.createContext({ document });
    const file = 'public/dialogs.js';
    assert.ok(fs.existsSync(file), 'Shared dialog controller must exist');
    vm.runInContext(fs.readFileSync(file, 'utf8'), context);
    return { elements, document, run: code => vm.runInContext(code, context) };
}

test('confirmation starts on cancel and resolves true only after explicit validation', async () => {
    const app = setup();
    const result = app.run(`showConfirmation('Supprimer ?', { destructive: true })`);
    assert.equal(app.document.activeElement, app.elements.get('noticeCancel'));
    app.elements.get('noticeAccept').fire('click');
    assert.equal(await result, true);
});

test('cancel and Escape resolve false and restore the original focus', async () => {
    for (const action of ['click', 'cancel']) {
        const app = setup();
        const trigger = app.document.activeElement;
        const result = app.run(`showConfirmation('Supprimer ?')`);
        app.elements.get(action === 'click' ? 'noticeCancel' : 'noticeDialog').fire(action);
        assert.equal(await result, false);
        assert.equal(app.document.activeElement, trigger);
    }
});

test('messages are plain text and queued errors do not overwrite confirmations', async () => {
    const app = setup();
    const confirmation = app.run(`showConfirmation('<img src=x onerror=alert(1)>')`);
    const error = app.run(`showError('Erreur suivante')`);
    assert.equal(app.elements.get('noticeMessage').textContent, '<img src=x onerror=alert(1)>');
    app.elements.get('noticeCancel').fire('click');
    assert.equal(await confirmation, false);
    assert.equal(app.elements.get('noticeMessage').textContent, 'Erreur suivante');
    app.elements.get('noticeAccept').fire('click');
    assert.equal(await error, undefined);
});

test('error dialog does not alter an underlying form and returns focus to its input', async () => {
    const app = setup();
    const input = { value: 'Brouillon conservé', focus() { app.document.activeElement = this; } };
    app.document.activeElement = input;
    const result = app.run(`showError('Échec de sauvegarde')`);
    app.elements.get('noticeAccept').fire('click');
    await result;
    assert.equal(input.value, 'Brouillon conservé');
    assert.equal(app.document.activeElement, input);
});

test('application uses modal dialog semantics and no native alert or confirm calls', () => {
    const html = fs.readFileSync('public/index.html', 'utf8');
    assert.match(html, /<dialog id="modalOverlay"/);
    assert.match(html, /<dialog id="chatModalOverlay"/);
    assert.match(html, /<dialog id="noticeDialog"/);
    assert.doesNotMatch(html, /\b(?:alert|confirm)\(/);
});

test('chat dialog can scroll as a whole when its description exceeds the viewport', () => {
    const css = fs.readFileSync('public/dialogs.css', 'utf8');
    assert.ok(/\.app-dialog\.chat-dialog\s*\{[^}]*overflow:\s*auto/.test(css),
        'The whole chat dialog must remain scrollable, not clip its header or form');
    assert.ok(/\.chat-dialog > div\s*\{[^}]*max-height:\s*none/.test(css),
        'Inner chat wrapper must grow so all content can be reached');
});

test('cancelling project deletion never calls the mutation API', async () => {
    const app = setup();
    const html = fs.readFileSync('public/index.html', 'utf8');
    const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
        .map(match => match[1]).find(code => code.includes('function selectProject'));
    app.run(script.replace(/\binit\(\);/, ''));
    app.run(`api = async () => { throw new Error('Mutation must not run'); };`);
    const result = app.run(`deleteProject('project-id')`);
    app.elements.get('noticeCancel').fire('click');
    await result;
});

test('actual form stays open with its fields intact after an API error', async () => {
    const app = setup();
    const html = fs.readFileSync('public/index.html', 'utf8');
    const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
        .map(match => match[1]).find(code => code.includes('function selectProject'));
    app.run(script.replace(/\binit\(\);/, ''));
    const form = app.document.getElementById('modalForm');
    const input = { value: 'Brouillon conservé', focus() { app.document.activeElement = this; } };
    form.querySelector = () => input;
    app.run(`showModal('Projet', '<input name="name">', async () => {})`);
    const fields = form.innerHTML;
    app.run(`fetch = async () => ({ok:false, json:async () => ({error:'Erreur de sauvegarde'})})`);
    await assert.rejects(app.run(`api('/api/projects')`), /Erreur de sauvegarde/);
    assert.equal(app.elements.get('modalOverlay').open, true);
    assert.equal(form.innerHTML, fields);
    assert.equal(input.value, 'Brouillon conservé');
    app.elements.get('noticeAccept').fire('click');
    assert.equal(app.document.activeElement, input);
});
