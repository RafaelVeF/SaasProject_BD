# Spécification Technique & Modélisation NoSQL (MongoDB)
## Plateforme SaaS Multi-Tenant de Gestion de Projet

---

## 1. Principes d'Architecture & Stratégie Multi-Tenant

### 1.1 Isolation Logicielle Stricte (*Shared Database, Shared Schema*)
Dans ce modèle SaaS, toutes les données résident au sein d'une même base de données MongoDB, optimisant ainsi les coûts et la scalabilité.
Pour garantir une **isolation logique et étanche entre les entreprises** :
- **Clé de cloisonnement (`companyId`)** : Présente obligatoirement comme attribut de premier niveau dans toutes les collections filles (`users`, `projects`, `tasks`, `audit_logs`, `invitations`).
- **Filtrage automatique** : Chaque requête d'API (lecture, écriture, suppression) filtre obligatoirement sur le contexte `companyId` extrait du token JWT de l'utilisateur connecté.

### 1.2 Anticipation du Sharding & de la Montée en Charge (Évolution TD Partie 2)
> [!IMPORTANT]
> **Shard Key ciblée : `{ "companyId": 1, "_id": 1 }`**
> - **Colocalisation des données** : Grâce au préfixe `companyId`, l'intégralité des documents appartenant à un même tenant (projets, tâches, membres) est routée vers le **même fragment physique (shard)**.
> - **Élimination du *Scatter-Gather*** : Les requêtes opérationnelles quotidiennes (ex. affichage d'un tableau Kanban) ciblent un seul shard plutôt que d'interroger l'ensemble du cluster distribué.
> - **Connexion agnostic du code source** : La connexion s'appuie sur la variable d'environnement `MONGO_URI` (dans `.env` / `docker-compose.yml`), permettant une transition transparente vers un Replica Set (`replicaSet=rs0`) ou un cluster sharded via des routeurs `mongos`.

---

## 2. Modélisation Détaillée des Collections (Structures JSON)

### 2.1 Collection `companies` (Entreprises / Tenants)
Représente l'entité juridique et organisationnelle souscrivant au service SaaS.

```json
{
  "_id": { "$oid": "670d1a000000000000000001" },
  "name": "Acme Cloud Corp",
  "slug": "acme-cloud",
  "siren": "123456789",
  "apeNum": "6201Z",
  "address": "12 rue de la Paix, 75002 Paris",
  "telephoneNumber": "+33140000000",
  "billingEmail": "billing@acme.io",
  "plan": "ENTERPRISE",
  "status": "ACTIVE",
  "createdAt": { "$date": "2026-10-14T16:00:00Z" },
  "updatedAt": { "$date": "2026-10-14T16:00:00Z" }
}
```

---

### 2.2 Collection `users` (Utilisateurs)
Collaborateurs rattachés obligatoirement à une entreprise hôte.

```json
{
  "_id": { "$oid": "670d1b000000000000000010" },
  "companyId": { "$oid": "670d1a000000000000000001" },
  "name": "Alice Martin",
  "email": "alice@acme.io",
  "passwordHash": "$2b$10$wN9aW6mH.K6b7S7XWvVb2.rQYV4f8X9wQk.v1k7Yv4g",
  "role": "ADMIN",
  "phoneNumber": "+33612345678",
  "birthDate": { "$date": "1994-05-12T00:00:00Z" },
  "avatarUrl": "https://cdn.saas.io/avatars/alice.png",
  "avatarColor": "#6366f1",
  "isActive": true,
  "isEmailVerified": true,
  "createdAt": { "$date": "2026-10-14T16:05:00Z" },
  "updatedAt": { "$date": "2026-10-14T16:05:00Z" }
}
```

---

### 2.3 Collection `projects` (Espaces Projets)
Cadre organisationnel regroupant les membres assignés et les tâches associées.

```json
{
  "_id": { "$oid": "670d1c000000000000000020" },
  "companyId": { "$oid": "670d1a000000000000000001" },
  "name": "Migration Kubernetes",
  "description": "Déploiement de l'infrastructure multi-nœuds et conteneurisation",
  "status": "ACTIVE",
  "dueDate": { "$date": "2026-12-31T23:59:59Z" },
  "createdBy": { "$oid": "670d1b000000000000000010" },
  "memberIds": [
    { "$oid": "670d1b000000000000000010" },
    { "$oid": "670d1b000000000000000011" }
  ],
  "createdAt": { "$date": "2026-10-14T16:10:00Z" },
  "updatedAt": { "$date": "2026-10-14T16:10:00Z" }
}
```

---

### 2.4 Collection `tasks` (Tâches & Vue Kanban)
Éléments unitaires de travail affichés en colonnes Kanban.

```json
{
  "_id": { "$oid": "670d1d000000000000000030" },
  "companyId": { "$oid": "670d1a000000000000000001" },
  "projectId": { "$oid": "670d1c000000000000000020" },
  "assigneeId": { "$oid": "670d1b000000000000000010" },
  "createdBy": { "$oid": "670d1b000000000000000010" },
  "title": "Configurer le Replica Set MongoDB",
  "description": "Préparer les scripts d'initialisation rs.initiate() et le fichier compose",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "position": 1024.0,
  "tags": ["Database", "DevOps", "Infrastructure"],
  "dueDate": { "$date": "2026-10-25T00:00:00Z" },
  "createdAt": { "$date": "2026-10-14T16:15:00Z" },
  "updatedAt": { "$date": "2026-10-15T09:30:00Z" }
}
```

> [!NOTE]
> **Champ `position: 1024.0` (Tri fractionnel)** : Permet de gérer le réordonnancement par *drag-and-drop* dans les colonnes Kanban en calculant une valeur médiane sans réécrire l'ensemble des tâches de la colonne.

---

### 2.5 Collection `audit_logs` (Traçabilité & Sécurité)
Historique immuable des actions critiques pour répondre aux exigences SaaS d'audit.

```json
{
  "_id": { "$oid": "670d1e000000000000000040" },
  "companyId": { "$oid": "670d1a000000000000000001" },
  "userId": { "$oid": "670d1b000000000000000010" },
  "action": "UPDATE",
  "entityType": "TASK",
  "entityId": { "$oid": "670d1d000000000000000030" },
  "changes": {
    "field": "status",
    "oldValue": "TODO",
    "newValue": "IN_PROGRESS"
  },
  "ipAddress": "192.168.1.45",
  "createdAt": { "$date": "2026-10-15T09:30:00Z" }
}
```

---

### 2.6 Collection `invitations` (Onboarding d'équipe)
Gestion des tokens d'invitation temporaires pour rejoindre un tenant.

```json
{
  "_id": { "$oid": "670d1f000000000000000050" },
  "companyId": { "$oid": "670d1a000000000000000001" },
  "email": "dev@acme.io",
  "role": "MEMBER",
  "token": "4a5c6d7e8f901a2b3c4d5e6f",
  "status": "PENDING",
  "expiresAt": { "$date": "2026-10-21T16:00:00Z" },
  "createdAt": { "$date": "2026-10-14T16:00:00Z" }
}
```

---

## 3. Stratégie d'Indexation & Optimisation des Requêtes

Les index appliquent systématiquement la **règle du préfixe `companyId`** afin de tirer pleinement parti des index locaux sur les shards et d'éviter les scans complets de collection.

| Collection | Spécification de l'index | Rôle & Justification |
| :--- | :--- | :--- |
| **`companies`** | `{ "slug": 1 }` *(Unique)* | Résolution de l'URL du tenant / domaine d'accès. |
| **`companies`** | `{ "siren": 1 }` *(Sparse, Unique)* | Déduplication légale des structures enregistrées. |
| **`users`** | `{ "companyId": 1, "email": 1 }` *(Unique)* | Unicité de l'email au sein de chaque entreprise. |
| **`projects`** | `{ "companyId": 1, "status": 1 }` | Filtrage rapide des projets actifs ou archivés par entreprise. |
| **`projects`** | `{ "companyId": 1, "memberIds": 1 }` | Index multi-clé pour lister les projets assignés à un collaborateur précis. |
| **`tasks`** | `{ "companyId": 1, "projectId": 1, "status": 1, "position": 1 }` | **Index composite couvrant** pour l'affichage instantané et le *drag & drop* Kanban. |
| **`tasks`** | `{ "companyId": 1, "assigneeId": 1 }` | Vue transversale "Mes Tâches" par utilisateur. |
| **`audit_logs`** | `{ "companyId": 1, "createdAt": -1 }` | Consultation chronologique décroissante de l'historique d'activité. |
| **`invitations`** | `{ "token": 1 }` *(Unique)* <br> `{ "companyId": 1, "email": 1 }` | Validation des liens reçus par email et contrôle d'invitations en double. |