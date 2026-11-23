const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');

const editableFields = ['title', 'description', 'status', 'priority', 'tags', 'dueDate', 'assigneeIds', 'assigneeId'];
function taskPayload(body) {
    const payload = {};
    for (const key of editableFields) {
        if (Object.hasOwn(body, key)) payload[key] = body[key];
    }
    if (Object.hasOwn(payload, 'tags')) {
        payload.tags = Array.isArray(payload.tags)
            ? [...new Set(payload.tags.map(tag => String(tag).trim()).filter(Boolean))]
            : [];
    }
    if (Object.hasOwn(payload, 'assigneeIds')) {
        payload.assigneeIds = Array.isArray(payload.assigneeIds)
            ? [...new Set(payload.assigneeIds.filter(Boolean).map(String))]
            : [];
    }
    if (Object.hasOwn(payload, 'dueDate')) {
        if (payload.dueDate === '' || payload.dueDate === null) payload.dueDate = null;
        else {
            const value = String(payload.dueDate);
            const day = value.slice(0, 10);
            const parsed = new Date(`${day}T00:00:00.000Z`);
            if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) ||
                Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) {
                throw new Error("La date d’échéance est invalide.");
            }
            payload.dueDate = parsed;
        }
    }
    return payload;
}
function printable(value) {
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (Array.isArray(value)) return value.map(item => String(item._id || item)).sort().join(', ');
    return String(value);
}
function changesFor(task, payload) {
    return Object.entries(payload).filter(([field]) => field !== 'assigneeId')
        .map(([field, value]) => ({ field, before: printable(task[field]), after: printable(value) }))
        .filter(change => change.before !== change.after);
}
async function actorFor(req) {
    const id = req.get('X-User-Id');
    if (!id) return { actorId: null, actorName: 'Collaborateur' };
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Identifiant utilisateur invalide.');
    const actor = await User.findOne({ _id: id, companyId: req.companyId });
    if (!actor) throw new Error("L’auteur n’appartient pas à cette entreprise.");
    return { actorId: actor._id, actorName: actor.name };
}
async function notify(task, recipients, actor, type) {
    const ids = [...new Set(recipients.filter(Boolean).map(id => String(id._id || id)))]
        .filter(id => id !== String(actor.actorId));
    if (!ids.length) return;
    const users = await User.find({ companyId: task.companyId, _id: { $in: ids } }).select('_id');
    if (!users.length) return;
    await Notification.insertMany(users.map(user => ({
        companyId: task.companyId, userId: user._id, projectId: task.projectId, taskId: task._id, type,
        message: type === 'assignment' ? `${actor.actorName} vous a assigné : ${task.title}` :
            `${actor.actorName} a commenté : ${task.title}`
    })));
}
// Notification delivery is secondary: a failure must not disguise a successful task mutation.
async function notifySafely(...args) {
    try { await notify(...args); }
    catch (error) { console.error('[Notifications] Échec de livraison :', error.message); }
}
module.exports = { taskPayload, changesFor, actorFor, notifySafely };
