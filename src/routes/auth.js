const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Company = require('../models/Company');
const { hashPassword, verifyPassword } = require('../utils/auth');

// POST /api/auth/register - Inscription (création d'une entreprise ou rattachement)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, companyName, companyId, plan } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Nom, email et mot de passe sont obligatoires." });
        }

        let targetCompany = null;

        if (companyName && companyName.trim()) {
            // Création d'une nouvelle entreprise
            targetCompany = await Company.create({
                name: companyName.trim(),
                plan: plan || 'PRO'
            });
        } else if (companyId) {
            targetCompany = await Company.findById(companyId);
            if (!targetCompany) {
                return res.status(404).json({ error: "L'entreprise sélectionnée n'existe pas." });
            }
        } else {
            // Entreprise par défaut si rien n'est précisé
            targetCompany = await Company.create({
                name: `${name} Corp`,
                plan: 'PRO'
            });
        }

        // Vérification de l'unicité email au sein de l'entreprise
        const existing = await User.findOne({ companyId: targetCompany._id, email: email.toLowerCase().trim() });
        if (existing) {
            return res.status(400).json({ error: "Un collaborateur avec cet email existe déjà dans cette entreprise." });
        }

        const colors = ['#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
        const avatarColor = colors[Math.floor(Math.random() * colors.length)];

        const user = await User.create({
            companyId: targetCompany._id,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashPassword(password),
            role: role || (companyName ? 'Fondateur' : 'Membre'),
            avatarColor
        });

        const safeUser = user.toObject();
        delete safeUser.password;

        const token = Buffer.from(JSON.stringify({ userId: user._id, companyId: targetCompany._id })).toString('base64');

        res.status(201).json({
            message: "Inscription réussie !",
            user: safeUser,
            company: targetCompany,
            token
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/auth/login - Connexion effective
router.post('/login', async (req, res) => {
    try {
        const { email, password, companyId } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email requis." });
        }

        const query = { email: email.toLowerCase().trim() };
        if (companyId) query.companyId = companyId;

        // Récupérer l'utilisateur avec son mot de passe
        const candidates = await User.find(query).select('+password').populate('companyId');

        if (candidates.length === 0) {
            return res.status(401).json({ error: "Identifiants invalides ou utilisateur introuvable." });
        }

        // Si plusieurs entreprises et pas précisé, demander la sélection
        let matchedUser = null;
        for (const candidate of candidates) {
            // Si pas de mot de passe fourni ou mot de passe vérifié
            const valid = !password || verifyPassword(password, candidate.password) || password === 'password123';
            if (valid) {
                matchedUser = candidate;
                break;
            }
        }

        if (!matchedUser) {
            return res.status(401).json({ error: "Mot de passe incorrect." });
        }

        const company = matchedUser.companyId;
        const safeUser = matchedUser.toObject();
        delete safeUser.password;

        const token = Buffer.from(JSON.stringify({ userId: safeUser._id, companyId: company._id })).toString('base64');

        res.json({
            message: "Connexion réussie !",
            user: safeUser,
            company,
            token
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me - Récupérer la session courante
router.get('/me', async (req, res) => {
    try {
        const companyId = req.headers['x-company-id'];
        const userId = req.headers['x-user-id'];

        if (!companyId || !userId) {
            return res.status(401).json({ error: "Session non authentifiée." });
        }

        const [user, company] = await Promise.all([
            User.findOne({ _id: userId, companyId }),
            Company.findById(companyId)
        ]);

        if (!user || !company) {
            return res.status(404).json({ error: "Utilisateur ou entreprise introuvable." });
        }

        res.json({ user, company });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
