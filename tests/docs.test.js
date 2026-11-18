const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Documentation deliverables exist and contain required content', () => {
    const requiredFiles = [
        'SPEC_TECHNIQUE.md',
        'SPEC_FONCTIONNELLE.md',
        'Architecture_BD.md',
        'Architecture_Fonctionnelle.md',
        'README.md'
    ];

    for (const f of requiredFiles) {
        const filePath = path.join(__dirname, '..', f);
        assert.ok(fs.existsSync(filePath), `${f} must exist`);
        const stats = fs.statSync(filePath);
        assert.ok(stats.size > 200, `${f} must not be empty`);
    }

    const techSpec = fs.readFileSync(path.join(__dirname, '../SPEC_TECHNIQUE.md'), 'utf-8');
    assert.ok(techSpec.includes('companyId'), 'SPEC_TECHNIQUE must document companyId');
    assert.ok(techSpec.includes('MONGO_URI'), 'SPEC_TECHNIQUE must document MONGO_URI');

    const funcSpec = fs.readFileSync(path.join(__dirname, '../SPEC_FONCTIONNELLE.md'), 'utf-8');
    assert.ok(funcSpec.includes('Kanban'), 'SPEC_FONCTIONNELLE must document Kanban');
    assert.ok(funcSpec.includes('X-Company-Id'), 'SPEC_FONCTIONNELLE must document X-Company-Id');
});
