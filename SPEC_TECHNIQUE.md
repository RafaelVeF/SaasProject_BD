# Spécification Technique & Modélisation NoSQL (MongoDB)
## Plateforme SaaS Multi-Tenant : NexusFlow (TD1 - Partie I)

---

## 1. Principes d'Architecture & Stratégie Multi-Tenant

### 1.1 Modèle Multi-Tenant : Isolation Logique Stricte (*Shared Database, Shared Schema*)
Dans cette architecture SaaS, toutes les données résident au sein d'une même base de données MongoDB, optimisant la mutualisation des ressources matérielles, la simplicité opérationnelle et les coûts d'hébergement.

Pour garantir une **isolation logique étanche entre les entreprises** :
- **Clé de cloisonnement (`companyId`)** : Présente obligatoirement et immuable au premier niveau des collections filles (`users`, `projects`, `tasks`, `notifications`).
- **Filtrage par middleware (`requireTenant`)** : Les routes des collections filles valident `X-Company-Id`, puis les opérations filtrent ce contexte. Les routes d'authentification, de gestion des entreprises et de seed ont un périmètre distinct ; le seed réinitialise globalement la base.
- **Validation anti-fuite inter-entreprises** : Lors de l'assignation de membres à un projet ou à une tâche, l'API valide en amont que chaque identifiant d'utilisateur appartient strictement au `companyId` actif. Tout écart renvoie immédiatement un code HTTP `403 Forbidden`.

### 1.2 Anticipation du Sharding & de la Montée en Charge (Partie II)
> [!IMPORTANT]
> **Shard Key ciblée : `{ "companyId": 1, "_id": 1 }`**
>
> 1. **État actuel** : MongoDB standalone, sans sharding activé.
> 2. **Placement et routage à valider** : Le préfixe `companyId` aide le ciblage, mais une même entreprise peut occuper plusieurs chunks et shards. La clé composée ne garantit ni une colocalisation complète ni l'absence de scatter-gather.
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
  "archived": false,
  "memberIds": [
    { "$oid": "670d1b000000000000000010" },
    { "$oid": "670d1b000000000000000011" }
  ],
  "createdAt": { "$date": "2026-10-14T16:10:00Z" }
}
```

### 2.4 Collection `tasks` (Tâches, Kanban & Fil de Discussion)
Unités de travail visualisables et déplaçables au sein du tableau Kanban, supportant la multi-assignation et l'embarquement (*Embedding NoSQL*) des commentaires de discussion.

```json
{
  "_id": { "$oid": "670d1d000000000000000030" },
  "companyId": { "$oid": "670d1a000000000000000001" },
  "projectId": { "$oid": "670d1c000000000000000020" },
  "assigneeId": { "$oid": "670d1b000000000000000010" },
  "assigneeIds": [
    { "$oid": "670d1b000000000000000010" },
    { "$oid": "670d1b000000000000000011" }
  ],
  "title": "Définir la Shard Key {companyId: 1}",
  "description": "Assurer la colocalisation des documents par entreprise sur le cluster",
  "status": "DONE",
  "priority": "CRITICAL",
  "tags": ["Database", "MongoDB", "Architecture"],
  "comments": [
    {
      "userId": { "$oid": "670d1b000000000000000010" },
      "authorName": "Sarah Connor",
      "text": "La shard key composite {companyId: 1, _id: 1} est validée pour la Partie II !",
      "createdAt": { "$date": "2026-10-14T16:20:00Z" }
    }
  ],
  "dueDate": { "$date": "2026-10-25T00:00:00Z" },
  "history": [
    {
      "actorId": { "$oid": "670d1b000000000000000010" },
      "actorName": "Sarah Connor",
      "action": "updated",
      "changes": [{ "field": "status", "before": "TODO", "after": "DONE" }],
      "createdAt": { "$date": "2026-10-14T16:25:00Z" }
    }
  ],
  "createdAt": { "$date": "2026-10-14T16:15:00Z" }
}
```

> **Justification du choix d'Embedding pour les commentaires :**  
> Les commentaires constituent des sous-documents indissociables de la tâche. L'imbrication (*Embedding*) tire pleinement parti du modèle document de MongoDB : une seule opération atomique de lecture charge la carte Kanban et son historique d'échanges sans jointure (*$lookup*) coûteuse, et la suppression en cascade de la tâche élimine naturellement ses commentaires.

---

### 2.5 Collection `notifications`

Documents persistants contenant `companyId` (obligatoire, immuable), `userId` (destinataire obligatoire, immuable), `taskId`, `projectId`, `type` (`assignment` ou `comment`), `message`, `readAt` (initialement `null`) et `createdAt`.

Les lectures et modifications de lecture filtrent à la fois `companyId` et `userId`. L'acteur est exclu et les destinataires sont dédupliqués puis validés dans l'entreprise avant insertion.

### 2.6 Règles de persistance

- `Project.archived` vaut `false` par défaut ; les anciens documents sans ce champ sont traités comme actifs.
- `dueDate` est facultatif, normalisé à minuit UTC depuis une date calendaire valide. `null` ou chaîne vide efface l'échéance.
- `Task.history` est produit par le serveur pour création, modification directe et commentaire (`created`, `updated`, `commented`). Les différences utilisent les valeurs après conversion/trim Mongoose ; l'historique client est ignoré.
- `optimisticConcurrency` protège les sauvegardes de tâches par contrôle de version ; il n'y a pas de fusion automatique en cas de conflit.
- L'historique est embarqué, sans pagination ni rétention ; il ne constitue pas un journal d'audit exhaustif des nettoyages en masse. La taille des documents et la limite MongoDB de 16 Mio restent à surveiller.
- Les notifications sont écrites après la tâche, sans transaction multi-documents ni outbox. Une erreur de livraison est journalisée sans annuler la mutation sauvegardée ; aucune relivraison n'est garantie.
- Les suppressions de tâche/projet/utilisateur/entreprise nettoient les notifications correspondantes. Les cascades ne sont pas transactionnelles ; le seed efface aussi les notifications.

## 3. Stratégie d'Indexation & Optimisation

Les index composés des collections filles respectent la **règle du préfixe `companyId`** pour soutenir les filtres d'entreprise :

| Collection | Spécification de l'index | Rôle & Justification |
| :--- | :--- | :--- |
| **`companies`** | `{ "_id": 1 }` *(Index primaire)* | Résolution directe et validation rapide de l'existence de l'entreprise. |
| **`users`** | `{ "companyId": 1, "email": 1 }` *(Unique)* | Unicité de l'email au sein de chaque tenant (permet le même email dans deux entreprises différentes si nécessaire). |
| **`projects`** | `{ "companyId": 1, "_id": 1 }` | Recherche d'un projet dans son entreprise ; correspond à la shard key envisagée. |
| **`tasks`** | `{ "companyId": 1, "projectId": 1, "status": 1 }` | Filtres d'entreprise, de projet et de statut ; ne couvre pas à lui seul tous les champs retournés ni le tri par création. |
| **`notifications`** | `{ "companyId": 1, "userId": 1, "createdAt": -1 }` | Chargement des notifications récentes d'un destinataire dans son entreprise. |

Ces index ne sont pas une preuve de requêtes couvertes ou d'absence de scan. Valider les plans avec `explain()` et la volumétrie cible ; la recherche titre/tags est locale aux tâches déjà chargées, pas un index texte MongoDB.

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
- Replica set : `mongodb://mongo1:27017,mongo2:27017/nexusflow_saas?replicaSet=rs0`.
- Routeurs `mongos` : `mongodb://mongos1:27017,mongos2:27017/nexusflow_saas`, sans option `replicaSet` ou `directConnection=true`.
- Le point de connexion est externalisé ; cela ne configure pas automatiquement le cluster, les shard keys, les index ni les politiques de placement.

## 5. API, interface et limites de sécurité

- [Référence API](docs/API.md) : routes, en-têtes, archives et notifications.
- [Recette](docs/TESTING.md) : commandes, tests HTTP isolés et vérifications manuelles.
- `public/dialogs.js` / `dialogs.css` gèrent les dialogues ; `task-tools.js` gère recherche/retard ; `productivity.js` gère historique, archives et boîte de notifications.
- La connexion vérifie un mot de passe, mais les appels suivants utilisent des en-têtes contrôlés par le client. `localStorage` n'est pas une session serveur et les rôles métier ne constituent pas un contrôle d'accès.
- Notifications : les 100 plus récentes sont renvoyées, avec un compteur couvrant toutes les non-lues. Actualisation à l'ouverture/changement de contexte, pas de push ni e-mail.
