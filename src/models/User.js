const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, "L'identifiant de l'entreprise est obligatoire"],
        index: true
    },
    name: {
        type: String,
        required: [true, "Le nom de l'utilisateur est obligatoire"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "L'email est obligatoire"],
        trim: true,
        lowercase: true
    },
    role: {
        type: String,
        default: 'Membre',
        trim: true
    },
    avatarColor: {
        type: String,
        default: '#6366f1'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.index({ companyId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
