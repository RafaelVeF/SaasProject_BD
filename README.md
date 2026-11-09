# NexusFlow SaaS – Outil de Gestion de Projet Multi-Tenant
> **TD1 : Architecture SaaS & Bases de Données NoSQL – PARTIE I**

Plateforme SaaS multi-tenant inspirée de Trello, Notion et ClickUp, développée avec Node.js, Express, Mongoose et MongoDB. L'application intègre une isolation logicielle stricte par entreprise (`companyId`) et anticipe l'architecture distribuée de la **Partie II (Sharding & Réplication)**.

---

## 🚀 Démarrage Rapide (Commande Unique)

Comme exigé par le sujet, l'application et sa base de données se démarrent avec **une seule commande** exécutée à la racine du projet, sans aucune installation locale de dépendances :

```bash
docker compose up -d --build
```
*(ou `docker-compose up -d --build` selon votre version de Docker)*

Une fois lancée, l'application est immédiatement accessible dans votre navigateur :
👉 **http://localhost:3000**

---

## ⚡ Données de Démonstration & Test de l'Isolation

Au premier chargement, deux entreprises de démonstration sont injectées automatiquement pour vous permettre d'évaluer immédiatement les fonctionnalités :
1. **Nebula Tech (SaaS Cloud)** : Équipe DevOps/CTO travaillant sur le projet *Cluster MongoDB Sharding*.
2. **GreenSolar Collectif** : Équipe produit travaillant sur le projet *Portail Autoconsommation*.

> Un bouton **⚡ Réinitialiser & Démo** dans l'en-tête permet à tout moment de réinitialiser la base et de recharger ce jeu de données propre en 1 clic.

### Valider l'Isolation Multi-Tenant :
1. Sélectionnez **Nebula Tech** dans le sélecteur en haut : vous visualisez ses collaborateurs (*Sarah Connor, Marc Levy*), ses projets et son tableau Kanban.
2. Basculez sur **GreenSolar Collectif** : l'interface se met à jour instantanément pour n'afficher que ses données isolées (*Elena Rostova*, projet solaire). Aucun projet ou membre de Nebula Tech n'est visible.
3. Les requêtes API transmettent le header `X-Company-Id` et le middleware d'isolation rejette toute tentative d'assignation croisée.

---

## 📋 Fonctionnalités Implémentées

- **Isolation Logicielle Stricte (*Shared Database, Shared Schema*)** :
  - Clé de partitionnement `companyId` présente au premier niveau de chaque document (`users`, `projects`, `tasks`).
  - Filtrage systématique par middleware sur le header `X-Company-Id`.
  - Rejet HTTP 403 en cas de tentative d'affectation d'un utilisateur externe à un projet.
- **CRUD Complet** :
  - **Entreprises** : Création, modification de forfait (`FREE`, `PRO`, `ENTERPRISE`), suppression en cascade.
  - **Collaborateurs** : Ajout avec attribution automatique d'avatar couleur, rôle et email professionnel.
  - **Projets** : Espaces projets avec sélection d'équipe parmi les collaborateurs de l'entreprise.
  - **Tâches** : Création, assignation, tags, date d'échéance et priorisation.
- **Tableau Kanban Interactif** :
  - 4 colonnes d'avancement : *À faire*, *En cours*, *En revue*, *Terminé*.
  - **Glisser-Déposer (Drag & Drop)** natif avec mise à jour immédiate en base.
  - Badges de priorité colorés (*CRITICAL*, *HIGH*, *MEDIUM*, *LOW*).
  - Filtres dynamiques en direct par collaborateur assigné et par niveau de priorité.

---

## 🗄️ Anticipation de la Partie II (Sharding & Réplication)

L'architecture anticipe rigoureusement l'évolution vers un cluster MongoDB distribué :

1. **Shard Key Ciblée : `{ "companyId": 1, "_id": 1 }`** :
   - Garantit la colocalisation de l'ensemble des données d'un même client sur un unique shard physique.
   - Élimine le *Scatter-Gather* pour les opérations quotidiennes.
2. **Configuration Réseau Externalisée (`config.env`)** :
   - L'application lit exclusivement la variable d'environnement `MONGO_URI`.
   - Lors de la Partie II, il suffira de remplacer la chaîne de connexion dans `config.env` par celle du cluster répliqué ou des routeurs `mongos` (ex. `mongodb://mongos1:27017,mongos2:27017/nexusflow_saas?replicaSet=...`) et de relancer le conteneur.
   - **Aucune modification du code source n'est nécessaire.**

---

## 📦 Structure du Projet

```text
.
├── compose.yml                # Orchestration Docker Compose (MongoDB 7.0 + App)
├── docker-compose.yml         # Alias de compatibilité
├── Dockerfile                 # Conteneurisation Node.js ultra-légère (Alpine)
├── config.env                 # Configuration d'environnement centralisée
├── package.json               # Dépendances applicatives (Express, Mongoose, Cors)
├── server.js                  # Point d'entrée de l'application et serveur de fichiers statiques
├── src/
│   ├── middleware/tenant.js   # Middleware d'isolation multi-tenant stricte
│   ├── models/                # Modèles et schémas Mongoose (Company, User, Project, Task)
│   └── routes/                # Routes API REST (companies, users, projects, tasks, seed)
├── public/
│   └── index.html             # Frontend SPA moderne (Tailwind CSS, Drag & Drop)
├── SPEC_TECHNIQUE.md          # Livrable 1 : Spécification technique & modèle NoSQL
├── SPEC_FONCTIONNELLE.md       # Livrable 2 : Spécification fonctionnelle
├── README.md                  # Livrable 3 : Documentation d'utilisation
└── scripts/
    └── package-zip.sh         # Script de génération de l'archive de remise TD1
```

---

## 🧪 Exécution des Tests Locaux

Pour exécuter la suite de tests automatisée (validation des schémas, de l'isolation et des configurations) :

```bash
npm test
```
