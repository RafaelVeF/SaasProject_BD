const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const requireTenant = require('../middleware/tenant');

router.use(requireTenant);

// GET /api/projects - Projets de l'entreprise
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find({ companyId: req.companyId })
            .populate('memberIds', 'name email role avatarColor')
            .sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/projects - Créer un projet avec validation inter-tenant
router.post('/', async (req, res) => {
    try {
        if (req.body.memberIds && req.body.memberIds.length > 0) {
            const validMembers = await User.countDocuments({
                _id: { $in: req.body.memberIds },
                companyId: req.companyId
            });
            if (validMembers !== req.body.memberIds.length) {
                return res.status(403).json({
                    error: "Violation d'isolation : Utilisateur externe détecté dans l'équipe."
                });
            }
        }

        const project = await Project.create({
            ...req.body,
            companyId: req.companyId
        });
        const populated = await project.populate('memberIds', 'name email role avatarColor');
        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/projects/:id - Modifier un projet
router.put('/:id', async (req, res) => {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Identifiant de projet invalide." });
    }
    try {
        delete req.body.companyId;
        delete req.body._id;
        if (req.body.memberIds && req.body.memberIds.length > 0) {
            const validMembers = await User.countDocuments({
                _id: { $in: req.body.memberIds },
                companyId: req.companyId
            });
            if (validMembers !== req.body.memberIds.length) {
                return res.status(403).json({
                    error: "Violation d'isolation : Utilisateur externe détecté dans l'équipe."
                });
            }
        }

        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            req.body,
            { new: true, runValidators: true }
        ).populate('memberIds', 'name email role avatarColor');

        if (!project) return res.status(404).json({ error: "Projet introuvable dans cette entreprise." });
        res.json(project);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/projects/:id - Supprimer un projet et ses tâches
router.delete('/:id', async (req, res) => {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Identifiant de projet invalide." });
    }
    try {
        const deleted = await Project.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
        if (!deleted) return res.status(404).json({ error: "Projet introuvable." });

        await Task.deleteMany({ projectId: req.params.id, companyId: req.companyId });
        res.json({ message: "Projet et ses tâches associés supprimés." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
