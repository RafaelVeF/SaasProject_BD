# AGENTS.md

## Repository Overview

Two independent Node.js packages without a root workspace:
- `backend/`: Express 5 REST API + Mongoose 9 (CommonJS).
- `frontend/`: React 19 + Vite 8 SPA (ESM, styled with custom CSS).
- `docker-compose.yml`: MongoDB 6.0 (`saas_mongo`), backend, and frontend containers.

Always run `npm` commands inside `backend/` or `frontend/`, not from the repo root.

---

## Developer Commands

### Backend (`cd backend`)
- `npm install`: Install dependencies.
- `npm run dev`: Start dev server with native `node --watch src/index.js` (Node 18+ required).
- `npm start`: Start server via `node src/index.js`.
- *Note:* `npm test` is currently an unconfigured stub (`exit 1`).

### Frontend (`cd frontend`)
- `npm install`: Install dependencies.
- `npm run dev`: Start Vite dev server on `http://localhost:5173`.
- `npm run lint`: Lint with `oxlint` (configured in `.oxlintrc.json`).
- `npm run build`: Production build via `vite build`.

### Docker
- `docker-compose up --build`: Build and run MongoDB (port 27017), API (port 5000), and frontend (port 5173).
- *WSL Gotcha:* Requires Docker Desktop WSL 2 integration to be active.

---

## Architecture & Multi-Tenancy Rules

Strict multi-tenant architecture (*shared database, shared schema*) defined in `Architecture_BD.md`:
- **Tenant Isolation**: `companyId` is mandatory as a root field on all child collections (`users`, `projects`, `tasks`, `audit_logs`, `invitations`).
- **Query Scoping**: Every API route and database operation must strictly filter by `companyId` extracted from the authenticated user's JWT context.
- **Index Prefix**: All compound indexes must be prefixed with `companyId` (e.g., `{ companyId: 1, projectId: 1, status: 1, position: 1 }`).
- **Kanban Ordering**: `tasks.position` is a floating-point number (fractional indexing) to enable drag-and-drop reordering without shifting adjacent tasks.

---

## Environment & Configuration

- **Backend DB Connection**: In `backend/src/index.js`, MongoDB connection is conditional (`if (process.env.MONGO_URI)`). The API can run without Mongo for stubbed endpoints.
- **Local vs Docker Mongo URI**:
  - In Docker: `mongodb://admin:password@db:27017/saas_db?authSource=admin`
  - Local without Docker: replace `db` with `localhost`.
- **Frontend API Target**: Configured via `VITE_API_URL` (defaults to `http://localhost:5000` in code).
