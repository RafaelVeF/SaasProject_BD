const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Frontend public/index.html exists and contains essential structure', () => {
    const indexPath = path.join(__dirname, '../public/index.html');
    assert.ok(fs.existsSync(indexPath), 'public/index.html must exist');

    const content = fs.readFileSync(indexPath, 'utf-8');

    // Required DOM elements
    const requiredIds = [
        'companySelect',
        'projectList',
        'userList',
        'kanbanBoard',
        'filterAssignee',
        'filterPriority',
        'modalOverlay'
    ];

    for (const id of requiredIds) {
        assert.ok(
            content.includes(`id="${id}"`),
            `public/index.html must contain element with id="${id}"`
        );
    }

    // Must inject X-Company-Id in API calls
    assert.ok(
        content.includes('X-Company-Id'),
        'Frontend must include X-Company-Id header in API requests'
    );

    // Must have HTML5 Drag & Drop attributes / handlers
    assert.ok(content.includes('ondragstart'), 'Must include ondragstart handler');
    assert.ok(content.includes('ondragover'), 'Must include ondragover handler');
    assert.ok(content.includes('ondrop'), 'Must include ondrop handler');
});
