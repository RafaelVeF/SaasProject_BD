const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const requireTenant = require('../middleware/tenant');

router.use(requireTenant);

// GET /api/users - Liste des collaborateurs du tenant
router.get('/', async (req, res) => {
    try {
        const users = await User.find({ companyId: req.companyId }).sort({ name: 1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users - Ajouter un collaborateur
router.post('/', async (req, res) => {
    try {
        const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const user = await User.create({
            ...req.body,
            companyId: req.companyId,
            avatarColor: req.body.avatarColor || randomColor
        });
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/users/:id - Modifier un collaborateur
router.put('/:id', async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId },
            req.body,
            { new: true, runValidators: true }
        );
        if (!user) return res.status(404).json({ error: "Utilisateur non trouvé dans cette entreprise." });
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/users/:id - Retirer un collaborateur
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const deleted = await User.findOneAndDelete({ _id: userId, companyId: req.companyId });
        if (!deleted) return res.status(404).json({ error: "Utilisateur introuvable." });

        await Promise.all([
            Project.updateMany({ companyId: req.companyId }, { $pull: { memberIds: userId } }),
            Task.updateMany({ companyId: req.companyId, assigneeId: userId }, { $set: { assigneeId: null } })
        ]);
        res.json({ message: "Utilisateur retiré et tâches désassignées." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
