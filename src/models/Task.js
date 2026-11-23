const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, "L'identifiant de l'entreprise est obligatoire"],
        immutable: true,
        index: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, "L'identifiant du projet est obligatoire"],
        immutable: true,
        index: true
    },
    assigneeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assigneeIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        authorName: {
            type: String,
            default: 'Anonyme'
        },
        text: {
            type: String,
            required: true,
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    title: {
        type: String,
        required: [true, "Le titre de la tâche est obligatoire"],
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    status: {
        type: String,
        enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'],
        default: 'TODO'
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM'
    },
    tags: [{
        type: String,
        trim: true
    }],
    dueDate: {
        type: Date,
        default: null
    },
    history: [{
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        actorName: { type: String, required: true },
        action: { type: String, enum: ['created', 'updated', 'commented'], required: true },
        changes: [{ _id: false, field: String, before: String, after: String }],
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { optimisticConcurrency: true });

taskSchema.index({ companyId: 1, projectId: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
