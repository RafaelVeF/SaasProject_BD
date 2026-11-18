const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const requireTenant = require('../middleware/tenant');

router.use(requireTenant);

// GET /api/projects/:projectId/tasks - Tâches d'un projet pour l'entreprise
router.get('/projects/:projectId/tasks', async (req, res) => {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.projectId)) {
        return res.status(400).json({ error: "Identifiant de projet invalide." });
    }
    try {
        const tasks = await Task.find({
            companyId: req.companyId,
            projectId: req.params.projectId
        })
            .populate('assigneeId', 'name email role avatarColor')
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/projects/:projectId/tasks - Créer une tâche
router.post('/projects/:projectId/tasks', async (req, res) => {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.projectId)) {
        return res.status(400).json({ error: "Identifiant de projet invalide." });
    }
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            companyId: req.companyId
        });
        if (!project) {
            return res.status(404).json({ error: "Projet introuvable dans cette entreprise." });
        }

        // Valider l'assigné s'il est fourni
        if (req.body.assigneeId) {
            const validUser = await User.exists({
                _id: req.body.assigneeId,
                companyId: req.companyId
            });
            if (!validUser) {
                return res.status(403).json({ error: "L'assigné n'appartient pas à cette entreprise." });
            }
        }

        delete req.body._id;
        const task = await Task.create({
            ...req.body,
            companyId: req.companyId,
            projectId: req.params.projectId
        });

        const populated = await task.populate('assigneeId', 'name email role avatarColor');
        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/tasks/:id - Modifier une tâche (statut, assigné, priorité...)
router.put('/tasks/:id', async (req, res) => {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Identifiant de tâche invalide." });
    }
    try {
        delete req.body.companyId;
        delete req.body.projectId;
        delete req.body._id;

        if (req.body.assigneeId) {
            const validUser = await User.exists({
                _id: req.body.assigneeId,
                companyId: req.companyId
            });
            if (!validUser) {
                return res.status(403).json({ error: "L'assigné n'appartient pas à cette entreprise." });
            }
        }

        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            req.body,
            { new: true, runValidators: true }
        ).populate('assigneeId', 'name email role avatarColor');

        if (!task) return res.status(404).json({ error: "Tâche introuvable." });
        res.json(task);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/tasks/:id - Supprimer une tâche
router.delete('/tasks/:id', async (req, res) => {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Identifiant de tâche invalide." });
    }
    try {
        const deleted = await Task.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });
        if (!deleted) return res.status(404).json({ error: "Tâche introuvable." });
        res.json({ message: "Tâche supprimée." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
