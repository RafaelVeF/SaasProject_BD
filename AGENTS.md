# AGENTS.md

## Repository Overview

Unified Node.js / Express SaaS application (`nexusflow-saas`) serving an interactive Vanilla JS + Tailwind CSS Kanban SPA:
- `server.js`: Express 5 application and static file server.
- `src/`: Backend logic (Mongoose models in `src/models/`, REST routes in `src/routes/`, multi-tenant middleware in `src/middleware/`).
- `public/`: Single Page Application with interactive Kanban, Drag & Drop, and multi-tenant workspace switcher (`public/index.html`).
- `compose.yml` / `docker-compose.yml`: MongoDB 7.0 (`nexusflow-mongodb`) and application container (`nexusflow-app`).
- `config.env`: Centralized environment variables (`PORT`, `MONGO_URI`, pool settings).

All `npm` commands are run directly from the repository root.

---

## Developer Commands

### Application Root
- `npm install`: Install dependencies (`express`, `mongoose`, `cors`, `dotenv`).
- `npm run dev`: Start dev server with native `node --watch server.js`.
- `npm start`: Start server via `node server.js`.
- `npm test`: Run automated tests via `node --test tests/*.test.js`.

### Docker
- `docker compose up -d --build` (or `docker-compose up -d --build`): Build and run MongoDB (internal) and the unified app on port 3000.
- Application URL: `http://localhost:3000`.

---

## Architecture & Multi-Tenancy Rules

Strict multi-tenant architecture (*shared database, shared schema*) defined in `SPEC_TECHNIQUE.md` / `Architecture_BD.md`:
- **Tenant Isolation**: `companyId` is mandatory and immutable as a root field on all child collections (`users`, `projects`, `tasks`).
- **Query Scoping**: Every API route and database operation strictly filters by `companyId` resolved via `X-Company-Id` header through `requireTenant` middleware.
- **Index Prefix**: Compound indexes are strictly prefixed with `companyId` (e.g., `{ companyId: 1, projectId: 1, status: 1 }`).
- **Part II Sharding Readiness**: Target shard key `{ companyId: 1, _id: 1 }` guarantees co-location of documents for each company and eliminates scatter-gather.

---

## Environment & Configuration

- **Centralized Config**: Externalized in `config.env`.
  - `PORT=3000`
  - `MONGO_URI=mongodb://mongodb:27017/nexusflow_saas?directConnection=true`
  - `MONGO_MAX_POOL_SIZE=20`
  - `MONGO_TIMEOUT_MS=5000`
- **Part II Transition**: Changing `MONGO_URI` to a replica set or `mongos` router requires zero code changes.
