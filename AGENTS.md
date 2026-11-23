# AGENTS.md

## Repository Overview

Unified Node.js / Express SaaS application (`nexusflow-saas`) serving an interactive Vanilla JS + Tailwind CSS Kanban SPA:
- `server.js`: Express 5 application and static file server.
- `src/`: Backend logic (Mongoose models in `src/models/`, REST routes in `src/routes/`, multi-tenant middleware in `src/middleware/`).
- `public/`: Single Page Application with interactive Kanban, Drag & Drop, and multi-tenant workspace switcher (`public/index.html`).
- `public/dialogs.js` / `public/dialogs.css`: Shared themed modal dialogs, queued confirmations/errors and native keyboard behavior.
- `public/task-tools.js`: Pure search and calendar-overdue helpers; usable in the browser and Node tests.
- `public/productivity.js`: Task history, project archive actions and notification inbox UI.
- `src/utils/taskActivity.js`: Editable task-field allowlist, calendar-date normalization, server-generated history and notification delivery.
- `src/models/Notification.js` / `src/routes/notifications.js`: Persistent recipient-scoped internal notifications.
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
- `node tests/productivity.integration.js`: Run HTTP integration checks against the running app and real MongoDB. Creates two temporary companies and deletes only those companies in `finally`; never resets demo data.
- `TEST_BASE_URL=http://localhost:3000 node tests/productivity.integration.js`: Override the integration target explicitly.

### Docker
- `docker compose up -d --build` (or `docker-compose up -d --build`): Build and run MongoDB (internal) and the unified app on port 3000.
- Application URL: `http://localhost:3000`.

---

## Architecture & Multi-Tenancy Rules

Strict multi-tenant architecture (*shared database, shared schema*) defined in `SPEC_TECHNIQUE.md` / `Architecture_BD.md`:
- **Tenant Isolation**: `companyId` is mandatory and immutable as a root field on all child collections (`users`, `projects`, `tasks`, `notifications`).
- **Query Scoping**: Child-collection operations must filter by `companyId` resolved via `X-Company-Id` through `requireTenant`. Company management, authentication and the destructive demo seed have different existing scopes; do not treat them as authenticated tenant authorization.
- **Recipient Scoping**: Notification reads and read-state changes additionally filter by `userId`, validated in the active company from `X-User-Id`. Never accept a recipient from a request body as the read scope.
- **Index Prefix**: Compound indexes are strictly prefixed with `companyId` (e.g., `{ companyId: 1, projectId: 1, status: 1 }`).
- **Part II Sharding Readiness**: Target shard key `{ companyId: 1, _id: 1 }` is planned, not deployed. A compound key alone does not guarantee that an entire company remains on one shard; routing and placement must be validated on the actual cluster.

## Feature Invariants

- Search is local to loaded project tasks, accent/case insensitive, combined with assignee and priority filters.
- `dueDate` is optional; normalize calendar dates to UTC midnight on the server. In the UI, overdue means a date before the user's local calendar day and status other than `DONE`.
- History is embedded in tasks and generated on the server for task creation, direct updates and comments. Compare normalized persisted values; never accept client-supplied history. Preserve `optimisticConcurrency` when changing task save paths.
- `Project.archived` defaults to `false`; old documents without the field count as active. Archives remain editable and must preserve tasks.
- Notifications go to newly assigned users or comment assignees/previous participants; exclude the actor and deduplicate recipients.
- Notification delivery is best-effort with error logging, without retry/outbox. The inbox shows the latest 100 items; the unread count covers all items. Refresh on opening and account/company changes, not by push or polling.
- Keep notification cleanup in user/project/task/company deletion and demo reset.
- Use the shared asynchronous confirmation dialogs, not browser `alert`/`confirm`. Cancellation must never run mutations; error dialogs must preserve forms.
- Preserve request-version/company guards so late responses cannot replace the active project's or inbox's data.

## Security and Verification Limits

- Login checks a password, but subsequent API identity relies on client-controlled headers and local storage. There is no server session/token authorization or enforced role-based access control. Do not describe this as production-safe authentication.
- Seed resets the whole database, including notifications. Do not invoke it for tests or troubleshooting without explicit permission.
- Unit tests execute some frontend logic with a simulated DOM; they do not validate browser layout or native focus confinement.
- Use [docs/TESTING.md](docs/TESTING.md) for manual acceptance steps and [docs/API.md](docs/API.md) for routes.
- Keep `SPEC_FONCTIONNELLE.md` and `Architecture_Fonctionnelle.md` synchronized, likewise `SPEC_TECHNIQUE.md` and `Architecture_BD.md`. Historical plans describe decisions at the time, not current release status.

---

## Environment & Configuration

- **Centralized Config**: Externalized in `config.env`.
  - `PORT=3000`
  - `MONGO_URI=mongodb://mongodb:27017/nexusflow_saas?directConnection=true`
  - `MONGO_MAX_POOL_SIZE=20`
  - `MONGO_TIMEOUT_MS=5000`
- **Part II Transition**: Changing `MONGO_URI` to a replica set or `mongos` router requires zero code changes.
