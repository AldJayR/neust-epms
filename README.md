# NEUST EPMS

NEUST EPMS is a two-application workspace for managing university extension-service proposals, projects, reports, MOAs, users, notifications, documents, and audit history.

The repository contains:

- `backend/`: TypeScript ESM Hono REST API with OpenAPI contracts, PostgreSQL, Drizzle ORM, Supabase Auth/Storage, Resend, Sentry, and scheduled jobs.
- `frontend/`: React 19 TanStack Start application with TanStack Router, TanStack Query, Tailwind CSS, Supabase session support, and Cloudflare deployment.
- `docs/`: requirements, data-flow documentation, deployment instructions, UX research, and implementation plans.

## System Boundaries

```text
Browser
  -> TanStack Start server functions and session cookie
  -> Hono API at /api/v1
  -> PostgreSQL through Drizzle
  -> Supabase Auth and private Storage
  -> Resend and optional Sentry integrations
```

The frontend must not connect directly to PostgreSQL or use the Supabase service-role key. Authorization belongs in the backend even when the frontend also hides or redirects a route.

## Prerequisites

- Node.js 22.x
- pnpm 11.13.1
- Bun for the backend hot-reload development command
- PostgreSQL for backend integration tests
- Supabase project credentials for local development or deployed environments
- Wrangler credentials for frontend Cloudflare deployment

Install dependencies from the repository root:

```bash
pnpm install
```

The workspaces are exactly `frontend` and `backend`, as defined in `pnpm-workspace.yaml`. Keep `pnpm-lock.yaml` committed and prefer frozen installs in CI and deployment environments:

```bash
pnpm install --frozen-lockfile
```

## Quick Start

### Configure the backend

Copy `backend/.env.example` to `backend/.env` and fill in local values. The backend validates its environment at startup in `backend/src/env.ts`.

Required backend values include:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Optional integrations include `SENTRY_DSN`, `RESEND_API_KEY`, and `RESEND_FROM`.

### Configure the frontend

Copy `frontend/.env.example` to `frontend/.env.local` and set:

```text
API_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SESSION_SECRET
VITE_SENTRY_DSN
```

`SESSION_SECRET` must be at least 32 characters and must never be reused as a public client value.

### Run development

From the repository root:

```bash
pnpm dev
```

This starts both workspaces through `concurrently`. The backend's `dev` script uses Bun; package-level commands can be run independently:

```bash
pnpm --filter backend dev
pnpm --filter frontend dev
```

Set `API_URL` explicitly in `frontend/.env.local`. Do not rely on the current defaults: the frontend example uses port `3000`, while frontend source fallbacks use port `3001`, and the Vite development command also binds port `3000`.

## Repository Map

```text
.
├── backend/
│   ├── src/app.ts                 # HTTP middleware and route mounting
│   ├── src/index.ts               # Process entry point and cron startup
│   ├── src/env.ts                 # Fail-fast environment validation
│   ├── src/modules/               # Domain routes, schemas, and services
│   ├── src/db/schema/             # Drizzle table definitions
│   ├── drizzle/                   # Committed SQL migrations
│   └── test/                      # Integration harness and fixtures
├── frontend/
│   ├── src/routes/                # File-based TanStack Router routes
│   ├── src/features/              # Domain data access, hooks, and UI
│   ├── src/components/ui/         # Shared UI primitives
│   ├── src/components/custom/     # Application-specific components
│   ├── src/lib/                   # Session, API, security, and utilities
│   └── wrangler.jsonc             # Cloudflare deployment configuration
├── docs/
├── .github/workflows/             # Current deployment workflow
├── package.json                   # Root orchestration scripts
└── pnpm-workspace.yaml
```

## Root Commands

```bash
pnpm dev       # Start backend and frontend concurrently
pnpm build     # Build backend and frontend concurrently
pnpm start     # Start both built applications concurrently
```

The root `pnpm test` script currently exits with `Error: no test specified`. Use the package-specific commands below until a real root verification script is added.

## Backend Practices

### HTTP and module structure

Keep backend changes inside the existing module architecture:

- Routes define HTTP behavior and OpenAPI contracts.
- `*.schema.ts` files define request and response schemas.
- `*.service.ts` files contain business logic and database operations.
- `index.ts` files mount domain routes.
- Shared policy and utility logic belongs in `src/lib/` only when it is genuinely cross-domain.

Use `OpenAPIHono` and `createRoute` for new endpoints. Mount API routes under `/api/v1`. Use `ApiError` and the centralized error handler instead of inventing response formats in individual routes.

The actual documentation endpoints are:

```text
GET /api/v1/health
GET /api/v1/doc
GET /api/v1/openapi.json
GET /api/v1/swagger
```

The startup log in `backend/src/index.ts` currently prints stale `/api/doc` and `/api/swagger` paths. Use the paths above until that log is corrected.

### Authentication and authorization

The backend authentication flow is:

1. Require a `Bearer` token.
2. Validate it with `supabase.auth.getUser(token)`.
3. Load the application user, role, campus, and department from PostgreSQL.
4. Reject missing application profiles and inactive accounts.
5. Attach the resulting `AuthUser` to the Hono context.

Preserve these rules:

- Use `authMiddleware` for authentication.
- Use `requireRole` for role gates.
- Use centralized scope helpers and proposal-access policies for campus/department authorization.
- Re-check authorization for child resources by loading their parent record.
- Treat route guards as convenience only. Server-side authorization is mandatory.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend code.

Roles are centralized in `backend/src/lib/types.ts`. Do not duplicate role-name strings without a concrete reason.

The backend auth cache is process-local and can retain application user data for up to five minutes. Role and active-status changes may therefore take time to propagate, and separate replicas do not share invalidation. Any authorization-sensitive update should invalidate the local cache and should not assume cross-instance invalidation.

### Database and migrations

Schema definitions live in `backend/src/db/schema/`; relations live in `backend/src/db/relations.ts`; committed migrations live in `backend/drizzle/`.

Use this workflow:

```bash
cd backend
pnpm db:generate   # Generate a reviewed migration after schema changes
pnpm db:migrate    # Apply committed migrations
pnpm db:studio     # Inspect a development database
```

`pnpm db:push` is for disposable development databases only. Do not use it as a replacement for reviewed migrations in shared, staging, or production environments.

Migration rules:

- Review generated SQL before committing it.
- Preserve foreign keys, unique constraints, check constraints, and partial indexes.
- Prefer soft deletion through `archivedAt` over physical deletion.
- Filter archived records in reads unless an archive view is intentional.
- Use transactions for state transitions and their audit entries.
- Keep important integrity rules in PostgreSQL as well as in application validation.
- Do not run migrations automatically in production until the Drizzle migration journal has been reconciled with the existing database.

The database client disables prepared statements for compatibility with transaction poolers. Preserve that setting when changing connection code.

### Audit logging

Use `insertAuditLog` for important state changes. Include:

- The acting user or explicit system executor.
- A concise action description.
- The affected table.
- Old and new values when useful.
- The source IP when a real client IP exists.

Pass the transaction executor when the audit record must commit atomically with the data change. A loopback IP used by a scheduled job is a system-job marker, not a real client address.

### Files and Supabase Storage

Keep document storage private. New document operations must:

- Validate file signatures, not only MIME types.
- Sanitize user-controlled filenames.
- Generate server-controlled storage paths.
- Hash uploaded files when integrity matters.
- Check proposal or parent-resource scope before upload, download, or signed URL generation.
- Remove an uploaded object if the database record cannot be committed.
- Use short-lived signed URLs for confidential documents.
- Audit uploads and downloads.

Avatars are intentionally public; proposal documents, reports, MOAs, and special orders are not.

The current file hash implementation reads the complete file into memory. Keep upload limits bounded and consider streaming if file sizes or concurrency grow.

### External services

External calls are privileged boundaries and must fail safely:

- Supabase service-role operations stay backend-only.
- Resend calls must inspect the SDK response's returned `error` object, not only catch thrown exceptions.
- Email failures must not silently report success.
- Dynamic email content must be escaped before interpolation into HTML.
- Sentry must not receive passwords, session secrets, service keys, or unnecessary personal data.
- External integrations should be mocked in boundary tests and tested against a sandbox or contract where provider behavior matters.

### Scheduled jobs

The backend starts these jobs from `backend/src/index.ts`:

| Job | Schedule | Rule |
| --- | --- | --- |
| MOA expiration | Daily at 01:00 | Notify and expire linked ongoing projects |
| Report overdue | Daily at 02:00 | Mark missed reporting milestones and notify recipients |
| Privacy retention | Sunday at 03:00 | Archive eligible closed records |

Every scheduled job must:

- Use a unique `withCronLock` name.
- Be safe to run more than once.
- Use notification deduplication where messages are emitted.
- Renew long-running leases.
- Record an audit entry for important automated state changes.
- Log failures without terminating the HTTP process.

Jobs currently run inside every web process. Database leases prevent duplicate work, but restarts can delay execution and host timezone controls when cron expressions fire. Keep deployment timezone explicit. Business-critical jobs should eventually move to a dedicated worker, Azure WebJob, or Azure Function.

## Frontend Practices

### Routing

Use file-based TanStack Router routes under `frontend/src/routes/`. Never manually edit `frontend/src/routeTree.gen.ts`; it is generated.

Preserve the current route conventions:

- Public pages live outside `_authenticated`.
- Authenticated pages live below `_authenticated.tsx`.
- Use `beforeLoad` for redirects and role-aware navigation.
- Validate URL search state with schemas.
- Use `loaderDeps` for filter and pagination dependencies.
- Preload route data with `context.queryClient.ensureQueryData(...)`.
- Keep server authorization in the backend/server function even when a route has a frontend guard.

### Server functions, sessions, and API access

Put backend calls in domain feature modules, normally `features/<domain>/*.functions.ts`:

- Validate inputs with Zod.
- Obtain tokens through `getValidAccessToken()`.
- Use `getErrorMessage()` for backend error extraction.
- Check `response.ok` before parsing success data.
- Keep server-only modules behind server-function boundaries.
- Never import `session.server.ts` into ordinary client components.
- Keep redirects restricted to safe relative paths.

Important API responses are currently represented largely by TypeScript casts. Treat network JSON as untrusted and add runtime Zod validation when a response controls authorization, persistence, financial values, or workflow state.

### TanStack Query

Keep server state in TanStack Query rather than duplicating it in local component state:

- Export stable `queryOptions(...)` factories per domain.
- Use route loaders to prefetch data needed for first render.
- Use explicit stale times for expensive or slowly changing data.
- Invalidate the smallest affected query-key families after mutations.
- Expose query errors and provide retry behavior; do not turn a failed lookup into an empty successful list.
- Avoid fetching large unbounded lists only to filter and paginate in the browser.

There is no global query retry or stale-time policy currently. Feature modules must be consistent until a shared policy is introduced.

### Components, forms, and state

- Put domain behavior in `frontend/src/features/<domain>/`.
- Use `frontend/src/components/ui/` primitives before creating new controls.
- Use `components/custom/` for application-specific composition.
- Use React Hook Form with Zod for forms.
- Use reducers for multi-field view state and complex wizards.
- Use TanStack Query for server state, not a new global store.
- Keep pure transformations in small helpers and test them independently.
- Use `startTransition` or `useDeferredValue` for expensive search/filter interactions where appropriate.

### Styling and accessibility

Use the existing Tailwind v4 and token-based design system:

- Prefer semantic tokens such as `bg-background`, `text-foreground`, `border-border`, and `text-muted-foreground`.
- Use `cn(...)` for conditional classes.
- Use CVA for reusable component variants.
- Prefer existing Base UI/shadcn primitives.
- Avoid hard-coded colors when a theme token exists.
- Keep dark mode token-driven.

Every new interaction should be checked for:

- A semantic button or link instead of a clickable `div`.
- A visible or programmatic accessible name for icon-only controls.
- Keyboard operation and focus visibility.
- Correct form labels and field errors.
- Loading, empty, error, and success states.
- Appropriate contrast for text, borders, status badges, and disabled controls.
- Screen-reader announcements for important errors and global loading state.

### Loading and error behavior

Use page-shaped skeletons for loading, a distinct empty state when there is no data, and a distinct error state when fetching failed. Mutations should disable duplicate submission and invalidate affected queries after success.

Do not show raw backend errors to users unless they are intentionally safe and useful. Log diagnostic details server-side and show a stable human-readable message in the UI.

## Testing Strategy

Testing is intentionally layered. Keep fast tests independent from databases and external services; use real PostgreSQL only for behavior that depends on database constraints, transactions, joins, or migrations.

### Backend commands

From `backend/`:

```bash
pnpm typecheck
pnpm test:unit
pnpm test:boundary
pnpm test
pnpm test:integration
pnpm build
```

Test layers:

- `*.unit.test.ts`: pure policy, validation, transformation, and helper behavior. No database, network, filesystem, or global mocks.
- `*.boundary.test.ts`: controlled Supabase, Resend, and cron boundary behavior. No production network calls.
- `*.test.ts`: route and application tests using the repository's existing test setup.
- `*.integration.spec.ts`: real PostgreSQL tests using committed Drizzle migrations and sequential cleanup.

### Integration database safety

Backend integration tests require a disposable local PostgreSQL database. They must never use production, a shared development database, or the application's normal `DATABASE_URL`.

Create `backend/.env.test` locally with separate values for `DATABASE_URL` and `INTEGRATION_DATABASE_URL`. The file is ignored by Git and is loaded automatically by `backend/test/integration/run.ts`:

```text
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/neust_epms_app_test
INTEGRATION_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/neust_epms_test
```

The runner:

1. Requires both URLs.
2. Rejects identical normalized database targets.
3. Requires the integration target to be local.
4. Applies Drizzle migrations.
5. Runs only `*.integration.spec.ts` files sequentially.
6. Truncates public application tables between tests.

No Docker is required by the current integration harness. If a cleanup hook times out, stop competing test processes and rerun one integration command at a time; do not point the runner at a shared database or simply raise timeouts without finding the lock/connection cause.

### Frontend commands

From `frontend/`:

```bash
pnpm test
pnpm check
pnpm lint
pnpm format
pnpm build
```

Frontend tests currently focus on server functions, API utilities, permission logic, and pure feature helpers. Component, route, browser end-to-end, and automated accessibility coverage are still limited.

### Recommended pre-PR verification

Run the checks relevant to the change. For a full-stack change, use:

```bash
pnpm --filter backend typecheck
pnpm --filter backend test:unit
pnpm --filter backend test:boundary
pnpm --filter backend test
pnpm --filter frontend check
pnpm --filter frontend lint
pnpm --filter frontend test
pnpm --filter backend build
pnpm --filter frontend build
```

Run `pnpm --filter backend test:integration` for database behavior, migrations, transaction behavior, cron workflows, or authorization queries. Record environment limitations rather than claiming an unexecuted integration suite passed.

## Environment and Secret Rules

Never commit or share:

- `.env`, `.env.*`, `.env.local`, or credentials copied from a deployed service.
- `SUPABASE_SERVICE_ROLE_KEY`.
- `SESSION_SECRET`.
- Database passwords or connection strings.
- Resend API keys.
- Azure, Cloudflare, or Sentry credentials.

The repository ignores environment files while retaining `.env.example` templates. Do not paste local environment contents into issues, pull requests, logs, or chat.

Backend production rules:

- Use exact frontend origins in `CORS_ORIGINS`, without a path, wildcard, or trailing slash.
- Do not set Azure's `PORT`; Azure provides it.
- Keep `TRUST_PROXY=false` unless the service is behind a trusted reverse proxy and client-IP behavior has been reviewed.
- Keep the service-role key server-only.
- Keep `RESEND_FROM` on a verified sending domain.

Frontend production rules:

- Only expose variables intentionally prefixed for browser use or explicitly required by TanStack Start runtime behavior.
- Keep `SESSION_SECRET` server-only.
- Coordinate `API_URL`, frontend origin, backend CORS, Supabase URL, and cookie settings as one deployment contract.

## Deployment

### Backend: Azure App Service

The backend deploys independently to Azure App Service. Follow `docs/azure-backend-deployment.md` and run deployment commands from `backend/`, not the repository root.

Expected runtime:

- Linux App Service
- Node 22 LTS
- Startup command: `node dist/index.js`
- Health check: `/api/v1/health`
- HTTPS Only enabled
- Always On enabled while cron jobs run in the web process

Before deployment:

```bash
cd backend
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

Production database migrations require an explicit review of the Drizzle migration journal. Do not enable automatic migration commands against a manually created or unbaselined database.

The current GitHub workflow at `.github/workflows/main_neust-epms-api.yml` deploys when `main` receives changes under `backend/**`. Its build job currently packages source without running install, typecheck, tests, or build. Treat it as deployment automation, not a complete CI quality gate.

### Frontend: Cloudflare

The frontend uses the Cloudflare Vite plugin and Wrangler:

```bash
cd frontend
pnpm build
pnpm deploy
```

`pnpm start` runs the generated Node server locally; it is not the same runtime as the Cloudflare deployment. Configure Cloudflare project authentication, production environment variables, API URL, Supabase values, and rollback procedure before enabling deployment automation.

## Pull Request Checklist

- [ ] The change follows the backend module or frontend feature boundary.
- [ ] Authentication and authorization are enforced server-side.
- [ ] Archived records and scope rules are handled correctly.
- [ ] Database changes use a reviewed Drizzle migration.
- [ ] Audit logging is included for important state transitions.
- [ ] External failures are handled explicitly and cannot report false success.
- [ ] Files and secrets are not exposed or committed.
- [ ] Frontend changes include loading, empty, error, and accessible interaction states.
- [ ] Relevant unit, boundary, integration, frontend, typecheck, and build commands were run.
- [ ] Documentation and environment examples match the implementation.

## Current Gaps To Resolve

These are known repository gaps, not conventions to copy:

- The root `pnpm test` command is a placeholder and should become a real workspace verification command.
- The deployment workflow does not currently validate the backend before deployment.
- Backend Node runtime says 22.x while esbuild targets Node 20; standardize the support policy.
- Frontend API defaults and development ports are inconsistent; use explicit `API_URL` until standardized.
- Frontend API response runtime validation is limited and relies heavily on TypeScript casts.
- Frontend component, route, browser end-to-end, and accessibility test coverage is limited.
- Scheduled jobs run in the web process and have no visible graceful shutdown handling.
- The backend request timeout does not automatically cancel the underlying operation.
- Auth cache invalidation is process-local and can be stale across replicas.
- No RLS policies are present in the committed database migrations; authorization currently relies on backend code.
- Azure deployment documentation contains inconsistent build-command names and should be reconciled.
- Requirements documentation describes parts of the client as Next.js and the system as microservices, while the implementation is TanStack Start plus one Hono API in a pnpm monorepo. Update the requirements or mark it as historical.

## Documentation Index

- `docs/requirements.md`: product and system requirements.
- `docs/usecases.md`: use cases.
- `docs/dfd.md`: data-flow documentation.
- `docs/azure-backend-deployment.md`: Azure backend deployment procedure.
- `docs/plans/`: implementation plans and design decisions.
- `docs/ux-research/`: personas, journeys, pain points, and accessibility research.
- `backend/test/integration/README.md`: focused PostgreSQL integration-test setup.

When code and documentation disagree, verify the implementation and update the relevant documentation in the same change. Avoid adding a second source of truth.
