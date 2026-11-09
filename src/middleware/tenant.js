const mongoose = require('mongoose');
const Company = require('../models/Company');

const requireTenant = async (req, res, next) => {
    const companyId = req.headers['x-company-id'];
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({
            error: "Header X-Company-Id valide requis pour l'isolation multi-tenant."
        });
    }

    try {
        const exists = await Company.exists({ _id: companyId });
        if (!exists) {
            return res.status(404).json({ error: "Entreprise introuvable." });
        }

        req.companyId = companyId;
        next();
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

module.exports = requireTenant;
