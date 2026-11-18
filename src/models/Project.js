const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, "L'identifiant de l'entreprise est obligatoire"],
        immutable: true,
        index: true
    },
    name: {
        type: String,
        required: [true, "Le nom du projet est obligatoire"],
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    memberIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

projectSchema.index({ companyId: 1, _id: 1 });

module.exports = mongoose.model('Project', projectSchema);
