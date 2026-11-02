# SaaS Platform

Projet SaaS multi-tenant avec stack MERN (MongoDB, Express, React, Node.js) et conteneurisation Docker.

## Structure du projet

```text
├── backend/            # API REST Express & Mongoose
│   ├── src/
│   │   ├── config/     # Configuration de la base de données
│   │   └── index.js    # Point d'entrée de l'API
│   ├── Dockerfile
│   └── package.json
├── frontend/           # Application React (Vite)
│   ├── src/
│   │   ├── components/ # Composants React (Auth, etc.)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml  # Orchestration des conteneurs (MongoDB, Backend, Frontend)
├── .env                # Variables d'environnement
└── .gitignore
```

## Démarrage rapide avec Docker

```bash
docker-compose up --build
```

- **Frontend** : [http://localhost:5173](http://localhost:5173)
- **Backend API** : [http://localhost:5000](http://localhost:5000)
- **MongoDB** : port `27017`

## Démarrage en local (sans Docker)

1. **Backend** :
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend** :
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
