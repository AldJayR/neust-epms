# Simple Backend Deployment to Heroku

This deploys only `backend/` to Heroku. Heroku must see the contents of
`backend/` as the app root. Do not deploy the repository root, because it also
contains the frontend.

## 1. Prepare `backend/`

Create `backend/Procfile` without a file extension:

```text
release: pnpm db:migrate
web: pnpm start
```

Add the Node.js engine to `backend/package.json`:

```json
"engines": {
  "node": "24.x"
}
```

Keep the existing exact pnpm version:

```json
"packageManager": "pnpm@11.13.1"
```

Create a lockfile for the backend as a standalone app:

```bash
cd backend
pnpm install --lockfile-only --ignore-workspace
```

This must create `backend/pnpm-lock.yaml`. Do not commit `node_modules/`,
`dist/`, or `.env` files.

## 2. Create the Heroku App

```bash
heroku login
heroku create neust-epms-api
heroku git:remote -a neust-epms-api
```

Replace `neust-epms-api` with the actual app name.

## 3. Deploy Only the Backend

### Separate Backend Repository

If the backend has its own repository, deploy normally from that repository:

```bash
git add .
git commit -m "Configure backend deployment"
git push heroku main
```

### This Existing Repository

From the repository root, deploy the `backend/` subtree:

```bash
git add backend
git commit -m "Configure backend deployment"
git subtree push --prefix backend heroku main
```

The deployed Heroku root will contain `package.json`, `Procfile`, and
`pnpm-lock.yaml` directly. It will not contain a `backend/` directory.

## 4. Set Config Vars

Set these in the Heroku Dashboard under **Settings > Config Vars**:

```text
NODE_ENV=production
DATABASE_URL=<production PostgreSQL URL>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service-role key>
CORS_ORIGINS=https://<frontend-domain>
```

Optional variables:

```text
SENTRY_DSN=<Sentry DSN>
RESEND_API_KEY=<Resend API key>
RESEND_FROM=noreply@neust.edu.ph
DB_POOL_MAX=20
```

Rules:

- Do not set `PORT`; Heroku sets it automatically.
- `CORS_ORIGINS` must be the exact frontend origin.
- Do not include a trailing slash, path, API path, or `*` in `CORS_ORIGINS`.
- Keep `TRUST_PROXY=false` with the current client-IP implementation.
- Never commit production secrets.

## 5. Verify the Deployment

Check the release and dyno:

```bash
heroku releases -a neust-epms-api
heroku ps -a neust-epms-api
heroku logs --tail -a neust-epms-api
```

Check the API health endpoint:

```bash
curl https://neust-epms-api.herokuapp.com/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "db": "connected",
  "timestamp": "..."
}
```

The `release` process runs `pnpm db:migrate` before the new web dyno starts.
If the migration fails, the release is not deployed.

## Cron Warning

The current `pnpm start` process also starts the three `node-cron` jobs. They
only run while the web dyno is alive. This is acceptable for an initial
best-effort deployment, but use one-shot commands with Heroku Scheduler or a
dedicated worker if these jobs are business-critical.

Do not configure Heroku Scheduler to run `pnpm start`; it starts the long-running
web server instead of a one-shot job.

## Common Problems

**Heroku cannot find `package.json`**

The repository root was deployed instead of the backend subtree. Use
`git subtree push --prefix backend heroku main` or a separate backend
repository.

**Heroku installs npm instead of pnpm**

Confirm that the deployed root contains both `package.json` and
`pnpm-lock.yaml`, and that `packageManager` specifies an exact pnpm version.

**The dyno crashes**

Check for missing environment variables, invalid production CORS configuration,
database connection errors, or missing build output in the Heroku logs.

## Official References

- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Deploying with Git](https://devcenter.heroku.com/articles/git)
- [Heroku Procfiles](https://devcenter.heroku.com/articles/procfile)
- [Heroku Release Phase](https://devcenter.heroku.com/articles/release-phase)
- [Heroku Scheduler](https://devcenter.heroku.com/articles/scheduler)
