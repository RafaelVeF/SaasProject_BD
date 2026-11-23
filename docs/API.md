# Référence API NexusFlow

État documenté : 23 novembre 2026. Base locale : `http://localhost:3000`.

## Conventions et identité

Les corps sont JSON (`Content-Type: application/json`). Les erreurs utilisent `{ "error": "message" }`.

- Les routes des utilisateurs, projets et tâches exigent `X-Company-Id`, identifiant MongoDB d'une entreprise existante.
- `X-User-Id` identifie l'acteur des tâches/commentaires et le destinataire de la boîte de notifications.
- Pour les tâches, un acteur fourni doit appartenir à l'entreprise ; sans acteur, l'auteur est « Collaborateur ».
- Pour les notifications, l'utilisateur est obligatoire et son appartenance est vérifiée.
- Ces en-têtes sont contrôlés par le client : ils ne constituent pas une authentification ou une autorisation serveur de production.
- Les identifiants MongoDB invalides ou données invalides produisent généralement `400`, les affectations externes `403`, les entités ciblées absentes `404`. Les conflits de version des tâches sont actuellement renvoyés en `400`, sans fusion automatique.

## Santé et authentification

| Méthode | Route | Usage |
| --- | --- | --- |
| GET | `/api/health` | État applicatif et connexion MongoDB ; pas une preuve d'autorisation. |
| POST | `/api/auth/register` | Inscription avec `name`, `email`, `password`, `companyName`. |
| POST | `/api/auth/login` | Connexion avec `email`, `password` ; renvoie utilisateur et entreprise, sans jeton de session serveur. |

## Entreprises

| Méthode | Route | Usage |
| --- | --- | --- |
| GET | `/api/companies` | Liste globale des entreprises dans cette démonstration. |
| POST | `/api/companies` | Créer avec `name` et éventuellement `plan` (`FREE`, `PRO`, `ENTERPRISE`) ; succès `201`. |
| PUT | `/api/companies/:id` | Modifier l'entreprise. |
| DELETE | `/api/companies/:id` | Supprimer l'entreprise et ses utilisateurs, projets, tâches et notifications. |

Ces routes ne passent pas par `requireTenant` et ne disposent pas d'un contrôle d'administration authentifié.

## Collaborateurs

Toutes ces routes sont relatives à l'entreprise active.

| Méthode | Route | Usage |
| --- | --- | --- |
| GET | `/api/users` | Liste des collaborateurs. |
| POST | `/api/users` | Créer avec `name`, `email`, éventuellement `role`, `avatarColor` ; succès `201`. |
| PUT | `/api/users/:id` | Modifier un collaborateur. |
| DELETE | `/api/users/:id` | Retirer le collaborateur, ses références d'équipe et d'assignation, ainsi que ses notifications. |

Le formulaire d'ajout ne propose pas de mot de passe ; le modèle actuel applique un mot de passe de démonstration par défaut.

## Projets et archives

| Méthode | Route | Usage |
| --- | --- | --- |
| GET | `/api/projects` | Tous les projets de l'entreprise, actifs et archivés. |
| GET | `/api/projects?archived=false` | Actifs, y compris les anciens documents sans champ `archived`. |
| GET | `/api/projects?archived=true` | Archivés uniquement. |
| POST | `/api/projects` | Créer avec `name`, `description`, `memberIds` ; succès `201`. |
| PUT | `/api/projects/:id` | Modifier `name`, `description`, `memberIds` ou `archived`. |
| DELETE | `/api/projects/:id` | Supprimer le projet, ses tâches et leurs notifications. |

Archivage : `PUT /api/projects/:id` avec `{ "archived": true }`. Restauration : même route avec `{ "archived": false }`. Les tâches sont conservées et restent modifiables.

## Tâches, dates et historique

| Méthode | Route | Usage |
| --- | --- | --- |
| GET | `/api/projects/:projectId/tasks` | Tâches avec assignés et auteurs de commentaires renseignés, et historique embarqué. |
| POST | `/api/projects/:projectId/tasks` | Créer une tâche ; succès `201`. |
| PUT | `/api/tasks/:id` | Modifier une tâche. |
| DELETE | `/api/tasks/:id` | Supprimer la tâche, son historique, sa discussion et ses notifications. |
| POST | `/api/tasks/:id/comments` | Ajouter un commentaire avec `text` ; succès `201`. L'auteur est résolu depuis `X-User-Id`, pas depuis `authorName` fourni dans le corps. |

Champs modifiables : `title`, `description`, `status`, `priority`, `tags`, `dueDate`, `assigneeIds` et l'ancien champ `assigneeId`. `title` est obligatoire à la création.

- Statuts : `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`.
- Priorités : `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `assigneeIds` contient les utilisateurs de l'entreprise ; le premier est synchronisé dans `assigneeId`. L'API ne limite pas ces utilisateurs aux membres du projet.
- `dueDate` : envoyer `YYYY-MM-DD`, normalisé à minuit UTC. `null` ou `""` retire la date ; une date calendaire impossible est refusée.
- `history` est généré côté serveur, jamais accepté depuis les corps de création/modification des tâches.
- Une entrée contient `actorId`, `actorName`, `action` (`created`, `updated`, `commented`), `createdAt` et `changes` (`field`, `before`, `after`).
- Les différences sont calculées sur les valeurs normalisées ; une modification sans changement réel n'ajoute pas d'entrée `updated`.
- La recherche titre/tags et le calcul du retard sont côté navigateur, sans paramètre de recherche serveur.

Exemple de mise à jour (remplacer les trois identifiants) :

```bash
curl -X PUT http://localhost:3000/api/tasks/TASK_ID \
  -H 'Content-Type: application/json' \
  -H 'X-Company-Id: COMPANY_ID' \
  -H 'X-User-Id: USER_ID' \
  -d '{"status":"IN_PROGRESS","dueDate":"2026-12-01"}'
```

## Notifications

Ces trois routes exigent les deux en-têtes de contexte. Le destinataire ne peut pas être choisi depuis le corps de la requête.

| Méthode | Route | Usage |
| --- | --- | --- |
| GET | `/api/notifications` | `{ "items": [...], "unreadCount": 0 }` ; 100 éléments récents maximum, compteur de toutes les non-lues. |
| PUT | `/api/notifications/read-all` | Marquer toutes les non-lues de cet utilisateur dans cette entreprise. |
| PUT | `/api/notifications/:id/read` | Marquer une notification appartenant à cet utilisateur ; `404` si elle appartient à un autre destinataire. |

Une notification contient `_id`, `companyId`, `userId`, `taskId`, `projectId`, `type` (`assignment` ou `comment`), `message`, `createdAt`, `readAt` (`null` avant lecture).

Les destinataires sont les nouveaux assignés ou, lors d'un commentaire, les assignés et participants précédents. L'auteur est exclu et les destinataires sont dédupliqués. Livraison best-effort après sauvegarde, sans outbox/reprise garantie.

## Réinitialisation de démonstration

`POST /api/seed` remplace les données de toutes les entreprises, notifications comprises. La confirmation appartient à l'interface : la route elle-même n'exige pas de confirmation ni d'autorisation administrative. Ne jamais l'appeler pour une recette automatisée sur des données à conserver.
