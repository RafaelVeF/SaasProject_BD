# Spécification Technique & Modélisation NoSQL (MongoDB)
## Plateforme SaaS Multi-Tenant : NexusFlow (TD1 - Partie I)

---

## 1. Principes d'Architecture & Stratégie Multi-Tenant

### 1.1 Modèle Multi-Tenant : Isolation Logique Stricte (*Shared Database, Shared Schema*)
Dans cette architecture SaaS, toutes les données résident au sein d'une même base de données MongoDB, optimisant la mutualisation des ressources matérielles, la simplicité opérationnelle et les coûts d'hébergement.

Pour garantir une **isolation logique étanche entre les entreprises** :
- **Clé de cloisonnement (`companyId`)** : Présente obligatoirement comme attribut de premier niveau dans toutes les collections filles (`users`, `projects`, `tasks`).
- **Filtrage automatique par middleware (`requireTenant`)** : Chaque requête d'API (lecture, écriture, modification, suppression) inspecte le header `X-Company-Id` et filtre systématiquement les opérations MongoDB par ce contexte d'entreprise.
- **Validation anti-fuite inter-entreprises** : Lors de l'assignation de membres à un projet ou à une tâche, l'API valide en amont que chaque identifiant d'utilisateur appartient strictement au `companyId` actif. Tout écart renvoie immédiatement un code HTTP `403 Forbidden`.

### 1.2 Anticipation du Sharding & de la Montée en Charge (Partie II)
> [!IMPORTANT]
> **Shard Key ciblée : `{ "companyId": 1, "_id": 1 }`**
>
> 1. **Colocalisation des données (*Targeted Queries*)** : Grâce au préfixe `companyId`, l'intégralité des documents appartenant à une même entreprise (collaborateurs, projets, tâches Kanban) est physiquement routée vers le **même fragment (shard)**.
> 2. **Élimination du *Scatter-Gather*** : Les requêtes opérationnelles quotidiennes (chargement d'un projet, navigation dans le Kanban) ciblent un seul shard plutôt que d'interroger l'ensemble des nœuds du cluster distribué.
> 3. **Connexion agnostique du code source** : L'application lit exclusivement la chaîne de connexion depuis la variable d'environnement `MONGO_URI` (dans `config.env`). Le passage en Partie II à un Replica Set (`replicaSet=rs0`) ou un cluster sharded via des routeurs `mongos` se fait sans aucune modification du code source.

---

## 2. Modélisation Détaillée des Collections (Structures JSON)

### 2.1 Collection `companies` (Entreprises / Tenants)
Représente l'entité juridique et organisationnelle souscrivant au service SaaS.

```json
{
  "_id": { "$oid": "670d1a000000000000000001" },
  "name": "Nebula Tech (SaaS Cloud)",
  "plan": "ENTERPRISE",
  "createdAt": { "$date": "2026-10-14T16:00:00Z" }
}
```

### 2.2 Collection `users` (Collaborateurs)
Collaborateurs rattachés obligatoirement à une entreprise hôte.

```json
{
  "_id": { "$oid": "670d1b000000000000000010" },
  "companyId": { "$oid": "670d1a000000000000000001" },
  "name": "Sarah Connor",
  "email": "sarah@nebula.io",
  "role": "CTO",
  "avatarColor": "#6366f1",
  "createdAt": { "$date": "2026-10-14T16:05:00Z" }
}
```

### 2.3 Collection `projects` (Espaces Projets)
Espace de travail regroupant une équipe de collaborateurs et un ensemble de tâches Kanban.

```json
{
  "_id": { "$oid": "670d1c000000000000000020" },
  "companyId": { "$oid": "670d1a000000000000000001" },
  "name": "Cluster MongoDB Sharding",
  "description": "Préparation de l'architecture distribuée Partie II",
  "memberIds": [
    { "$oid": "670d1b000000000000000010" },
    { "$oid": "670d1b000000000000000011" }
  ],
  "createdAt": { "$date": "2026-10-14T16:10:00Z" }
}
```

### 2.4 Collection `tasks` (Tâches & Tableau Kanban)
Unités de travail visualisables et déplaçables au sein du tableau Kanban.

```json
{
  "_id": { "$oid": "670d1d000000000000000030" },
  "companyId": { "$oid": "670d1a000000000000000001" },
  "projectId": { "$oid": "670d1c000000000000000020" },
  "assigneeId": { "$oid": "670d1b000000000000000010" },
  "title": "Définir la Shard Key {companyId: 1}",
  "description": "Assurer la colocalisation des documents par entreprise sur le cluster",
  "status": "DONE",
  "priority": "CRITICAL",
  "tags": ["Database", "MongoDB", "Architecture"],
  "dueDate": { "$date": "2026-10-25T00:00:00Z" },
  "createdAt": { "$date": "2026-10-14T16:15:00Z" }
}
```

---

## 3. Stratégie d'Indexation & Optimisation

Les index respectent rigoureusement la **règle du préfixe `companyId`** afin de garantir des requêtes ciblées et d'éviter les scans complets de collection (*COLLSCAN*) :

| Collection | Spécification de l'index | Rôle & Justification |
| :--- | :--- | :--- |
| **`companies`** | `{ "_id": 1 }` *(Index primaire)* | Résolution directe et validation rapide de l'existence de l'entreprise. |
| **`users`** | `{ "companyId": 1, "email": 1 }` *(Unique)* | Unicité de l'email au sein de chaque tenant (permet le même email dans deux entreprises différentes si nécessaire). |
| **`projects`** | `{ "companyId": 1, "_id": 1 }` | Alignement avec la Shard Key cible pour un routage direct vers le shard de l'entreprise. |
| **`tasks`** | `{ "companyId": 1, "projectId": 1, "status": 1 }` | Index composite couvrant pour charger instantanément les 4 colonnes Kanban d'un projet sans Scatter-Gather. |

---

## 4. Configuration Réseau & Transition vers la Partie II

L'application s'appuie sur le fichier `config.env` :
```env
PORT=3000
MONGO_URI=mongodb://mongodb:27017/nexusflow_saas?directConnection=true
MONGO_MAX_POOL_SIZE=20
MONGO_TIMEOUT_MS=5000
```

Pour la **Partie II (Sharding et Réplication)** :
- La chaîne de connexion sera simplement mise à jour vers les routeurs `mongos` ou les replica sets :
  `MONGO_URI=mongodb://mongos1:27017,mongos2:27017/nexusflow_saas?replicaSet=...`
- **Aucune ligne de code source n'aura besoin d'être modifiée.**
