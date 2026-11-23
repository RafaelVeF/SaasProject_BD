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
        const filter = { companyId: req.companyId };
        if (req.query.archived === 'true') filter.archived = true;
        else if (req.query.archived === 'false') filter.archived = { $ne: true };
        const projects = await Project.find(filter)
            .populate('memberIds', 'name email role avatarColor')
            .sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function projectPayload(body) {
    const allowed = ['name', 'description', 'memberIds', 'archived'];
    const payload = Object.fromEntries(allowed.filter(key => Object.hasOwn(body || {}, key)).map(key => [key, body[key]]));
    if (Array.isArray(payload.memberIds)) {
        payload.memberIds = [...new Set(payload.memberIds.filter(Boolean).map(String))];
    }
    return payload;
}

// POST /api/projects - Créer un projet avec validation inter-tenant
router.post('/', async (req, res) => {
    try {
        const payload = projectPayload(req.body);
        if (payload.memberIds && payload.memberIds.length > 0) {
            const validMembers = await User.countDocuments({
                _id: { $in: payload.memberIds },
                companyId: req.companyId
            });
            if (validMembers !== payload.memberIds.length) {
                return res.status(403).json({
                    error: "Violation d'isolation : Utilisateur externe détecté dans l'équipe."
                });
            }
        }

        const project = await Project.create({
            ...payload,
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
        const payload = projectPayload(req.body);
        if (payload.memberIds && payload.memberIds.length > 0) {
            const validMembers = await User.countDocuments({
                _id: { $in: payload.memberIds },
                companyId: req.companyId
            });
            if (validMembers !== payload.memberIds.length) {
                return res.status(403).json({
                    error: "Violation d'isolation : Utilisateur externe détecté dans l'équipe."
                });
            }
        }

        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            payload,
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
        await require('../models/Notification').deleteMany({ projectId: req.params.id, companyId: req.companyId });
        res.json({ message: "Projet et ses tâches associés supprimés." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
