const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, "L'identifiant de l'entreprise est obligatoire"],
        index: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, "L'identifiant du projet est obligatoire"],
        index: true
    },
    assigneeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

taskSchema.index({ companyId: 1, projectId: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
