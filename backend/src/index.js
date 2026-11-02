require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Base route
app.get('/', (req, res) => {
    res.json({ message: 'SaaS API is running' });
});

// Auth routes (stubs / placeholder)
app.post('/api/auth/register', (req, res) => {
    const { email, password, companyName } = req.body;
    console.log('Register attempt:', { email, companyName });
    res.status(201).json({
        message: 'Utilisateur enregistré avec succès',
        user: { email, companyName }
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });
    res.status(200).json({
        message: 'Connexion réussie',
        token: 'fake-jwt-token-for-testing',
        user: { email }
    });
});

// Database connection & Server start
if (process.env.MONGO_URI) {
    connectDB();
}

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
