const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const requireTenant = require('../middleware/tenant');

// GET /api/projects/:projectId/tasks - Tâches d'un projet pour l'entreprise
router.get('/projects/:projectId/tasks', requireTenant, async (req, res) => {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.projectId)) {
        return res.status(400).json({ error: "Identifiant de projet invalide." });
    }
    try {
        const tasks = await Task.find({
            companyId: req.companyId,
            projectId: req.params.projectId
        })
            .populate('assigneeId', 'name email role avatarColor')
            .populate('assigneeIds', 'name email role avatarColor')
            .populate('comments.userId', 'name email role avatarColor')
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/projects/:projectId/tasks - Créer une tâche (multi-assignation et validation)
router.post('/projects/:projectId/tasks', requireTenant, async (req, res) => {
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

        // Harmonisation multi-assignation
        let assigneeIds = [];
        if (Array.isArray(req.body.assigneeIds)) {
            assigneeIds = req.body.assigneeIds.filter(Boolean);
        } else if (req.body.assigneeId) {
            assigneeIds = [req.body.assigneeId];
        }

        if (assigneeIds.length > 0) {
            const validCount = await User.countDocuments({
                _id: { $in: assigneeIds },
                companyId: req.companyId
            });
            if (validCount !== assigneeIds.length) {
                return res.status(403).json({ error: "Violation d'isolation : Un ou plusieurs collaborateurs n'appartiennent pas à cette entreprise." });
            }
        }

        delete req.body._id;
        const task = await Task.create({
            ...req.body,
            companyId: req.companyId,
            projectId: req.params.projectId,
            assigneeIds: assigneeIds,
            assigneeId: assigneeIds[0] || null
        });

        const populated = await task.populate([
            { path: 'assigneeId', select: 'name email role avatarColor' },
            { path: 'assigneeIds', select: 'name email role avatarColor' },
            { path: 'comments.userId', select: 'name email role avatarColor' }
        ]);
        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/tasks/:id - Modifier une tâche (statut, priorité, multi-assignation...)
router.put('/tasks/:id', requireTenant, async (req, res) => {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Identifiant de tâche invalide." });
    }
    try {
        delete req.body.companyId;
        delete req.body.projectId;
        delete req.body._id;

        if (req.body.assigneeIds !== undefined) {
            const assigneeIds = Array.isArray(req.body.assigneeIds) ? req.body.assigneeIds.filter(Boolean) : [];
            if (assigneeIds.length > 0) {
                const validCount = await User.countDocuments({
                    _id: { $in: assigneeIds },
                    companyId: req.companyId
                });
                if (validCount !== assigneeIds.length) {
                    return res.status(403).json({ error: "Violation d'isolation : Collaborateur externe détecté." });
                }
            }
            req.body.assigneeIds = assigneeIds;
            req.body.assigneeId = assigneeIds[0] || null;
        } else if (req.body.assigneeId !== undefined) {
            if (req.body.assigneeId) {
                const validUser = await User.exists({
                    _id: req.body.assigneeId,
                    companyId: req.companyId
                });
                if (!validUser) {
                    return res.status(403).json({ error: "L'assigné n'appartient pas à cette entreprise." });
                }
                req.body.assigneeIds = [req.body.assigneeId];
            } else {
                req.body.assigneeIds = [];
            }
        }

        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            req.body,
            { new: true, runValidators: true }
        )
            .populate('assigneeId', 'name email role avatarColor')
            .populate('assigneeIds', 'name email role avatarColor')
            .populate('comments.userId', 'name email role avatarColor');

        if (!task) return res.status(404).json({ error: "Tâche introuvable." });
        res.json(task);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/tasks/:id/comments - Ajouter un message/commentaire (chat de tâche)
router.post('/tasks/:id/comments', requireTenant, async (req, res) => {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Identifiant de tâche invalide." });
    }
    if (!req.body.text || !req.body.text.trim()) {
        return res.status(400).json({ error: "Le texte du commentaire est requis." });
    }

    try {
        const task = await Task.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!task) return res.status(404).json({ error: "Tâche introuvable." });

        let authorName = req.body.authorName || 'Collaborateur';
        let userId = null;

        if (req.body.userId && require('mongoose').Types.ObjectId.isValid(req.body.userId)) {
            const user = await User.findOne({ _id: req.body.userId, companyId: req.companyId });
            if (user) {
                authorName = user.name;
                userId = user._id;
            }
        }

        task.comments.push({
            userId,
            authorName,
            text: req.body.text.trim(),
            createdAt: new Date()
        });

        await task.save();
        const populated = await task.populate([
            { path: 'assigneeId', select: 'name email role avatarColor' },
            { path: 'assigneeIds', select: 'name email role avatarColor' },
            { path: 'comments.userId', select: 'name email role avatarColor' }
        ]);

        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/tasks/:id - Supprimer une tâche
router.delete('/tasks/:id', requireTenant, async (req, res) => {
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
