# TD1 SaaS Kanban Multi-Tenant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-grade, single-command containerized SaaS project management application (NexusFlow) featuring strict multi-tenant isolation, interactive Kanban board, comprehensive MongoDB data modeling ready for Part II sharding, and academic documentation deliverables.

**Architecture:** Unified Node.js/Express service serving a rich Vanilla JS + Tailwind CSS SPA (`public/index.html`), backed by Mongoose and MongoDB 7.0. All operations logically isolated via `companyId` header (`X-Company-Id`) and strict database filters.

**Tech Stack:** Node.js 22, Express 5, Mongoose 8/9, MongoDB 7.0, Tailwind CSS (CDN), Docker & Docker Compose.

**Spec:** `docs/superpowers/specs/2026-11-09-td1-saas-kanban-design.md`

## Global Constraints

- Must start with a single command from root: `docker compose up -d --build` (or `docker-compose up -d --build`).
- No manual dependency installation or manual configuration required.
- Single source of truth for MongoDB connection: `MONGO_URI` in `config.env`.
- Strict logical multi-tenancy: every project, user, and task document must have a top-level `companyId`.
- Target Shard Key for Part II: `{ companyId: 1, _id: 1 }`.
- Compound indexes must strictly prefix `companyId`.

## Review Focus

1. **Header missing or invalid:** API returns HTTP 400 with clear JSON error when `X-Company-Id` is missing or not a valid MongoDB ObjectId.
2. **Cross-tenant member leak:** Attempting to assign a user from Company A to a project or task in Company B returns HTTP 403.
3. **Cascade cleanup integrity:** Deleting a company deletes all its users, projects, and tasks; deleting a project deletes its tasks.
4. **Kanban Drag & Drop state persistence:** Changing task status via drag & drop immediately persists to MongoDB and updates the board.
5. **Cold start & Seed idempotency:** Calling `POST /api/seed` reliably resets and populates 2 isolated companies with realistic demo data.

---

### Task 1: Environment & Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `config.env`
- Modify: `.gitignore`
- Remove on this branch: `backend/`, `frontend/`, `sql/` (cleaned up for single-root unified deliverable; intact on `main`)

**Interfaces:**
- Produces: Root Node.js environment configuration and dependencies (`express`, `mongoose`, `cors`, `dotenv`).

- [ ] **Step 1: Write root `package.json` with scripts and dependencies**

Create `package.json`:
```json
{
  "name": "nexusflow-saas",
  "version": "1.0.0",
  "description": "Outil SaaS Multi-tenant de gestion de projet Kanban",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "node --test tests/*.test.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^5.0.1",
    "mongoose": "^8.9.5"
  }
}
```

- [ ] **Step 2: Create `config.env` with externalized environment variables**

Create `config.env`:
```env
PORT=3000
MONGO_URI=mongodb://mongodb:27017/nexusflow_saas?directConnection=true
MONGO_MAX_POOL_SIZE=20
MONGO_TIMEOUT_MS=5000
```

- [ ] **Step 3: Clean up decoupled folders on `feat/td1-unified-saas`**

Remove `backend/`, `frontend/`, and empty `sql/` directories on this branch so the root becomes the self-contained project root. Update `.gitignore` to allow `config.env` (as required by the TD submission guidelines).

- [ ] **Step 4: Install dependencies locally and verify `npm test` runs**

Run: `npm install && npm test`  
Expected: Dependencies installed, npm test runs.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json config.env .gitignore
git commit -m "chore: scaffold unified root project configuration"
```

---

### Task 2: MongoDB Models & Multi-Tenant Schemas

**Files:**
- Create: `src/models/Company.js`
- Create: `src/models/User.js`
- Create: `src/models/Project.js`
- Create: `src/models/Task.js`
- Create: `tests/models.test.js`

**Interfaces:**
- Produces: Mongoose models `Company`, `User`, `Project`, `Task` with exact schema types and compound indexes.

- [ ] **Step 1: Write failing test for model definitions and index specifications**

Create `tests/models.test.js` checking that:
- `Company` requires `name` and supports `plan` enum `['FREE', 'PRO', 'ENTERPRISE']`.
- `User` requires `companyId`, `name`, `email`, with unique compound index `{ companyId: 1, email: 1 }`.
- `Project` requires `companyId`, `name`, with index `{ companyId: 1, _id: 1 }`.
- `Task` requires `companyId`, `projectId`, `title`, and supports `status` enum `['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']`, with compound index `{ companyId: 1, projectId: 1, status: 1 }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/models.test.js`  
Expected: FAIL (models do not exist yet).

- [ ] **Step 3: Implement Mongoose models in `src/models/`**

Create:
- `src/models/Company.js`
- `src/models/User.js`
- `src/models/Project.js`
- `src/models/Task.js`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/models.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/ tests/models.test.js
git commit -m "feat: implement Mongoose models with multi-tenant compound indexes"
```

---

### Task 3: Backend Express App, Middleware & REST API

**Files:**
- Create: `src/middleware/tenant.js`
- Create: `src/routes/companies.js`
- Create: `src/routes/users.js`
- Create: `src/routes/projects.js`
- Create: `src/routes/tasks.js`
- Create: `src/routes/seed.js`
- Create: `server.js`
- Create: `tests/api.test.js`

**Interfaces:**
- Produces: Full REST API with `requireTenant` middleware, cascade operations, cross-tenant isolation enforcement, and 1-click seed endpoint.

- [ ] **Step 1: Write integration tests for multi-tenant isolation, cascade delete, and seed**

Create `tests/api.test.js` verifying:
1. `GET /api/companies` returns list of companies.
2. `GET /api/projects` without `X-Company-Id` returns HTTP 400.
3. `POST /api/seed` generates Nebula Tech and GreenSolar Collectif demo data.
4. Tenant isolation: querying projects with Nebula Tech's `X-Company-Id` does not return GreenSolar Collectif's projects.
5. Cross-tenant user assignment: creating a project in Company A with a member from Company B returns HTTP 403.
6. Cascade delete: deleting Company A removes all its users, projects, and tasks.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api.test.js`  
Expected: FAIL (`server.js` and routes not implemented).

- [ ] **Step 3: Implement `src/middleware/tenant.js` and Express routes**

- `src/middleware/tenant.js`: validate `X-Company-Id`, check Company exists, attach `req.companyId`.
- `src/routes/companies.js`: CRUD companies + cascade delete.
- `src/routes/users.js`: CRUD users scoped by `req.companyId`.
- `src/routes/projects.js`: CRUD projects scoped by `req.companyId`, validating all `memberIds` belong to `req.companyId`.
- `src/routes/tasks.js`: CRUD tasks scoped by `req.companyId` and `projectId`.
- `src/routes/seed.js`: 1-click reset and demo dataset creation.
- `server.js`: configure Express, CORS, static folder `public/`, routes, MongoDB connection via `process.env.MONGO_URI`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ server.js tests/api.test.js
git commit -m "feat: implement Express backend, tenant isolation middleware, and REST API"
```

---

### Task 4: Interactive Frontend Single Page Application (`public/index.html`)

**Files:**
- Create: `public/index.html`
- Create: `tests/frontend.test.js`

**Interfaces:**
- Produces: Complete responsive SPA with Tailwind CSS, Tenant Switcher, Sidebar (Projects & Members), 4-column Kanban with HTML5 Drag & Drop, Priority/Assignee filters, and CRUD Modals.

- [ ] **Step 1: Write test for frontend HTML assets & key elements**

Create `tests/frontend.test.js` verifying:
- `public/index.html` exists.
- Contains required DOM IDs: `companySelect`, `projectList`, `userList`, `kanbanBoard`, `filterAssignee`, `filterPriority`, `modalOverlay`.
- Injects `X-Company-Id` header into all `fetch`/API calls.
- Implements HTML5 Drag & Drop handlers (`ondragstart`, `ondragover`, `ondrop`).

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/frontend.test.js`  
Expected: FAIL (`public/index.html` missing).

- [ ] **Step 3: Implement `public/index.html`**

Build the complete SPA:
- Tailwind CSS via CDN.
- Top navigation with workspace switcher, company creation/deletion, and demo seed button.
- Sidebar with project and team management.
- Kanban board with 4 columns (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`), drag & drop, status badges, and dynamic filters.
- Modals for creating/updating Companies, Users, Projects, and Tasks.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/frontend.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/index.html tests/frontend.test.js
git commit -m "feat: implement interactive Kanban SPA with Drag & Drop and Tenant Switcher"
```

---

### Task 5: Dockerization & Orchestration

**Files:**
- Create: `Dockerfile`
- Create: `compose.yml`
- Create: `docker-compose.yml` (symlink or identical copy for backward compatibility)
- Modify: `.dockerignore`

**Interfaces:**
- Produces: Production-ready Docker configuration launching MongoDB 7.0 and NexusFlow app with a single command: `docker compose up -d --build`.

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY src ./src
COPY public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Create `compose.yml` & `docker-compose.yml`**

Configure services:
- `mongodb`: image `mongo:7.0`, container name `nexusflow-mongodb`, healthcheck, network `saas-network`, volume `mongo_data`.
- `app`: build `.`, container name `nexusflow-app`, ports `3000:3000`, env_file `config.env`, depends_on `mongodb` (`service_healthy`).

- [ ] **Step 3: Validate Docker configuration syntax**

Run: `docker compose config` (if docker available) or validate YAML syntax using a parser.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile compose.yml docker-compose.yml .dockerignore
git commit -m "ci: add Dockerfile and Compose orchestration ready for single-command start"
```

---

### Task 6: Documentation Deliverables & Submission Archive

**Files:**
- Create: `SPEC_TECHNIQUE.md` & update `Architecture_BD.md`
- Create: `SPEC_FONCTIONNELLE.md` & update `Architecture_Fonctionnelle.md`
- Create: `README.md`
- Create: `scripts/package-zip.sh`

**Interfaces:**
- Produces: Complete academic documentation deliverables required by the TD subject and automated ZIP packaging script.

- [ ] **Step 1: Write `SPEC_TECHNIQUE.md` & `Architecture_BD.md`**

Cover:
- Strict logical isolation (*Shared Database, Shared Schema*).
- MongoDB JSON schemas for all collections.
- Strategic shard key `{ companyId: 1, _id: 1 }` and compound indexes justification.
- Connection string configuration ready for Part II distributed cluster.

- [ ] **Step 2: Write `SPEC_FONCTIONNELLE.md` & `Architecture_Fonctionnelle.md`**

Cover:
- Product vision (NexusFlow SaaS).
- Tenant Switcher & isolation mechanics.
- Complete CRUD operations on Companies, Users, Projects, Tasks.
- Kanban board workflow, Drag & Drop, priority levels, tags, and dynamic filters.
- Seed demo dataset functionality.

- [ ] **Step 3: Write comprehensive `README.md`**

Detailed instructions for:
- Prerequisites.
- Quick start with `docker compose up -d --build`.
- Testing isolation and demo data.
- MongoDB configuration for Part II.

- [ ] **Step 4: Create packaging script `scripts/package-zip.sh`**

Script to bundle `Dockerfile`, `compose.yml`, `config.env`, `package.json`, `server.js`, `public/`, `src/`, `README.md`, `SPEC_TECHNIQUE.md`, `SPEC_FONCTIONNELLE.md` into `td1-saas-kanban.zip`.

- [ ] **Step 5: Run package script to verify archive generation**

Run: `bash scripts/package-zip.sh`  
Expected: `td1-saas-kanban.zip` generated cleanly.

- [ ] **Step 6: Commit**

```bash
git add SPEC_TECHNIQUE.md Architecture_BD.md SPEC_FONCTIONNELLE.md Architecture_Fonctionnelle.md README.md scripts/
git commit -m "docs: add technical spec, functional spec, README and submission packaging script"
```

---

### Task 7: Full System Verification

**Files:**
- Test all components: `npm test`

- [ ] **Step 1: Run all automated tests**

Run: `npm test`  
Expected: All model, API, and frontend sanity tests PASS.

- [ ] **Step 2: Verify git status and branch cleanliness**

Run: `git status`  
Expected: Working tree clean on branch `feat/td1-unified-saas`.

- [ ] **Step 3: Final commit & tag if needed**

```bash
git log -n 5 --oneline
```
