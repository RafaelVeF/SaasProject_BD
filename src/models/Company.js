const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Le nom de l'entreprise est obligatoire"],
        trim: true
    },
    plan: {
        type: String,
        enum: ['FREE', 'PRO', 'ENTERPRISE'],
        default: 'PRO'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Company', companySchema);
