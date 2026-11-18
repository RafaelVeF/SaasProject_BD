const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

// GET /api/companies - Liste toutes les entreprises
router.get('/', async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });
        res.json(companies);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/companies - Créer une entreprise
router.post('/', async (req, res) => {
    try {
        const company = await Company.create(req.body);
        res.status(201).json(company);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/companies/:id - Modifier une entreprise
router.put('/:id', async (req, res) => {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Identifiant d'entreprise invalide." });
    }
    try {
        delete req.body._id;
        const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!company) return res.status(404).json({ error: "Entreprise introuvable." });
        res.json(company);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/companies/:id - Suppression en cascade
router.delete('/:id', async (req, res) => {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Identifiant d'entreprise invalide." });
    }
    try {
        const companyId = req.params.id;
        await Promise.all([
            Task.deleteMany({ companyId }),
            Project.deleteMany({ companyId }),
            User.deleteMany({ companyId }),
            Company.findByIdAndDelete(companyId)
        ]);
        res.json({ message: "Entreprise et toutes ses données isolées supprimées." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
