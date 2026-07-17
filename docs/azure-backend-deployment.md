# Simple Backend Deployment to Azure App Service

This deploys only `backend/` to Azure App Service on Linux. Azure should receive
the contents of `backend/` as the app root. The repository root also contains
the frontend and should not be deployed as the API app.

## 1. Prepare `backend/`

Azure App Service does not use a `Procfile` or a release process. The backend
already has the required `build` and `start` scripts:

```json
"scripts": {
  "build": "pnpm typecheck && esbuild src/index.ts --bundle --platform=node --format=esm --target=node20 --packages=external --outfile=dist/index.js",
  "start": "node dist/index.js"
}
```

Make sure `backend/package.json` contains:

```json
"engines": {
	  "node": "22.x"
},
"packageManager": "pnpm@11.13.1"
```

Add `backend/server.js` so Azure's Node build detection recognizes the app:

```js
import "./dist/index.js";
```

Add `backend/pnpm-workspace.yaml` so the standalone deployment permits the
esbuild install script:

```yaml
allowBuilds:
  esbuild: true
```

Make sure the backend has its own lockfile:

```bash
cd backend
pnpm install --lockfile-only --ignore-workspace
```

This must create `backend/pnpm-lock.yaml`. Do not commit `node_modules/`,
`dist/`, or `.env` files.

## 2. Create the App Service App

In the Azure Portal, create an **App Service** with these settings:

- Publish: **Code**
- Runtime stack: **Node 22 LTS**
- Operating system: **Linux**
- Region: choose the region closest to your users and database
- Pricing plan: **Basic B1 or higher** for production and Always On

Record these values:

```text
AZURE_RESOURCE_GROUP=<resource-group-name>
AZURE_APP_NAME=<globally-unique-app-name>
```

## 3. Configure Build and Startup

Open the app in the Azure Portal and go to **Settings > Environment variables**.
Add these App Settings:

```text
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

Azure runs `npm install` and `npm run build` after receiving the backend source.
This avoids deploying pnpm's linked `node_modules` tree, which Azure can
repackage without transitive runtime dependencies.

Only add this setting after confirming that the target database uses this
repository's Drizzle migration journal:

```text
POST_BUILD_COMMAND=corepack pnpm db:migrate
```

If the schema is already current and all repository migrations are recorded,
omit `POST_BUILD_COMMAND`. If the schema was created manually or by Supabase
SQL and the Drizzle journal is missing, do not run it blindly; Drizzle may try
to create tables that already exist. Baseline or reconcile the database first.

Check the journal in the Supabase SQL Editor:

```sql
select id, hash, created_at
from drizzle.__drizzle_migrations
order by id;
```

This repository currently contains three migrations: `0000`, `0001`, and
`0002`. The journal must contain the corresponding applied migrations before
the automatic command is enabled.

Set the startup command under **Settings > Configuration > General settings >
Stack settings**:

```text
node dist/index.js
```

Azure provides the `PORT` environment variable. The backend already reads it
from `env.PORT`.

Turn on:

- **HTTPS Only**
- **Always On**, because the current cron jobs run inside the web process

## 4. Set App Settings

Add these values under **Settings > Environment variables > App settings**:

```text
NODE_ENV=production
DATABASE_URL=<production PostgreSQL URL>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service-role key>
CORS_ORIGINS=https://<frontend-domain>
```

Optional values:

```text
SENTRY_DSN=<Sentry DSN>
RESEND_API_KEY=<Resend API key>
RESEND_FROM=noreply@neust.edu.ph
DB_POOL_MAX=20
```

Rules:

- Do not set `PORT`; Azure sets it automatically.
- `CORS_ORIGINS` must be the exact frontend origin.
- Do not include a trailing slash, path, API path, or `*` in `CORS_ORIGINS`.
- Keep `TRUST_PROXY=false` with the current client-IP implementation.
- Never commit production secrets.

## 5. Deploy from `backend/`

Install and sign in to Azure CLI:

```bash
az login
```

From the `backend/` directory, deploy the backend only:

```bash
az webapp up \
  --name "$AZURE_APP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP"
```

On Windows PowerShell, use one line if needed:

```powershell
az webapp up --name $env:AZURE_APP_NAME --resource-group $env:AZURE_RESOURCE_GROUP
```

For later deployments, run the same command from `backend/`. Do not run it from
the repository root.

## 6. Configure Health Monitoring

In the Azure Portal, open **Monitoring > Health check** and set the path to:

```text
/api/v1/health
```

The endpoint checks the database and returns `200` when healthy or `503` when
the database is unavailable. Health check requests must remain anonymous.

## 7. Verify the Deployment

Stream application logs:

```bash
az webapp log tail \
  --name "$AZURE_APP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP"
```

Check the API:

```bash
curl https://<app-name>.azurewebsites.net/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "db": "connected",
  "timestamp": "..."
}
```

Then verify from the deployed frontend:

- Browser requests use the Azure API URL.
- CORS allows the exact frontend origin.
- Authenticated requests reach protected routes.
- Unauthorized proposal document uploads are rejected.
- Super Admin role boundaries remain enforced.
- Retention-hold controls remain available to Super Admin.

## Cron Warning

The current `pnpm start` process starts the three `node-cron` jobs as well as
the HTTP server. Always On keeps the app loaded, but restarts can still delay a
scheduled job. Multiple instances may start the same schedules; the existing
database locks and notification deduplication protect against duplicate work.

If these jobs become business-critical, move them to Azure WebJobs, Azure
Functions, or a dedicated worker instead of relying on the web process.

## Common Problems

**Azure uses npm and the build fails**

Confirm that `SCM_DO_BUILD_DURING_DEPLOYMENT` is `true` and
`CUSTOM_BUILD_COMMAND` is exactly:

```text
corepack pnpm install --frozen-lockfile && corepack pnpm build
```

**The app starts but returns errors**

Check missing App Settings, invalid production CORS configuration, database
connectivity, and the App Service log stream.

**Health check returns `503`**

Verify `DATABASE_URL`, database credentials, network access, and migration
status.

**Azure cannot find the application files**

The deployment was started from the repository root. Run `az webapp up` from
`backend/` so `package.json` is at the deployed root.

## CI/CD

CI/CD is optional for the first deployment. Manual `az webapp up` deployments
are sufficient. GitHub Actions can be added later to run backend type checks and
tests before deploying to App Service.

## Official References

- [Configure Node.js Apps in App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs)
- [Create a Node.js Web App](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs)
- [Configure App Service App Settings](https://learn.microsoft.com/en-us/azure/app-service/configure-common)
- [App Service Health Check](https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check)
- [Deploy with GitHub Actions](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions)
- [Oryx Node.js Build Behavior](https://github.com/microsoft/Oryx/blob/main/doc/runtimes/nodejs.md)
