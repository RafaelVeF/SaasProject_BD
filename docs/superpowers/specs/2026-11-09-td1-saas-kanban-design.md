# Spécification de Conception : TD1 SaaS Kanban Multi-Tenant (Partie I)

**Date :** 2026-11-09  
**Branche :** `feat/td1-unified-saas`  
**Statut :** En attente d'approbation

---

## 1. Contexte & Objectif

L'objectif de ce projet est de réaliser l'ensemble des livrables de la **Partie I du TD1 : Outil de gestion de projet SaaS multi-tenant** (baptisé *NexusFlow SaaS*), inspiré de Trello, Notion et ClickUp, tout en anticipant rigoureusement la **Partie II (Sharding et Réplication MongoDB)**.

### Livrables exigés :
1. **Spécification technique** (`SPEC_TECHNIQUE.md` / `Architecture_BD.md`) : Modélisation NoSQL MongoDB, structures JSON complètes, isolation stricte, anticipation de la clé de sharding et des indexes composites.
2. **Spécification fonctionnelle** (`SPEC_FONCTIONNELLE.md` / `Architecture_Fonctionnelle.md`) : Parcours utilisateur, sélecteur d'espace de travail (tenant switcher), règles d'isolation, CRUD Entreprises / Utilisateurs / Projets / Tâches, et Kanban interactif.
3. **Application conteneurisée & livrable code** :
   - Fichiers `Dockerfile`, `compose.yml`, `config.env`, `package.json`, `server.js`, `public/index.html`, `README.md`.
   - Démarrage instantané en une commande : `docker compose up -d --build`.
   - Zéro dépendance locale ou configuration manuelle préalable requise.
   - Script / archive zip prête pour la remise.

---

## 2. Approches & Choix d'Architecture

### Approches envisagées :
- **Approche 1 (Retenue - Option 1 unifiée) :** Stack Node.js + Express 5 + Mongoose servant directement une SPA interactive (HTML5 / Tailwind CSS / Vanilla JS) via Express `static`.
  - *Avantages :* Un seul conteneur applicatif ultra-léger + un conteneur MongoDB (`mongo:7.0`), aucun pipeline de compilation frontend complexe, démarrage garanti en moins de 10 secondes avec `docker compose up -d --build`, zéro problème de CORS ou d'adresses inter-conteneurs, conformité exacte aux exigences de l'archive zip du sujet.
- **Approche 2 (Découplée MERN) :** Séparation `backend` (Express) et `frontend` (React 19 + Vite) sur deux ports distincts (5000 et 5173).
  - *Inconvénients :* Double conteneur applicatif, build Vite lourd, configuration de reverse proxy ou de CORS requise, risque d'échec au lancement chez le correcteur.

**Décision :** Approche 1 sélectionnée par l'utilisateur sur la branche dédiée `feat/td1-unified-saas`.

---

## 3. Spécifications Détaillées des Composants

### 3.1 Base de Données MongoDB & Multi-Tenancy

- **Modèle multi-tenant :** *Shared Database, Shared Schema* avec isolation logique stricte.
- **Dénormalisation de la clé de partitionnement :** Le champ `companyId` est obligatoirement présent au 1er niveau de toutes les collections filles (`users`, `projects`, `tasks`).
- **Anticipation du Sharding (Partie II) :** Clé de sharding ciblée `{ companyId: 1, _id: 1 }` permettant de colocaliser toutes les données d'une même entreprise sur le même shard et d'éliminer le *scatter-gather*.
- **Collections & Schémas :**
  - `companies` : `{ _id, name, plan ('FREE'|'PRO'|'ENTERPRISE'), createdAt }`
  - `users` : `{ _id, companyId, name, email, role, avatarColor, createdAt }`
    - Index unique : `{ companyId: 1, email: 1 }`
  - `projects` : `{ _id, companyId, name, description, memberIds: [ObjectId], createdAt }`
    - Index : `{ companyId: 1, _id: 1 }`
  - `tasks` : `{ _id, companyId, projectId, assigneeId, title, description, status ('TODO'|'IN_PROGRESS'|'REVIEW'|'DONE'), priority ('LOW'|'MEDIUM'|'HIGH'|'CRITICAL'), tags: [String], dueDate, createdAt }`
    - Index composite : `{ companyId: 1, projectId: 1, status: 1 }`

### 3.2 Backend Express & Middleware d'Isolation

- **Connexion agnostique :** Utilisation stricte de `process.env.MONGO_URI` (défini dans `config.env`), avec `maxPoolSize` et `serverSelectionTimeoutMS`.
- **Middleware `requireTenant` :**
  - Vérifie la présence et la validité du header HTTP `X-Company-Id`.
  - Contrôle l'existence réelle de l'entreprise en base.
  - Injecte `req.companyId` dans la requête.
- **Sécurité inter-tenant :** Lors de la création d'un projet ou de l'assignation d'une tâche, validation stricte que les utilisateurs appartiennent bien à `req.companyId`.
- **Suppression en cascade :**
  - La suppression d'une entreprise supprime immédiatement l'ensemble de ses utilisateurs, projets et tâches.
  - La suppression d'un projet supprime ses tâches.
  - La suppression d'un utilisateur le retire des `memberIds` des projets et désassigne ses tâches.
- **Endpoint Démo (`POST /api/seed`) :** Réinitialise et injecte en 1 clic 2 entreprises témoins (*Nebula Tech* et *GreenSolar Collectif*) avec projets, collaborateurs et tâches pour tester l'isolation sans saisie manuelle.

### 3.3 Interface Utilisateur SPA (`public/index.html`)

- **Design System :** Tailwind CSS moderne (thème sombre ardoise / indigo).
- **En-tête Tenant Switcher :**
  - Sélecteur déroulant de l'entreprise active.
  - Bouton d'ajout d'entreprise (`openCompanyModal`).
  - Bouton de suppression de l'entreprise courante avec confirmation.
  - Bouton de réinitialisation / injection de données de démo (`seedDemoData`).
- **Barre Latérale Gauche :**
  - Gestion des projets : liste, statut actif, avatars des membres assignés, bouton d'ajout de projet avec sélection multi-membres, bouton de suppression.
  - Gestion des collaborateurs : liste avec avatars colorés, rôles, emails, bouton d'ajout et suppression.
- **Tableau Kanban Central :**
  - 4 colonnes de statut : *À faire (TODO)*, *En cours (IN_PROGRESS)*, *En revue (REVIEW)*, *Terminé (DONE)*.
  - Drag & Drop natif HTML5 pour déplacer les cartes d'une colonne à l'autre.
  - Filtres dynamiques : filtre instantané par membre assigné et par niveau de priorité.
  - Cartes de tâches : badges de priorité colorés (Critique, Haute, Moyenne, Basse), tags, avatar de l'assigné, sélecteur rapide de statut, boutons de modification (modal) et de suppression.
- **Système de Modales :**
  - Modale dynamique pour la création/édition des Entreprises, Utilisateurs, Projets et Tâches.

### 3.4 Conteneurisation & Déploiement

- **`compose.yml` (et `docker-compose.yml`) :**
  - Service `mongodb` : image `mongo:7.0`, volume persistant `mongo_data`, réseau dédié `saas-network`, healthcheck `mongosh --eval "db.adminCommand('ping')"`.
  - Service `app` : build du `Dockerfile`, port 3000:3000, `env_file: config.env`, dépend de `mongodb` avec `condition: service_healthy`.
- **`config.env` :**
  - `PORT=3000`
  - `MONGO_URI=mongodb://mongodb:27017/nexusflow_saas?directConnection=true`
  - `MONGO_MAX_POOL_SIZE=20`
  - `MONGO_TIMEOUT_MS=5000`
- **`Dockerfile` :** Base `node:20-alpine`, copie de `package.json`, `npm install --omit=dev`, copie de `server.js` et `public/`, exposition du port 3000, commande `node server.js`.

---

## 4. Plan de Validation & Vérification

1. **Vérification syntaxique et unitaire locale :**
   - Lancement de `node server.js` et tests des routes API avec seed de démonstration.
   - Validation de l'isolation logique : vérifier qu'un projet ou une tâche de l'entreprise B n'est jamais accessible avec le header `X-Company-Id` de l'entreprise A.
2. **Vérification de la conteneurisation :**
   - Validation de la configuration `compose.yml` et du `Dockerfile`.
3. **Vérification des livrables documentaires :**
   - Présence et exhaustivité de `SPEC_TECHNIQUE.md` / `Architecture_BD.md` et `SPEC_FONCTIONNELLE.md` / `Architecture_Fonctionnelle.md`.
   - `README.md` complet avec guide de démarrage en 1 commande.
