require('dotenv').config({ path: './config.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const companiesRouter = require('./src/routes/companies');
const usersRouter = require('./src/routes/users');
const projectsRouter = require('./src/routes/projects');
const tasksRouter = require('./src/routes/tasks');
const seedRouter = require('./src/routes/seed');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/companies', companiesRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api', tasksRouter);
app.use('/api/seed', seedRouter);

// Healthcheck route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
    });
});

// Database connection & Server initialization
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

let server = null;

if (MONGO_URI && process.env.NODE_ENV !== 'test') {
    mongoose.connect(MONGO_URI, {
        maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '20', 10),
        serverSelectionTimeoutMS: parseInt(process.env.MONGO_TIMEOUT_MS || '5000', 10)
    })
    .then(() => {
        console.log(`[MongoDB] Connecté avec succès à : ${MONGO_URI}`);
    })
    .catch(err => {
        console.error('[MongoDB] Erreur de connexion critique :', err.message);
    });
}

// Start listening only when not required as a module in tests or start explicitly
if (require.main === module) {
    server = app.listen(PORT, () => {
        console.log(`[NexusFlow SaaS] Serveur démarré sur http://localhost:${PORT}`);
    });
}

module.exports = { app, server };
