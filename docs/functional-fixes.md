# Corrections des parcours fonctionnels

## Périmètre

Cette livraison inclut les modifications préexistantes du dépôt, conformément à la demande utilisateur, et les corrections suivantes :

- Réinitialisation de l'affichage lorsqu'aucun projet n'est sélectionné, quelle que soit la vue active.
- Suppression des références multiples à un collaborateur retiré dans les tâches de son entreprise.
- Rechargement du projet après suppression d'un collaborateur pour actualiser ses membres.
- Suppression du réensemencement automatique et des tentatives récursives après un échec de connexion démo.
- Réinitialisation du filtre de priorité au changement d'entreprise.
- Rejet des réponses de chargement de tâches devenues obsolètes après une nouvelle sélection.
- Conservation de l'espace des filtres masqués pour stabiliser les onglets.

Les modifications restent dans l'architecture Express, Mongoose et JavaScript existante. Une refonte des vues ou de l'authentification n'est pas incluse.

## Vérification

`npm test` comprend des tests de régression exécutant le JavaScript frontend dans un contexte isolé : échec de connexion démo, absence de projet et réponses asynchrones reçues dans le désordre.

Ces tests ne remplacent pas une vérification visuelle dans un navigateur ni des tests d'intégration avec MongoDB réel.

## Cinq fonctionnalités proposées, non implémentées

1. Recherche des tâches par titre et tags.
2. Échéances et indicateurs de retard.
3. Historique des changements d'une tâche.
4. Archivage et restauration des projets terminés.
5. Notifications d'assignation et de nouveaux commentaires.
