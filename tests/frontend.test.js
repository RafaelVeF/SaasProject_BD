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

    // Must have full CRUD operations (including edit)
    assert.ok(content.includes('openEditCompanyModal'), 'Must support editing companies');
    assert.ok(content.includes('openEditProjectModal'), 'Must support editing projects');
    assert.ok(content.includes('openEditUserModal'), 'Must support editing users');

    // Advanced Bonus: Task Chat/Comments & Multi-View Tabs
    assert.ok(content.includes('openChatModal'), 'Must support task conversation / chat');
    assert.ok(content.includes('switchView'), 'Must support tabbed views (Kanban, Dashboard, Team)');
    assert.ok(content.includes('viewDashboardContainer'), 'Must include Dashboard analytics view');
    assert.ok(content.includes('viewTeamContainer'), 'Must include Team member view');

    // Advanced: Real Authentication View & Theme Switcher
    assert.ok(content.includes('authView'), 'Must include authentication screen');
    assert.ok(content.includes('loginForm'), 'Must include login form');
    assert.ok(content.includes('registerForm'), 'Must include registration form');
    assert.ok(content.includes('toggleTheme'), 'Must support theme switcher toggle');
});
