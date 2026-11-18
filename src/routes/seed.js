const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

// POST /api/seed - Réinitialise et génère un jeu de données de démonstration multi-tenant
router.post('/', async (req, res) => {
    try {
        await Promise.all([
            Company.deleteMany({}),
            User.deleteMany({}),
            Project.deleteMany({}),
            Task.deleteMany({})
        ]);

        // Entreprise 1 : Nebula Tech (SaaS Cloud)
        const compA = await Company.create({
            name: 'Nebula Tech (SaaS Cloud)',
            plan: 'ENTERPRISE'
        });

        const uA1 = await User.create({
            companyId: compA._id,
            name: 'Sarah Connor',
            email: 'sarah@nebula.io',
            role: 'CTO',
            avatarColor: '#6366f1'
        });

        const uA2 = await User.create({
            companyId: compA._id,
            name: 'Marc Levy',
            email: 'marc@nebula.io',
            role: 'DevSecOps',
            avatarColor: '#3b82f6'
        });

        const projA = await Project.create({
            companyId: compA._id,
            name: 'Cluster MongoDB Sharding',
            description: "Préparation de l'architecture distribuée Partie II",
            memberIds: [uA1._id, uA2._id]
        });

        await Task.create([
            {
                companyId: compA._id,
                projectId: projA._id,
                assigneeId: uA1._id,
                title: 'Définir la Shard Key {companyId: 1}',
                description: 'Assurer la colocalisation des documents par entreprise sur le cluster',
                status: 'DONE',
                priority: 'CRITICAL',
                tags: ['Database', 'MongoDB', 'Architecture']
            },
            {
                companyId: compA._id,
                projectId: projA._id,
                assigneeId: uA2._id,
                title: 'Configurer le Docker Compose',
                description: 'Intégrer les routeurs mongos et les config servers',
                status: 'IN_PROGRESS',
                priority: 'HIGH',
                tags: ['DevOps', 'Docker']
            },
            {
                companyId: compA._id,
                projectId: projA._id,
                assigneeId: uA1._id,
                title: 'Tester le failover du Replica Set',
                description: 'Simuler la panne du nœud primaire et valider la réélection',
                status: 'TODO',
                priority: 'MEDIUM',
                tags: ['Testing', 'ReplicaSet']
            }
        ]);

        // Entreprise 2 : GreenSolar Collectif (Totalement isolée)
        const compB = await Company.create({
            name: 'GreenSolar Collectif',
            plan: 'PRO'
        });

        const uB1 = await User.create({
            companyId: compB._id,
            name: 'Elena Rostova',
            email: 'elena@greensolar.fr',
            role: 'Product Lead',
            avatarColor: '#10b981'
        });

        const projB = await Project.create({
            companyId: compB._id,
            name: 'Portail Autoconsommation',
            description: 'Calculateur de répartition énergétique solaire pour collectivités',
            memberIds: [uB1._id]
        });

        await Task.create([
            {
                companyId: compB._id,
                projectId: projB._id,
                assigneeId: uB1._id,
                title: 'Valider les courbes de charge Enedis',
                description: 'Intégration API de télémétrie des compteurs Linky',
                status: 'IN_PROGRESS',
                priority: 'HIGH',
                tags: ['Energie', 'API']
            },
            {
                companyId: compB._id,
                projectId: projB._id,
                assigneeId: uB1._id,
                title: 'Design du dashboard client',
                description: 'Créer les graphiques de production en temps réel',
                status: 'TODO',
                priority: 'MEDIUM',
                tags: ['UI', 'Frontend']
            }
        ]);

        res.json({
            message: 'Données de démonstration générées avec succès !',
            companies: [compA, compB]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
