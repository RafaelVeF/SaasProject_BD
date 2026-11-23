const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const requireTenant = require('../middleware/tenant');
const router = express.Router();
router.use(requireTenant);
router.use(async (req, res, next) => {
    const id = req.get('X-User-Id');
    if (!mongoose.Types.ObjectId.isValid(id || '')) return res.status(400).json({ error: 'Utilisateur requis.' });
    try {
        if (!await User.exists({ _id: id, companyId: req.companyId })) {
            return res.status(403).json({ error: 'Utilisateur externe à cette entreprise.' });
        }
        req.notificationUserId = id;
        next();
    } catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/', async (req, res) => {
    try {
        const filter = { companyId: req.companyId, userId: req.notificationUserId };
        const [items, unreadCount] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1, _id: -1 }).limit(100),
            Notification.countDocuments({ ...filter, readAt: null })
        ]);
        res.json({ items, unreadCount });
    } catch (error) { res.status(500).json({ error: error.message }); }
});
router.put('/read-all', async (req, res) => {
    try {
        await Notification.updateMany(
            { companyId: req.companyId, userId: req.notificationUserId, readAt: null },
            { $set: { readAt: new Date() } }
        );
        res.json({ message: 'Notifications lues.' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});
router.put('/:id/read', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Notification invalide.' });
    try {
        const item = await Notification.findOneAndUpdate(
            { _id: req.params.id, companyId: req.companyId, userId: req.notificationUserId },
            { $set: { readAt: new Date() } }, { new: true }
        );
        if (!item) return res.status(404).json({ error: 'Notification introuvable.' });
        res.json(item);
    } catch (error) { res.status(500).json({ error: error.message }); }
});
module.exports = router;
