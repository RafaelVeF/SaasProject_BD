const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const requireTenant = require('../middleware/tenant');
const { taskPayload, changesFor, actorFor, notifySafely } = require('../utils/taskActivity');

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
        req.body = taskPayload(req.body);
        const actor = await actorFor(req);

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
            assigneeId: assigneeIds[0] || null,
            history: [{ ...actor, action: 'created', changes: [] }]
        });
        await notifySafely(task, assigneeIds, actor, 'assignment');

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
        req.body = taskPayload(req.body);
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

        const task = await Task.findOne({ _id: req.params.id, companyId: req.companyId });
        if (!task) return res.status(404).json({ error: "Tâche introuvable." });
        const actor = await actorFor(req);
        const previousAssignees = (task.assigneeIds?.length ? task.assigneeIds : [task.assigneeId].filter(Boolean)).map(String);
        const before = task.toObject();
        task.set(req.body);
        // Compare cast/trimmed values, not raw input, so history matches persisted data.
        const normalized = Object.fromEntries(Object.keys(req.body).map(field => [field, task.get(field)]));
        const changes = changesFor(before, normalized);
        if (changes.length) task.history.push({ ...actor, action: 'updated', changes });
        await task.save();
        const newAssignees = (task.assigneeIds || []).filter(id => !previousAssignees.includes(String(id)));
        await notifySafely(task, newAssignees, actor, 'assignment');
        await task.populate([
            { path: 'assigneeId', select: 'name email role avatarColor' },
            { path: 'assigneeIds', select: 'name email role avatarColor' },
            { path: 'comments.userId', select: 'name email role avatarColor' }
        ]);
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

        const actor = await actorFor(req);
        const authorName = actor.actorName;
        const userId = actor.actorId;
        const recipients = [
            ...(task.assigneeIds || []), task.assigneeId,
            ...(task.comments || []).map(comment => comment.userId)
        ];

        task.comments.push({
            userId,
            authorName,
            text: req.body.text.trim(),
            createdAt: new Date()
        });
        task.history.push({ ...actor, action: 'commented', changes: [] });

        await task.save();
        await notifySafely(task, recipients, actor, 'comment');
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
        await require('../models/Notification').deleteMany({ taskId: req.params.id, companyId: req.companyId });
        res.json({ message: "Tâche supprimée." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
