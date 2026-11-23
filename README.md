# NexusFlow SaaS – Outil de Gestion de Projet Multi-Tenant
> **TD1 : Architecture SaaS & Bases de Données NoSQL – PARTIE I**

Plateforme SaaS multi-tenant inspirée de Trello, Notion et ClickUp, développée avec Node.js, Express, Mongoose et MongoDB. L'application intègre une isolation logicielle stricte par entreprise (`companyId`) et anticipe l'architecture distribuée de la **Partie II (Sharding & Réplication)**.

---

## Démarrage Rapide (Commande Unique)

Comme exigé par le sujet, l'application et sa base de données se démarrent avec **une seule commande** exécutée à la racine du projet, sans aucune installation locale de dépendances :

```bash
docker compose up -d --build
```
*(ou `docker-compose up -d --build` selon votre version de Docker)*

Une fois lancée, l'application est immédiatement accessible dans votre navigateur :
**http://localhost:3000**

---

## Données de Démonstration & Test de l'Isolation

Lorsque l'application entre dans un espace sans entreprise enregistrée, elle peut charger deux entreprises de démonstration :
1. **Nebula Tech (SaaS Cloud)** : Équipe DevOps/CTO travaillant sur le projet *Cluster MongoDB Sharding*.
2. **GreenSolar Collectif** : Équipe produit travaillant sur le projet *Portail Autoconsommation*.

> **Attention :** le bouton **Réinitialiser & Démo** demande confirmation, puis remplace les données de toutes les entreprises, y compris les notifications. Un échec de connexion démo ne déclenche jamais cette réinitialisation.

### Valider l'Isolation Multi-Tenant :
1. Sélectionnez **Nebula Tech** dans le sélecteur en haut : vous visualisez ses collaborateurs (*Sarah Connor, Marc Levy*), ses projets et son tableau Kanban.
2. Basculez sur **GreenSolar Collectif** : l'interface se met à jour instantanément pour n'afficher que ses données isolées (*Elena Rostova*, projet solaire). Aucun projet ou membre de Nebula Tech n'est visible.
3. Les requêtes API transmettent le header `X-Company-Id` et le middleware d'isolation rejette toute tentative d'assignation croisée.

---

## Fonctionnalités Implémentées

### Productivité et suivi

- **Recherche** : champ au-dessus du Kanban, par titre ou tag, insensible aux accents et à la casse ; combinable avec les filtres de membre et de priorité.
- **Échéances** : date facultative dans le formulaire de tâche, visible sur la carte. Le badge « En retard » apparaît à partir du lendemain de l'échéance, sauf si la tâche est terminée.
- **Historique** : bouton sur chaque carte pour consulter création, modifications et commentaires avec date et auteur. Les anciennes tâches commencent leur historique à leur prochaine modification.
- **Archives** : actions Archiver/Restaurer dans la liste des projets et sélecteur actifs/archivés. Les tâches sont conservées ; un projet archivé reste consultable et modifiable.
- **Notifications internes** : assignations et commentaires dans la boîte de l'utilisateur sélectionné ; compteur de non-lus, marquage individuel à l'ouverture, action « Tout marquer comme lu » et accès à la tâche.

La boîte affiche les 100 notifications les plus récentes, et le compteur couvre toutes les non-lues. Elle s'actualise à l'ouverture et au changement d'utilisateur ou d'entreprise, sans push ni e-mail. La livraison des notifications est secondaire : en cas d'échec MongoDB après sauvegarde de la tâche, l'échec est journalisé, sans annuler la modification ni garantir une relivraison.

L'identité utilise encore les en-têtes de démonstration `X-Company-Id` et `X-User-Id`. Leur validation d'appartenance ne remplace pas une session serveur authentifiée.

Vérifications :

```bash
npm test
node tests/productivity.integration.js
```

Le second test nécessite l'application et MongoDB en fonctionnement. Il crée deux entreprises temporaires et ne supprime que celles-ci dans son nettoyage ; il ne réinitialise jamais la démonstration.

- **Isolation Logicielle Stricte (*Shared Database, Shared Schema*)** :
  - Clé de cloisonnement `companyId` présente au premier niveau de chaque document enfant (`users`, `projects`, `tasks`, `notifications`).
  - Filtrage systématique par middleware sur le header `X-Company-Id`.
  - Rejet HTTP 403 en cas de tentative d'affectation d'un utilisateur externe à un projet.
- **CRUD Complet** :
  - **Entreprises** : Création, modification de forfait (`FREE`, `PRO`, `ENTERPRISE`), suppression en cascade.
  - **Collaborateurs** : Ajout avec attribution automatique d'avatar couleur, rôle et email professionnel.
  - **Projets** : Espaces projets avec sélection d'équipe parmi les collaborateurs de l'entreprise.
  - **Tâches** : Création, multi-assignation de membres, discussion/chat, tags, date d'échéance et priorisation.
- **Tableau Kanban Interactif & Vues Dédiées** :
  - 4 colonnes d'avancement : *À faire*, *En cours*, *En revue*, *Terminé*.
  - **Glisser-Déposer (Drag & Drop)** natif avec mise à jour immédiate en base.
  - Badges de priorité colorés (*CRITICAL*, *HIGH*, *MEDIUM*, *LOW*).
  - Filtres dynamiques en direct par collaborateur assigné et par niveau de priorité.
  - **Tableau de Bord / Analytics** et **Vue Équipe Projet**.

---

## Anticipation de la Partie II (Sharding & Réplication)

L'architecture anticipe rigoureusement l'évolution vers un cluster MongoDB distribué :

1. **Shard Key Ciblée : `{ "companyId": 1, "_id": 1 }`** :
   - Cible d'évolution, non configurée dans le déploiement actuel MongoDB standalone.
   - Le préfixe entreprise aide le ciblage, mais une entreprise peut occuper plusieurs chunks et shards. Colocalisation et routage doivent être vérifiés sur le cluster.
2. **Configuration Réseau Externalisée (`config.env`)** :
   - L'application lit exclusivement la variable d'environnement `MONGO_URI`.
   - Pour un replica set : fournir sa liste de membres et `replicaSet=rs0`. Pour des routeurs `mongos` : fournir leurs adresses sans option `replicaSet` ni `directConnection=true`.
   - Le point de connexion est externalisé ; le déploiement, les index et le routage devront aussi être validés.

---

## Structure du Projet

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
│   ├── models/                # Company, User, Project, Task, Notification
│   ├── routes/                # Auth, CRUD, notifications et seed
│   └── utils/taskActivity.js  # Dates, historique serveur et livraison des notifications
├── public/
│   ├── index.html             # SPA, formulaires et vues Kanban / Dashboard / Équipe
│   ├── dialogs.js             # File de confirmations et erreurs
│   ├── dialogs.css            # Modales clair/sombre et défilement mobile
│   ├── task-tools.js          # Recherche et calcul du retard
│   └── productivity.js        # Historique, archives et notifications
├── tests/                     # Tests automatisés et intégration HTTP explicite
├── docs/                      # Référence API, guide de test et historique des livraisons
├── SPEC_TECHNIQUE.md          # Livrable 1 : Spécification technique & modèle NoSQL
├── SPEC_FONCTIONNELLE.md       # Livrable 2 : Spécification fonctionnelle
├── README.md                  # Livrable 3 : Documentation d'utilisation
└── scripts/
    └── package-zip.sh         # Script de génération de l'archive de remise TD1
```

---

## Exécution des Tests Locaux

Pour exécuter la suite de tests automatisée (validation des schémas, de l'isolation et des configurations) :

```bash
npm test
```

Pour une exécution locale hors Docker, utiliser Node.js 20+ et `npm install`, puis `npm run dev`. Fournir un `MONGO_URI` accessible depuis l'hôte : le nom `mongodb` du fichier `config.env` est destiné au réseau Docker.

## Dialogues et navigation

Les confirmations et erreurs utilisent des dialogues harmonisés avec les thèmes clair et sombre, des actions destructrices rouges et le focus initial sur « Annuler ». Échap ferme le dialogue supérieur. Les formulaires conservent leurs champs sous une erreur ; les filtres masqués conservent leur espace pour stabiliser les onglets.

## Documentation et limites

- [Guide de tests manuels et automatisés](docs/TESTING.md)
- [Référence des routes API](docs/API.md)
- [Spécification fonctionnelle](SPEC_FONCTIONNELLE.md)
- [Modélisation et limites techniques](SPEC_TECHNIQUE.md)
- [Consignes pour les agents](AGENTS.md)
- [Historique des corrections](docs/functional-fixes.md)

Dernière validation de la livraison productivité : 39 tests automatisés réussis, intégration HTTP MongoDB réussie et reconstruction Docker réussie. Ce résultat est daté du 23 novembre 2026, pas une garantie des exécutions futures. Le rendu visuel et le confinement du focus n'ont pas été validés dans un navigateur réel dans cet environnement, faute de Chrome.
