# Guide de vérification

## Démarrer et actualiser

Depuis la racine :

```bash
docker compose up -d --build
```

Ouvrir `http://localhost:3000`, puis utiliser **Ctrl + F5** après modification du frontend. En exécution locale (`npm install`, `npm run dev`), les fichiers statiques sont servis directement ; le redémarrage du serveur n'est pas requis pour un changement HTML.

Utiliser une entreprise et des tâches jetables pour les suppressions. **Ne pas utiliser « Réinitialiser & Démo » : cette action remplace les données de toutes les entreprises.**

## Tests automatisés

```bash
npm test
```

Cette commande exécute `tests/*.test.js` : modèles, middleware, structure, sécurité de certains paramètres, dialogues et logique frontend isolée. Elle ne nécessite pas de MongoDB réel pour les tests actuels et ne valide pas le rendu navigateur.

Tests ciblés :

```bash
npm run test:ui
npm run test:api
node --test tests/popups.test.js
node --test tests/productivity.test.js tests/productivity-ui.test.js
node --test tests/routes-validation.test.js tests/ui-security.test.js tests/ui-ux.test.js
node --test tests/workflows.test.js
```

## Intégration HTTP avec MongoDB

Application et MongoDB doivent être en fonctionnement :

```bash
node tests/productivity.integration.js
```

Autre cible locale, si nécessaire :

```bash
TEST_BASE_URL=http://localhost:3000 node tests/productivity.integration.js
```

Le script crée deux entreprises de test et leurs utilisateurs/projets/tâches. Il vérifie dates invalides, historique normalisé, notification des nouveaux assignés et participants, absence d'auto-notification, marquage lu, archives/restauration, isolement entreprise/destinataire et nettoyage des notifications. Son bloc `finally` supprime uniquement les entreprises créées par l'exécution ; aucune donnée de démonstration n'est réinitialisée.

Une interruption brutale ou une panne réseau peut empêcher le nettoyage. Dans ce cas, identifier les entreprises `Integration <timestamp>` et `Foreign <timestamp>` créées par l'exécution avant toute suppression manuelle. Ne jamais supprimer une entreprise sur le seul critère de son nom sans vérifier son origine.

## Recette manuelle des cinq fonctionnalités

### Recherche

1. Créer « Énergie solaire » avec le tag `API`, puis une autre tâche.
2. Saisir `energie`, puis `api` dans la recherche au-dessus du Kanban.
3. Ajouter un filtre de priorité et un filtre de membre.
4. Vérifier que seuls les résultats combinés apparaissent et que le compteur correspond. Une recherche absente laisse les colonnes vides, sans masquer les autres projets.

### Échéances

1. Créer une tâche avec la date d'hier : badge « En retard ».
2. Passer la date à aujourd'hui : plus de retard.
3. Remettre hier puis passer au statut Terminé : pas de retard.
4. Effacer la date, enregistrer et rouvrir le formulaire : date absente.

### Historique

1. Modifier le titre, la priorité ou le statut d'une tâche, puis ajouter un commentaire.
2. Ouvrir « Historique » sur la carte.
3. Vérifier auteur, date, ordre récent d'abord et anciennes/nouvelles valeurs.
4. Une ancienne tâche peut n'avoir aucune entrée avant sa prochaine modification. L'historique ne reconstitue pas les événements antérieurs.

### Archives

1. Noter le nombre de tâches d'un projet, puis cliquer sur Archiver et confirmer.
2. Choisir « Projets archivés » dans la barre latérale.
3. Ouvrir le projet et vérifier ses tâches ; il reste modifiable.
4. Cliquer Restaurer puis revenir aux actifs : projet et tâches sont conservés.

### Notifications

1. Créer deux collaborateurs A et B dans la même entreprise et les ajouter au projet.
2. Sous A, assigner une tâche à B.
3. Passer au compte B et ouvrir Notifications : assignation non lue, sans notification destinée à A.
4. Ouvrir l'élément : accès à la tâche et marquage comme lu.
5. Sous A, ajouter un commentaire ; sous B, rouvrir la boîte pour actualiser.
6. B répond ; A, participant précédent, doit recevoir la réponse. B ne reçoit pas sa propre réponse.
7. Tester « Tout marquer comme lu », puis changer d'entreprise : aucune notification de l'autre entreprise ne doit apparaître.

Le compteur n'est pas poussé en continu entre navigateurs. La boîte affiche les 100 plus récentes, mais compte toutes les non-lues.

## Dialogues et régressions de navigation

- Alterner Kanban, Tableau de bord et Équipe : les filtres disparaissent sans déplacement horizontal des onglets.
- Annuler une suppression et essayer Échap : aucune suppression.
- Parcourir le dialogue avec Tab/Maj+Tab ; le fond reste inactif et le focus revient au déclencheur encore présent.
- Provoquer une erreur HTTP lors d'une sauvegarde : l'erreur s'affiche au-dessus du formulaire et ses champs restent intacts.
- Tester clair/sombre, bureau/mobile, description de chat longue et petit écran horizontal : boutons accessibles par défilement.
- Supprimer le dernier projet depuis le Dashboard : aucune ancienne statistique visible.
- Supprimer un collaborateur multi-assigné : retrait de l'équipe et des assignations ; les autres assignés restent.
- Simuler une connexion lente dans les outils développeur puis changer rapidement de projet/entreprise : ignorer les réponses obsolètes.
- Échouer une connexion démo : ni réinitialisation de données ni boucle de tentatives.

## Dernière preuve de validation

Livraison du 23 novembre 2026 : 39 tests automatisés réussis, intégration HTTP MongoDB réussie, reconstruction Docker réussie. Le rendu et le confinement clavier réel n'ont pas été validés automatiquement : Chrome n'était pas disponible dans l'environnement d'exécution. Les tests de DOM simulé ne remplacent pas la recette ci-dessus.
