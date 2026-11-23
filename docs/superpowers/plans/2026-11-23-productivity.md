# Productivité Kanban Implementation Plan

**Goal:** Livrer les cinq fonctionnalités approuvées sur une branche et une PR.
**Architecture:** Champs rétrocompatibles, historique serveur et notifications multi-tenant ; interface existante sans dépendance.
**Tech Stack:** Express, Mongoose, JavaScript, node:test.
**Spec:** `docs/superpowers/specs/2026-11-23-productivity-design.md`

## Contraintes et points de revue

Ne pas toucher aux données existantes pour les tests. Chaque requête filtre l'entreprise ; les notifications filtrent aussi le destinataire. Tester dates invalides, tâches terminées, commentaires répétés, destinataires externes et restaurations d'archives. Pas d'e-mail, push ni authentification nouvelle.

## Tâches

- [x] Écrire les tests de recherche, échéance, historique et schémas ; observer l'échec.
- [x] Ajouter les utilitaires et modèles rétrocompatibles.
- [x] Ajouter historique et notifications aux routes de tâches, puis les routes de lecture des notifications.
- [x] Ajouter les commandes d'archivage/restauration et leur filtre.
- [x] Intégrer recherche, échéance, historique et boîte de notifications dans l'interface.
- [x] Exécuter la suite et les tests HTTP sur données temporaires isolées.
- [ ] Revue indépendante, corrections, Docker, PR et merge après vérification.

## Journal

Exécution directe approuvée par la demande « c'est bon implémente ». Une seule branche `feat/kanban-productivity`.

- Première étape : cinq tests en échec avant ajout des utilitaires et champs.
- Tests HTTP avec MongoDB Docker : échéances invalides et effacement, création/modification/commentaires historisés, notifications et auto-exclusion, participants précédents, marquage lu, archivage/restauration sans perte et isolation entreprise/destinataire. Les deux entreprises temporaires de chaque exécution sont supprimées dans `finally`.
- Revue indépendante : comparaison de l'historique avec les valeurs brutes au lieu des valeurs normalisées détectée. Régression HTTP observée rouge puis verte après correction.
- Régressions supplémentaires rouge puis vert : identité précédente effacée pour une entreprise sans utilisateurs ; réponse de projets obsolète ignorée après changement d'entreprise.
- Décision : notifications secondaires best-effort, car la configuration MongoDB standalone ne fournit pas de transaction multi-documents. Une panne de livraison est journalisée sans faire passer une mutation sauvegardée pour un échec. Coût : pas de garantie de relivraison après panne.
- Décision : les archives restent modifiables, car le périmètre porte sur classement et restauration, pas sur un verrouillage métier.
- Vérification navigateur réelle non disponible : aucun Chrome installé. Les tests frontend isolés ne prouvent pas le rendu visuel.
- Vérification finale : `npm test` → 39 réussis, 0 échec ; `node tests/productivity.integration.js` → succès ; reconstruction Docker réussie.
