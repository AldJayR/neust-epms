# PostgreSQL Audit Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 8 findings from the PostgreSQL/Supabase database audit: broken migration chain, missing indexes, OFFSET pagination, UUIDv4 fragmentation, client-side filtering, and dashboard query optimization.

**Architecture:** All changes are backend-only (Hono + Drizzle ORM + PostgreSQL). Migrations use Drizzle Kit. Index changes are additive (no destructive operations). Pagination refactors are backwards-compatible with existing clients.

**Tech Stack:** PostgreSQL (Supabase), Drizzle ORM v0.45, Drizzle Kit v0.31, Hono, TypeScript

---

### Task 1: Squash Migration Chain (Finding 1)

**Files:**
- Delete: `backend/drizzle/0000_wet_hydra.sql`
- Delete: `backend/drizzle/0001_tidy_daimon_hellstrom.sql`
- Delete: `backend/drizzle/0002_wet_bloodaxe.sql`
- Delete: `backend/drizzle/meta/` (entire directory)
- Modify: `backend/drizzle.config.ts` (no changes needed — config is fine)
- Generated: `backend/drizzle/0000_<new_snapshot>.sql` (will be auto-generated)
- Generated: `backend/drizzle/meta/` (will be auto-generated)

**Step 1: Confirm current schema files match production database**

Run: `cd backend && pnpm exec drizzle-kit check`
Expected: "No schema changes detected" or list of diff items.

If there are diffs, note them — they'll be captured in the new baseline.

**Step 2: Delete existing migration artifacts**

```bash
Remove-Item -LiteralPath "backend\drizzle\0000_wet_hydra.sql" -Force
Remove-Item -LiteralPath "backend\drizzle\0001_tidy_daimon_hellstrom.sql" -Force
Remove-Item -LiteralPath "backend\drizzle\0002_wet_bloodaxe.sql" -Force
Remove-Item -LiteralPath "backend\drizzle\meta" -Recurse -Force
```

**Step 3: Generate fresh baseline migration**

```bash
cd backend
pnpm exec drizzle-kit generate
```

Expected: Creates `backend/drizzle/0000_<name>.sql` with full CREATE TABLE/INDEX statements matching the current 20 schema files. Creates `backend/drizzle/meta/_journal.json` with single entry.

**Step 4: Verify the generated SQL**

Read the new `0000_<name>.sql` and confirm:
- All 21 tables present
- All FK constraints present
- All indexes present (including any new ones from later tasks migrated in)
- No stray legacy columns (`employee_id`, `campus_id` on departments)

**Step 5: Apply migration (if connected to dev DB)**

```bash
cd backend
pnpm exec drizzle-kit migrate
```

**Step 6: Commit**

```bash
git add backend/drizzle/
git commit -m "fix: squash migration chain into single baseline"
```

---

### Task 2: Add Missing Indexes (Findings 2, 3, 10)

**Files:**
- Modify: `backend/src/db/schema/moas.ts` — add partial indexes + valid_until index
- Modify: `backend/src/db/schema/proposals.ts` — add partial index for soft-delete
- Modify: `backend/src/db/schema/projects.ts` — add partial index for soft-delete
- Modify: `backend/src/db/schema/project-reports.ts` — add partial index for soft-delete
- Modify: `backend/src/db/schema/special-orders.ts` — add partial index for soft-delete
- Generated: `backend/drizzle/0001_<name>.sql` (new migration)

**Step 1: Add partial indexes to `moas.ts`**

Current schema has no `(table) => ({})` block. Change:

```typescript
import { pgTable, uuid, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const moas = pgTable("moas", {
  // ... existing columns unchanged ...
}, (table) => ({
  validUntilIdx: index("moas_valid_until_idx").on(table.validUntil),
  activeIdx: index("moas_active_idx")
    .on(table.validUntil)
    .where(sql`${table.archivedAt} IS NULL`),
  notExpiredIdx: index("moas_not_expired_idx")
    .on(table.isExpired)
    .where(sql`${table.archivedAt} IS NULL`),
}));
```

**Step 2: Add partial index to `proposals.ts`**

Add to existing `(table) => ({})` block:

```typescript
activeStatusIdx: index("proposals_active_status_idx")
  .on(table.currentStatus)
  .where(sql`${table.archivedAt} IS NULL`),
```

**Step 3: Add partial index to `projects.ts`**

Add to existing `(table) => ({})` block:

```typescript
activeStatusIdx: index("projects_active_status_idx")
  .on(table.projectStatus)
  .where(sql`${table.archivedAt} IS NULL`),
```

**Step 4: Add partial index to `project-reports.ts`**

Add to existing `(table) => ({})` block:

```typescript
activeProjectIdx: index("project_reports_active_project_idx")
  .on(table.projectId)
  .where(sql`${table.archivedAt} IS NULL`),
```

**Step 5: Add partial index to `special-orders.ts`**

Add to existing `(table) => ({})` block:

```typescript
activeStatusIdx: index("so_active_status_idx")
  .on(table.status)
  .where(sql`${table.archivedAt} IS NULL`),
```

**Step 6: Generate migration**

```bash
cd backend
pnpm exec drizzle-kit generate
```

**Step 7: Verify generated SQL**

Read the new `0001_<name>.sql`. Confirm:
- 6 `CREATE INDEX CONCURRENTLY` statements or regular `CREATE INDEX`
- No destructive operations (no DROP, ALTER)

Note: For large production tables, consider using `CREATE INDEX CONCURRENTLY` in the migration SQL to avoid table locking. If auto-generated uses regular `CREATE INDEX`, manually edit the SQL to add `CONCURRENTLY`:

```sql
CREATE INDEX CONCURRENTLY "moas_valid_until_idx" ON "moas" USING btree ("valid_until");
-- etc.
```

**Step 8: Apply migration**

```bash
cd backend
pnpm exec drizzle-kit migrate
```

**Step 9: Commit**

```bash
git add backend/src/db/schema/moas.ts
git add backend/src/db/schema/proposals.ts
git add backend/src/db/schema/projects.ts
git add backend/src/db/schema/project-reports.ts
git add backend/src/db/schema/special-orders.ts
git add backend/drizzle/0001_<name>.sql
git add backend/drizzle/meta/
git commit -m "feat: add indexes on soft-delete tables and moas.valid_until"
```

---

### Task 3: UUIDv7 Migration (Finding 5)

**Files:**
- Create: `backend/src/db/scripts/uuid-v7.sql` — SQL function for UUIDv7 generation
- Modify: ALL schema files with UUID PK `defaultRandom()` — switch to UUIDv7
- Generated: `backend/drizzle/0002_<name>.sql` — function creation migration

**Approach:** UUIDv7 encodes the current timestamp in the first 48 bits, producing time-ordered UUIDs that don't fragment B-tree indexes. Supabase/PostgreSQL doesn't have a built-in UUIDv7 function, so we create one using `pgcrypto` (already available via Supabase).

**Step 1: Write UUIDv7 PL/pgSQL function**

Create `backend/src/db/scripts/uuid-v7.sql` (reference file, not a migration):

```sql
-- UUID v7 generation function
-- Generates time-ordered UUIDs to reduce B-tree index fragmentation.
-- Requires: pgcrypto extension (for gen_random_bytes)
-- Based on: https://www.ietf.org/archive/id/draft-peabody-dispatch-new-uuid-format-01.html

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  timestamp    TIMESTAMPTZ;
  unix_ts_ms   BIGINT;
  uuid_bytes   BYTEA;
BEGIN
  timestamp    = clock_timestamp();
  unix_ts_ms   = (EXTRACT(EPOCH FROM timestamp) * 1000)::BIGINT;

  uuid_bytes   = overlay(
                   overlay(
                     gen_random_bytes(16)
                     PLACING substring(int8send(unix_ts_ms) FROM 3)  -- 6 bytes: unix timestamp ms
                     FROM 1 FOR 6
                   )
                   PLACING '\x70' -- version 7
                   FROM 7 FOR 1
                 );

  -- Set variant bits (RFC 4122)
  uuid_bytes   = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);

  RETURN uuid(uuid_bytes);
END;
$$ LANGUAGE plpgsql
VOLATILE;
```

**Step 2: Create migration for the function**

Create a manual migration file `backend/drizzle/0002_uuid_v7_function.sql`:

```sql
-- Custom migration: add uuid_generate_v7() function
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  timestamp    TIMESTAMPTZ;
  unix_ts_ms   BIGINT;
  uuid_bytes   BYTEA;
BEGIN
  timestamp    = clock_timestamp();
  unix_ts_ms   = (EXTRACT(EPOCH FROM timestamp) * 1000)::BIGINT;

  uuid_bytes   = overlay(
                   overlay(
                     gen_random_bytes(16)
                     PLACING substring(int8send(unix_ts_ms) FROM 3)
                     FROM 1 FOR 6
                   )
                   PLACING '\x70'
                   FROM 7 FOR 1
                 );

  uuid_bytes   = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);

  RETURN uuid(uuid_bytes);
END;
$$ LANGUAGE plpgsql
VOLATILE;
```

Then register it in the journal or apply manually.

**Step 3: Update schema files from `defaultRandom()` to `default(sql`uuid_generate_v7()``)**

For each schema file with a UUID PK, change:

```typescript
// BEFORE:
import { pgTable, uuid, ... } from "drizzle-orm/pg-core";
proposalId: uuid("proposal_id").primaryKey().defaultRandom(),

// AFTER:
import { pgTable, uuid, ... } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
proposalId: uuid("proposal_id").primaryKey().default(sql`uuid_generate_v7()`),
```

Files to modify:
- `backend/src/db/schema/proposals.ts`
- `backend/src/db/schema/projects.ts`
- `backend/src/db/schema/moas.ts`
- `backend/src/db/schema/audit-logs.ts`
- `backend/src/db/schema/proposal-members.ts`
- `backend/src/db/schema/proposal-documents.ts`
- `backend/src/db/schema/proposal-comments.ts`
- `backend/src/db/schema/proposal-reviews.ts`
- `backend/src/db/schema/special-orders.ts`
- `backend/src/db/schema/project-reports.ts`
- `backend/src/db/schema/users.ts`

Note: `defaultRandom()` calls `gen_random_uuid()` (UUIDv4) at the PostgreSQL level.  
The new `default(sql`uuid_generate_v7()``) calls our custom function.  
Existing rows are NOT migrated — only NEW rows use UUIDv7. This is acceptable.

**Step 4: Generate migration for the Drizzle schema change**

```bash
cd backend
pnpm exec drizzle-kit generate
```

This will produce `0003_<name>.sql` with `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT uuid_generate_v7()` for each table.

**Step 5: Apply migrations in order**

```bash
cd backend
# First apply the manual function migration
# Then apply the Drizzle-generated migration
pnpm exec drizzle-kit migrate
```

**Step 6: Commit**

```bash
git add backend/src/db/scripts/uuid-v7.sql
git add backend/drizzle/0002_uuid_v7_function.sql
git add backend/drizzle/0003_<name>.sql
git add backend/drizzle/meta/
git add <all modified schema files>
git commit -m "feat: migrate to UUIDv7 for ordered primary keys"
```

---

### Task 4: Keyset Pagination (Finding 4)

**Files:**
- Modify: `backend/src/routes/proposals.routes.ts` — list endpoint
- Modify: `backend/src/routes/projects.routes.ts` — list endpoint
- Modify: `backend/src/routes/members.routes.ts` — list endpoint
- Modify: `backend/src/routes/reports.routes.ts` — list endpoint
- Modify: `backend/src/routes/moas.routes.ts` — list endpoint
- Modify: `backend/src/routes/special-orders.routes.ts` — list endpoint
- Modify: `backend/src/routes/audit.routes.ts` — list endpoint
- Modify: `backend/src/routes/director.routes.ts` — hub list, faculty directory, MOA repository
- Modify: `backend/src/routes/storage.routes.ts` — document list
- Modify: `backend/src/routes/settings.routes.ts` — settings list

**Design:** All list endpoints currently use `page` + `limit` + `offset`. We add an optional `cursor` parameter (ISO 8601 timestamp of `createdAt` of the last item on the previous page). If `cursor` is provided, use `WHERE created_at < cursor` instead of `OFFSET`. The response includes `nextCursor` when there are more results.

This is backwards-compatible: old clients sending `page=1` still work.

**Step 1: Create keyset pagination helper**

Create `backend/src/lib/pagination.ts`:

```typescript
import { z } from "@hono/zod-openapi";
import { and, lt, or, eq, type SQL, type TableConfig } from "drizzle-orm";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";

/**
 * Keyset pagination query schema fragment.
 * Use in place of `offset((page - 1) * limit)`.
 */
export const KeysetPaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    param: { name: "limit", in: "query" },
  }),
  cursor: z.string().datetime().optional().openapi({
    param: {
      name: "cursor",
      in: "query",
      description: "ISO 8601 timestamp cursor for keyset pagination (createdAt of last item)",
    },
  }),
});

export type KeysetPagination = z.infer<typeof KeysetPaginationQuery>;

/**
 * Build a WHERE clause for keyset pagination.
 * Assumes `createdAt` (timestamptz) as the sort column with DESC ordering.
 * Falls back to `id` for tiebreaking.
 */
export function keysetWhere<T extends PgTableWithColumns<TableConfig>>(
  table: T,
  cursor: string | undefined,
  existingConditions: SQL[],
  idColumn: keyof T["_"]["columns"],
): SQL[] {
  if (!cursor) return existingConditions;

  const createdAtCol = (table as any).createdAt as SQL | undefined;
  if (!createdAtCol) return existingConditions;

  const cursorDate = new Date(cursor);

  existingConditions.push(
    or(
      lt(createdAtCol, cursorDate),
      and(
        eq(createdAtCol, cursorDate),
        lt(idColumn as any, cursor as any),
      ),
    )!,
  );

  return existingConditions;
}
```

Wait — this approach won't compile cleanly because of complex Drizzle typing. Let me simplify.

**Simpler Step 1:** Instead of a generic helper, handle cursor inline in each route. Change each list endpoint from:

```typescript
// BEFORE (e.g., proposals.routes.ts):
const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({
    param: { name: "page", in: "query" },
  }),
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    param: { name: "limit", in: "query" },
  }),
});
```

to:

```typescript
// AFTER:
const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    param: { name: "limit", in: "query" },
  }),
  cursor: z.string().datetime().optional().openapi({
    param: { name: "cursor", in: "query" },
  }),
});
```

And change the query:

```typescript
// BEFORE:
const offset = (page - 1) * limit;
const rows = await db.select(...).from(table).where(...).orderBy(desc(createdAt)).limit(limit).offset(offset);

// AFTER:
const whereConditions = [isNull(proposals.archivedAt)];
if (cursor) {
  whereConditions.push(lt(proposals.createdAt, new Date(cursor)));
}
const rows = await db.select(...).from(table).where(and(...whereConditions)).orderBy(desc(proposals.createdAt)).limit(limit + 1);

const hasMore = rows.length > limit;
const items = hasMore ? rows.slice(0, limit) : rows;
const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : undefined;
```

**Step 2-9:** Apply the same pattern to each route file.

Key differences per file:
- `proposals.routes.ts:156-162` — cursor on `proposals.createdAt`
- `projects.routes.ts:127-142` — cursor on `projects.createdAt`
- `members.routes.ts:93-99` — cursor on `proposalMembers.addedAt`
- `reports.routes.ts:90-112` — cursor on `projectReports.submittedAt`
- `moas.routes.ts:97-114` — cursor on `moas.validUntil` (DESC order, no tiebreak needed if unique enough)
- `special-orders.routes.ts:92-107` — cursor on `specialOrders.createdAt`
- `audit.routes.ts:136-158` — cursor on `auditLogs.createdAt`
- `director.routes.ts:503-530` (hub) — cursor on `proposals.createdAt`
- `director.routes.ts:160-172` (faculty) — cursor on `users.lastName, users.userId` (string column)
- `director.routes.ts:319-331` (MOA repo) — cursor on `moas.validUntil`
- `storage.routes.ts:178-190` (docs) — cursor on `proposalDocuments.versionNum`
- `settings.routes.ts:84-93` (settings) — cursor on `systemSettings.settingKey` (string column)

Update response schemas to include optional `nextCursor`.

**Step 10: Update response objects**

For each list response, add `nextCursor?: string` to the response schema:

```typescript
const ProposalListSchema = z.object({
  items: z.array(ProposalSchema),
  total: z.number(),
  nextCursor: z.string().optional(),
}).openapi("ProposalList");
```

**Step 11: Run tests**

```bash
cd backend
pnpm exec vitest run
```

**Step 12: Commit**

```bash
git add backend/src/lib/pagination.ts  # if created
git add <all modified route files>
git commit -m "refactor: replace OFFSET pagination with keyset cursor pagination"
```

---

### Task 5: Client-Side Filtering → DB Aggregation (Finding 6)

**Files:**
- Modify: `backend/src/routes/projects.routes.ts:525-541` — closeProjectRoute

**Step 1: Replace client-side array filter with DB aggregation**

Change:

```typescript
const reports = await db
  .select({ reportType: projectReports.reportType })
  .from(projectReports)
  .where(
    and(
      eq(projectReports.projectId, id),
      isNull(projectReports.archivedAt),
    ),
  );

const hasFinalAccomplishment = reports.some(
  (r) => r.reportType === REPORT_TYPE.FINAL_ACCOMPLISHMENT,
);
const hasTerminal = reports.some(
  (r) => r.reportType === REPORT_TYPE.TERMINAL,
);
```

To:

```typescript
const [{ hasFinal, hasTerminal }] = await db
  .select({
    hasFinal: sql<boolean>`bool_or(report_type = ${REPORT_TYPE.FINAL_ACCOMPLISHMENT})`,
    hasTerminal: sql<boolean>`bool_or(report_type = ${REPORT_TYPE.TERMINAL})`,
  })
  .from(projectReports)
  .where(
    and(
      eq(projectReports.projectId, id),
      isNull(projectReports.archivedAt),
    ),
  );

if (!hasFinal) {
  throw new ApiError(
    400,
    "MISSING_FINAL_ACCOMPLISHMENT_REPORT",
    "A Final Accomplishment report must be submitted before closing",
  );
}

if (!hasTerminal) {
  throw new ApiError(
    400,
    "MISSING_TERMINAL_REPORT",
    "A Terminal report must be submitted before closing",
  );
}
```

**Step 2: Add `sql` import to existing imports**

The file already imports from `drizzle-orm` — add `sql` if not present:

```typescript
import { eq, and, isNull, or, inArray, count, sql } from "drizzle-orm";
```

(`sql` may not be imported yet in projects.routes.ts — check and add if missing)

**Step 3: Run tests**

```bash
cd backend
pnpm exec vitest run
```

**Step 4: Commit**

```bash
git add backend/src/routes/projects.routes.ts
git commit -m "perf: replace client-side report filtering with DB aggregation"
```

---

### Task 6: Dashboard Caching (Finding 9)

**Files:**
- Modify: `backend/src/routes/director.routes.ts:546-637` — dashboard route
- Modify: `backend/src/lib/cache.ts` — add dashboard cache if needed

**Step 1: Add dashboard cache to `backend/src/lib/cache.ts`**

```typescript
import type { DashboardMetrics, ChartDataPoint, ActivityItem, ExpiringMoa } from "./types.js";

// Dashboard cache — short TTL since data changes frequently
export const dashboardCache = new LRUCache<string, DashboardCacheValue>({
  max: 10,
  ttl: 1000 * 60 * 2, // 2 minutes
  ttlAutopurge: true,
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

export interface DashboardCacheValue {
  metrics: {
    totalProjects: number;
    ongoingProjects: number;
    underEvaluation: number;
    completed: number;
  };
  chartData: Array<{ label: string; value: number }>;
  recentActivities: Array<{ title: string; description: string; time: string }>;
  expiringMoas: Array<{ name: string; dueText: string }>;
}
```

**Step 2: Wrap dashboard handler with cache check**

Add to `director.routes.ts`:

```typescript
// At top of file, add import:
import { dashboardCache, cacheEnabled } from "../lib/cache.js";

// At start of app.openapi(dashboardRoute, async (c) => {:
app.openapi(dashboardRoute, async (c) => {
  const user = c.get("user");
  const cacheKey = `dashboard:${user.userId}`;

  if (cacheEnabled) {
    const cached = dashboardCache.get(cacheKey);
    if (cached) return c.json(cached, 200);
  }

  // ... existing dashboard logic ...

  const response = {
    metrics: { ... },
    chartData: ...,
    recentActivities: ...,
    expiringMoas: ...,
  };

  if (cacheEnabled) {
    dashboardCache.set(cacheKey, response);
  }

  return c.json(response, 200);
});
```

**Step 3: Run tests**

```bash
cd backend
pnpm exec vitest run
```

**Step 4: Commit**

```bash
git add backend/src/lib/cache.ts
git add backend/src/routes/director.routes.ts
git commit -m "perf: add cache to director dashboard endpoint"
```

---

### Task 7 (Bonus): Consolidate Dashboard Count Queries (Finding 9 — second part)

**Files:**
- Modify: `backend/src/routes/director.routes.ts:551-603`

**Step 1: Replace 4 separate `SELECT count(*)` queries with 1 query using `COUNT(*) FILTER (WHERE ...)`**

Change:

```typescript
const [totalProjectsResult, ongoingProjectsResult, completedProjectsResult, underEvaluationResult] = await Promise.all([
  db.select({ value: count() }).from(projects).where(isNull(projects.archivedAt)),
  db.select({ value: count() }).from(projects).where(and(isNull(projects.archivedAt), eq(projects.projectStatus, PROJECT_STATUS.ONGOING))),
  db.select({ value: count() }).from(projects).where(and(isNull(projects.archivedAt), eq(projects.projectStatus, PROJECT_STATUS.COMPLETED))),
  db.select({ value: count() }).from(proposals).where(
    and(
      isNull(proposals.archivedAt),
      or(
        eq(proposals.currentStatus, PROPOSAL_STATUS.SUBMITTED),
        eq(proposals.currentStatus, PROPOSAL_STATUS.ENDORSED),
      ),
    ),
  ),
]);
```

To:

```typescript
const [projectMetrics, underEvaluationResult] = await Promise.all([
  db
    .select({
      total: sql<number>`count(*)`,
      ongoing: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.ONGOING})`,
      completed: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.COMPLETED})`,
    })
    .from(projects)
    .where(isNull(projects.archivedAt)),
  db
    .select({ value: count() })
    .from(proposals)
    .where(
      and(
        isNull(proposals.archivedAt),
        or(
          eq(proposals.currentStatus, PROPOSAL_STATUS.SUBMITTED),
          eq(proposals.currentStatus, PROPOSAL_STATUS.ENDORSED),
        ),
      ),
    ),
]);

const projectData = projectMetrics[0]!;
```

Update the response construction:

```typescript
metrics: {
  totalProjects: Number(projectData.total),
  ongoingProjects: Number(projectData.ongoing),
  underEvaluation: Number(underEvaluationResult[0]?.value ?? 0),
  completed: Number(projectData.completed),
},
```

**Step 2: Run tests**

```bash
cd backend
pnpm exec vitest run
```

**Step 3: Commit**

```bash
git add backend/src/routes/director.routes.ts
git commit -m "perf: consolidate dashboard metric queries into single aggregator"
```

---

## Execution Order

| # | Task | Dependencies | Risk |
|---|------|-------------|------|
| 1 | Squash migrations | None | Medium — requires DB state to match schemas |
| 2 | Add indexes | Task 1 (to avoid migration numbering conflict) | Low — additive only |
| 3 | UUIDv7 | Task 1 | Low — additive, existing data unchanged |
| 4 | Keyset pagination | None | Medium — touches 12 route files, response schema changes |
| 5 | DB aggregation (closeProject) | None | Low — isolated change |
| 6 | Dashboard caching | None | Low — additive |
| 7 | Dashboard query consolidation | None | Low — read-only refactor |

Tasks 4, 5, 6, 7 can run in parallel. Tasks 1, 2, 3 must be sequential.

---

## Rollback Plan

- **Index changes**: `DROP INDEX IF EXISTS <name>` (no data loss)
- **UUIDv7**: Revert `default()` to `defaultRandom()` in schema files; re-generate migration
- **Keyset pagination**: Revert route files; old `page`/`offset` API is removed, so clients must be updated too. Keep backward compat if needed by supporting both `page` and `cursor`.
- **Dashboard caching**: Remove cache wrapper — no data impact
