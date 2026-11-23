# Productivité Kanban

## Périmètre approuvé

Recherche instantanée par titre et tags combinée aux filtres ; échéance calendaire et retard hors tâches terminées ; historique daté et attribué des modifications ; archivage/restauration des projets sans suppression ; notifications internes d'assignation et de commentaire avec non-lus et lien vers la tâche.

## Architecture retenue

Conserver Express, Mongoose et JavaScript natif. Réutiliser `Task.dueDate`. Ajouter `Task.history`, `Project.archived` et une collection `Notification` filtrée par entreprise et destinataire. Aucun e-mail, push, bibliothèque UI ou serveur temps réel. La boîte de notifications est rechargée à l'ouverture et au changement d'utilisateur ou d'entreprise.

Une recherche locale suffit aux tâches déjà chargées. Un moteur de recherche externe et WebSocket ajouteraient une infrastructure inutile pour ce périmètre.

## Règles

- Une échéance est une date `YYYY-MM-DD` ; le jour même n'est pas en retard. Une échéance vide supprime la date.
- Les projets archivés restent consultables et restaurables ; leur archivage ne supprime ni ne modifie leurs tâches.
- Historique produit par le serveur, jamais accepté depuis le client : création, champs modifiés et commentaires, avec date et auteur résolu dans l'entreprise.
- Notifications persistées pour les nouveaux assignés et, lors d'un commentaire, pour les assignés et participants précédents. Aucun auto-envoi ni doublon de destinataire pour un événement.
- Les acteurs et destinataires doivent appartenir à l'entreprise. Les notifications d'un autre destinataire ne peuvent pas être lues ou marquées.
- Les anciennes tâches et anciens projets restent compatibles avec les champs absents.
- Le système d'identité existant repose sur les en-têtes `X-Company-Id` et `X-User-Id`. Cette livraison ne le transforme pas en authentification forte.

## Validation

Tests de modèles, logique de recherche/date/historique, routes de notifications et tests HTTP d'intégration sur données jetables dans MongoDB Docker. Ne pas réinitialiser les données existantes. Validation visuelle limitée si aucun navigateur n'est disponible.
