# Harmonisation des fenêtres de dialogue

## Objectif et périmètre approuvé

Remplacer les alertes et confirmations natives du navigateur par des fenêtres cohérentes avec NexusFlow. Harmoniser également les formulaires et la discussion de tâche, sans modifier les opérations métier.

## Approches

- Conserver les fenêtres natives : simple, mais leur apparence ne suit pas le thème de l'application.
- Ajouter une bibliothèque de composants : inutile pour ce périmètre et contraire au choix sans dépendance supplémentaire.
- Retenir des dialogues HTML natifs stylés et une présentation commune aux modales existantes : thème clair et anthracite, bordures et arrondis existants, actions primaires bleues et destructrices rouges.

Le périmètre et l'absence de nouvelle bibliothèque ont été validés dans la conversation.

## Comportement

- Les confirmations sont asynchrones et ne lancent aucune mutation après annulation.
- Une erreur peut apparaître au-dessus d'un formulaire sans effacer ses champs.
- Échap ferme le dialogue supérieur ; le focus reste dans celui-ci et revient à son déclencheur à la fermeture.
- Une confirmation destructive place initialement le focus sur Annuler.
- Les messages utilisent du texte, jamais du HTML injecté.
- Les formulaires longs restent accessibles sur mobile avec défilement interne.

## Hors périmètre

Refonte de la page, changement des règles métier, nouvelles fonctionnalités Kanban ou changement du mécanisme d'authentification.
