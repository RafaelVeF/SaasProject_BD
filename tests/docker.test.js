const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Docker configuration files exist and contain required services', () => {
    const dockerfilePath = path.join(__dirname, '../Dockerfile');
    const composePath = path.join(__dirname, '../compose.yml');
    const legacyComposePath = path.join(__dirname, '../docker-compose.yml');

    assert.ok(fs.existsSync(dockerfilePath), 'Dockerfile must exist');
    assert.ok(fs.existsSync(composePath), 'compose.yml must exist');
    assert.ok(fs.existsSync(legacyComposePath), 'docker-compose.yml must exist');

    const composeContent = fs.readFileSync(composePath, 'utf-8');
    assert.ok(composeContent.includes('nexusflow-mongodb'), 'MongoDB service must be named nexusflow-mongodb');
    assert.ok(composeContent.includes('nexusflow-app'), 'App service must be named nexusflow-app');
    assert.ok(composeContent.includes('service_healthy'), 'App must depend on MongoDB being healthy');
    assert.ok(composeContent.includes('config.env'), 'App must load config.env');
    assert.ok(composeContent.includes('3000:3000'), 'App must map port 3000:3000');
});
