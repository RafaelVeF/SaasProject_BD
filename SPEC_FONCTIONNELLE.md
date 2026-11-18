# Spécification Fonctionnelle
## Plateforme SaaS Multi-Tenant : NexusFlow (TD1 - Partie I)

---

## 1. Vision du Produit

**NexusFlow** est une plateforme SaaS (Software-as-a-Service) de gestion de projet multi-tenant inspirée d'outils collaboratifs modernes tels que Trello, Notion et ClickUp. Elle permet à des organisations d'horizons variés de centraliser leurs équipes, leurs projets et leurs flux de travail au moyen d'un tableau Kanban visuel et interactif, tout en garantissant un cloisonnement strict des données entre entreprises.

---

## 2. Gestion Multi-Tenant & Isolation Logique

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
- **Suppression** : Retrait du collaborateur de l'entreprise avec désassignation automatique de ses tâches et suppression de sa présence dans les équipes projet.

### 3.2 CRUD Projets
- **Création** : Création d'un espace projet avec un nom, une description et la sélection des membres d'équipe parmi les utilisateurs de l'entreprise.
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

### 4.4 Filtrage Dynamique en Temps Réel
- **Filtre par membre assigné** : Affichage exclusif des tâches confiées à un collaborateur spécifique (ou vue globale *Tous les membres*).
- **Filtre par priorité** : Affichage ciblé selon le degré d'urgence.

### 4.5 Jeu de Données de Démonstration (Seed 1-Clic)
- Un bouton d'action dédié (`⚡ Réinitialiser & Démo`) dans l'en-tête permet de générer en une seconde deux entreprises complètes, distinctes et réalistes :
  1. **Nebula Tech (SaaS Cloud)** : Projet de sharding MongoDB avec tâches d'infrastructure et collaborateurs DevOps.
  2. **GreenSolar Collectif** : Projet solaire avec collaborateurs métier et tâches de télémétrie.
- Ce jeu de test permet d'expérimenter immédiatement l'étanchéité du cloisonnement multi-tenant sans configuration manuelle.
