const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, immutable: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    type: { type: String, enum: ['assignment', 'comment'], required: true },
    message: { type: String, required: true },
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});
notificationSchema.index({ companyId: 1, userId: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', notificationSchema);
