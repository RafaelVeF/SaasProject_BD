# Spécification Fonctionnelle
## Plateforme SaaS Multi-Tenant : NexusFlow (TD1 - Partie I)

---

## 1. Vision du Produit

**NexusFlow** est une plateforme SaaS (Software-as-a-Service) de gestion de projet multi-tenant inspirée d'outils collaboratifs modernes tels que Trello, Notion et ClickUp. Elle permet à des organisations d'horizons variés de centraliser leurs équipes, leurs projets et leurs flux de travail au moyen d'un tableau Kanban visuel et interactif, tout en garantissant un cloisonnement strict des données entre entreprises.

---

## 2. Gestion Multi-Tenant & Authentification

### 2.0 Module d'Authentification Effective & Changement de Compte
- **Écran de Connexion & Inscription** : Interface d'accueil permettant à tout utilisateur de se connecter avec son email et mot de passe, ou de créer un nouveau compte avec création de son entreprise (tenant) dédiée.
- **Accès Démo 1-Clic** : Boutons d'accès direct pour tester instantanément l'application sous l'identité de *Sarah Connor (Nebula Tech)* ou d'*Elena Rostova (GreenSolar)* sans saisie manuelle.
- **Identité de démonstration & Déconnexion** : Mémorisation locale de l'identité (`localStorage`), bouton de déconnexion et sélecteur de compte. Les API utilisent des en-têtes contrôlés par le client ; il n'existe pas de session serveur authentifiée ni de contrôle de rôles opposable.

### 2.1 Sélecteur d'Espace de Travail (*Workspace / Tenant Switcher*)
- Un sélecteur en en-tête permet à l'utilisateur de basculer instantanément entre les entreprises enregistrées.
- Dès qu'une entreprise est sélectionnée, le frontend injecte automatiquement le header HTTP `X-Company-Id` dans tous les appels API.
- L'ensemble des données affichées (membres, projets, tâches) est dynamiquement restreint à l'entreprise courante.

### 2.2 CRUD Entreprises (Tenants)
- **Création** : Enregistrement d'une nouvelle organisation avec son nom et son plan d'abonnement (`FREE`, `PRO`, `ENTERPRISE`).
- **Modification** : Mise à jour des informations juridiques ou de formule d'abonnement.
- **Suppression en cascade** : La suppression d'une entreprise entraîne le nettoyage immédiat de toutes ses entités filles (utilisateurs, projets, tâches) afin de prévenir les données orphelines.

---

## 3. Gestion des Équipes & des Projets

### 3.1 CRUD Collaborateurs (Users)
- **Création** : Ajout d'un membre rattaché à l'entreprise active avec Nom, Email professionnel, Rôle (ex. *CTO, Product Lead, DevSecOps*) et assignation automatique d'une couleur d'avatar unique.
- **Consultation** : Visualisation de la liste des collaborateurs dans la barre latérale.
- **Modification** : Bouton d'édition (✎) sur chaque profil pour mettre à jour son nom, son email ou son rôle métier.
- **Suppression** : Retrait du collaborateur de l'entreprise avec désassignation automatique de ses tâches et suppression de sa présence dans les équipes projet.

### 3.2 CRUD Projets
- **Création** : Création d'un espace projet avec un nom, une description et la sélection des membres d'équipe parmi les utilisateurs de l'entreprise.
- **Modification** : Bouton d'édition (✎) sur chaque projet pour actualiser son nom, sa description ou réassigner son équipe de collaborateurs.
- **Validation inter-tenant** : Tout utilisateur extérieur à l'entreprise est rejeté lors de l'assignation.
- **Suppression en cascade** : La suppression d'un projet supprime l'ensemble de ses tâches associées.

---

## 4. Tableau Kanban & Fonctionnalités à Forte Valeur Ajoutée

### 4.1 Visualisation Kanban Interactive
- Répartition des tâches en 4 colonnes d'avancement standardisées :
  1. **À faire (`TODO`)**
  2. **En cours (`IN_PROGRESS`)**
  3. **En revue (`REVIEW`)**
  4. **Terminé (`DONE`)**
- Compteur de tâches dynamique sur chaque colonne.

### 4.2 Glisser-Déposer (Drag & Drop HTML5) & Statut Rapide
- Déplacement naturel d'une tâche d'une colonne à une autre par glisser-déposer.
- La persistance en base de données MongoDB s'opère instantanément dès le relâchement de la carte.
- Sélecteur déroulant de statut directement intégré sur chaque carte pour une modification rapide au clavier ou mobile.

### 4.3 Niveaux de Priorité & Catégorisation par Tags
- 4 niveaux de priorité avec repères visuels distincts :
  - **CRITICAL** (Rouge / effet pulsation)
  - **HIGH** (Orange ambré)
  - **MEDIUM** (Bleu)
  - **LOW** (Gris ardoise)
- Système de tags personnalisables (ex. *#MongoDB, #DevOps, #Architecture, #UI*).

### 4.4 Filtrage Dynamique en Temps Réel & Raccourcis Clavier
- **Filtre par membre assigné** : Affichage exclusif des tâches confiées à un collaborateur spécifique (ou vue globale *Tous les membres*).
- **Filtre par priorité** : Affichage ciblé selon le degré d'urgence.
- **Filtre « En retard uniquement » & Réinitialisation** : Case à cocher pour isoler les tâches dont l'échéance est dépassée (hors `DONE`), avec bouton « Réinitialiser les filtres » visible dès qu'un filtre est actif.
- **Création rapide par colonne & Raccourcis** : Bouton `+` dans chaque en-tête de colonne pour pré-sélectionner le statut, et raccourcis clavier hors saisie/modale (`/` pour la recherche, `n` pour nouvelle tâche, `1`/`2`/`3` pour changer de vue).

### 4.5 Multi-Assignation de Collaborateurs
- Chaque tâche supporte l'assignation simultanée de plusieurs collaborateurs de l'entreprise. Le formulaire propose les membres du projet, ou ceux de l'entreprise si le projet n'a pas de membres ; l'API vérifie l'entreprise, pas l'appartenance au projet.
- Affichage visuel en cascade (*Avatar Stack*) sur les cartes Kanban et dans la vue détaillée.

### 4.6 Fil de Discussion & Chat par Tâche
- Chaque carte propose un bouton d'accès direct au fil de commentaires (`💬`).
- Modale de discussion interactive permettant aux collaborateurs d'échanger des notes, retours d'avancement et blocages horodatés en direct.
- Attribution automatique du message à l'utilisateur actif de la session.

### 4.7 Vues Spécialisées : Tableau de Bord & Équipe Projet
- **Tableau de Bord (Dashboard Analytics)** : KPI en temps réel (total des tâches, pourcentage d'avancement, tâches actives, priorité critique, tâches en retard), répartition par priorité, par statut et charge de travail par collaborateur.
- **Vue Équipe (Team View)** : Récapitulatif des membres du projet, compétences/rôles et volume de tâches attribuées.

### 4.8 Jeu de Données de Démonstration (Seed 1-Clic)
- Un bouton d'action dédié (`Réinitialiser & Démo`) dans l'en-tête permet de générer en une seconde deux entreprises complètes, distinctes et réalistes :
  1. **Nebula Tech (SaaS Cloud)** : Projet de sharding MongoDB avec tâches d'infrastructure et collaborateurs DevOps.
  2. **GreenSolar Collectif** : Projet solaire avec collaborateurs métier et tâches de télémétrie.
- Ce jeu de test permet d'expérimenter immédiatement l'étanchéité du cloisonnement multi-tenant sans configuration manuelle.

### 4.9 Switcher de Thème (Noir Anthracite & Bleu Nuit vs Blanc & Bleu Clair)
- **Thème Sombre par défaut** : Nuances de noir anthracite profond, cartes bleu nuit ardoisé, typographie blanc cassé et accents bleu électrique.
- **Thème Clair** : Nuances de blanc cassé, cartes blanches épurées, typographie ardoise et accents bleu royal.
- **Bouton d'Inversion & Persistance** : Icône vectorielle Soleil/Lune dans l'en-tête mémorisant automatiquement le choix de l'utilisateur.

### 4.10 Recherche et échéances

- Recherche instantanée dans les titres et tags des tâches déjà chargées, sans distinction de casse ou d'accent.
- Combinaison avec les filtres membre/priorité et compteur des résultats ; cette recherche ne couvre pas les autres projets.
- Échéance facultative dans le formulaire : une valeur vide retire la date. Le jour de l'échéance n'est pas en retard.
- Badge « En retard » pour une date antérieure au jour local de l'utilisateur, hors tâches `DONE`.

### 4.11 Historique des tâches

- Création, modifications directes et commentaires sont enregistrés côté serveur avec date et auteur de l'entreprise active.
- Les modifications affichent les anciennes et nouvelles valeurs normalisées. Un client ne peut pas fournir son propre historique via les routes de tâches.
- Les anciennes tâches n'ont pas d'historique rétroactif ; les opérations de nettoyage en masse ne constituent pas un audit exhaustif.

### 4.12 Archivage des projets

- Actions Archiver et Restaurer dans la barre latérale, après confirmation.
- Sélecteur « Projets actifs / Projets archivés » ; aucun effacement de tâches lors de l'archivage.
- Les archives restent consultables et modifiables, et les liens de notifications peuvent les ouvrir.

### 4.13 Notifications internes

- Une assignation avertit les nouveaux assignés ; un commentaire avertit les assignés et participants précédents.
- L'auteur est exclu et les destinataires sont dédupliqués puis validés dans l'entreprise.
- Boîte par utilisateur : 100 notifications récentes, compteur de toutes les non-lues, action de lecture globale et ouverture de la tâche avec marquage individuel.
- Actualisation à l'ouverture, au changement de compte/entreprise et après envoi d'un commentaire ; pas de push, e-mail ou synchronisation continue.
- Livraison best-effort : une panne après sauvegarde de la tâche est journalisée, sans annulation de la sauvegarde ni relivraison garantie.

### 4.14 Dialogues et stabilité

- Dialogues harmonisés clair/sombre pour confirmations, erreurs, formulaires, discussion, historique et notifications.
- Annulation sélectionnée initialement pour les confirmations ; actions destructrices rouges. Échap ferme le dialogue supérieur.
- Les erreurs ne remplacent pas les formulaires. Les filtres masqués gardent leur place pour stabiliser les onglets.
- Les réponses obsolètes de chargement de tâches/projets/notifications sont ignorées selon les gardes de contexte implémentées.

## 5. Limites et recette

Les entreprises, utilisateurs et rôles affichés ne constituent pas une autorisation serveur de production. La réinitialisation démo efface les données de toutes les entreprises, notifications comprises, après confirmation dans l'interface. Un échec de connexion démo ne réinitialise pas les données.

Voir [docs/TESTING.md](docs/TESTING.md) pour la recette et [docs/API.md](docs/API.md) pour les routes. Les tests isolés ne remplacent pas la vérification visuelle et clavier dans un navigateur réel.
