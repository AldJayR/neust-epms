# Domain Module Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the NEUST-EPMS backend from flat route files into domain modules with proper separation of concerns (routes + services + schemas).

**Architecture:** Split 4 bloated route files (1500-1800 lines each) into feature-based sub-routes under `modules/`, extract shared cross-cutting services into `services/`, centralize common zod schemas and utilities in `lib/`. Every route file moves into a `modules/<domain>/` directory. Only the 4 large modules get sub-routes + service + schema; smaller modules get a single `.routes.ts` file.

**Tech Stack:** TypeScript (ESM), Hono (OpenAPIHono), Drizzle ORM, Zod (via @hono/zod-openapi), Supabase, node-cron

**Principles:** KISS, DRY, YAGNI, single responsibility, loose coupling, high cohesion, proper separation of concerns

---

## Current State Summary

| File | Lines | What it does |
|------|-------|-------------|
| `routes/proposals.routes.ts` | 1652 | CRUD + submit + review (endorsement/approval) + comments + metadata + restore |
| `routes/projects.routes.ts` | 1610 | CRUD + link-MOA + status transitions + close/activate/readiness + reporting + restore |
| `routes/director.routes.ts` | 1567 | Dashboard stats + faculty directory + MOA repository + project hub + email report |
| `routes/action-center.routes.ts` | 776 | Giant if/else per role with near-identical queries |
| `routes/moas.routes.ts` | 837 | MOA CRUD + file upload + linked projects |
| `routes/members.routes.ts` | 371 | Proposal member management (duplicates isProjectLeader) |
| `routes/auth.routes.ts` | 730 | Auth (login, register, profile, etc.) |
| `routes/storage.routes.ts` | 432 | File upload (duplicates sanitizeFilename) |
| `routes/special-orders.routes.ts` | 608 | Special orders (duplicates sanitizeFilename) |
| `routes/...` (others) | <700 | Single concern, stay as one file |

## Target Structure

```
src/
├── modules/
│   ├── director/               ← 5 sub-routes + service + schema
│   │   ├── index.ts
│   │   ├── dashboard.routes.ts
│   │   ├── faculty-directory.routes.ts
│   │   ├── moa-repository.routes.ts
│   │   ├── project-hub.routes.ts
│   │   ├── email-report.routes.ts
│   │   ├── director.service.ts
│   │   └── director.schema.ts
│   ├── proposals/              ← 3 sub-routes + service + schema
│   │   ├── index.ts
│   │   ├── crud.routes.ts
│   │   ├── review.routes.ts
│   │   ├── comments.routes.ts
│   │   ├── proposals.service.ts
│   │   └── proposals.schema.ts
│   ├── projects/               ← 3 sub-routes + service + schema
│   │   ├── index.ts
│   │   ├── crud.routes.ts
│   │   ├── status.routes.ts
│   │   ├── reporting.routes.ts
│   │   ├── projects.service.ts
│   │   └── projects.schema.ts
│   ├── action-center/          ← 1 route + service + schema
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   ├── action-center.service.ts
│   │   └── action-center.schema.ts
│   ├── moas/                   ← 1 route + service + schema
│   │   ├── index.ts
│   │   ├── moas.routes.ts
│   │   ├── moas.service.ts
│   │   └── moas.schema.ts
│   ├── auth/auth.routes.ts
│   ├── admin/admin.routes.ts
│   ├── members/members.routes.ts
│   ├── storage/storage.routes.ts
│   ├── special-orders/special-orders.routes.ts
│   ├── search/search.routes.ts
│   ├── reports/reports.routes.ts
│   ├── notifications/notifications.routes.ts
│   ├── settings/settings.routes.ts
│   └── audit/audit.routes.ts
├── services/                    ← cross-cutting only
│   ├── auth-user.service.ts     ← role/scope checks
│   └── file.service.ts          ← sanitizeFilename()
├── lib/
│   ├── schemas.ts               ← ErrorSchema, MessageSchema, ParamId, PaginationQuery
│   ├── date.utils.ts            ← months array, formatDuration, getCurrentAcademicYear, getCurrentSemester
│   ├── supabase.ts              ← singleton createClient call
│   ├── audit.ts (existing)
│   ├── errors.ts (existing)
│   ├── notification.helpers.ts (existing)
│   └── ... (existing)
├── cron/
│   ├── moa-expiration.ts
│   └── report-overdue.ts
├── db/
├── middleware/
└── app.ts
```

---

## Task 1: Create shared lib/schemas.ts

**Files:**
- Create: `src/lib/schemas.ts`
- After this: update `src/modules/*/*.routes.ts` and `src/routes/*.routes.ts` to import from here instead of redefining locally

**Step 1: Create `src/lib/schemas.ts`**

Collect these from existing route files:
- `ErrorSchema` — `z.object({ error: z.object({ code: z.string(), message: z.string() }) }).openapi("Error")`
- `MessageSchema` — `z.object({ message: z.string() }).openapi("Message")`
- `ParamId` — `z.object({ id: z.coerce.number() }).openapi("ParamId")`
- `PaginationQuery` — `z.object({ page: z.coerce.number().optional().default(1), limit: z.coerce.number().optional().default(10) }).openapi("PaginationQuery")`

**Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor(lib): centralize common zod schemas (ErrorSchema, MessageSchema, ParamId, PaginationQuery)"
```

---

## Task 2: Create shared lib/date.utils.ts

**Files:**
- Create: `src/lib/date.utils.ts`

**Step 1: Create `src/lib/date.utils.ts`**

Extract from `director.routes.ts:1248` and `projects.routes.ts:1062`:

```ts
export const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function formatDuration(start: Date, end: Date): string {
  const totalMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  const years = Math.floor(totalMonths / 12);
  const months_ = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr(s)`);
  if (months_ > 0) parts.push(`${months_} mo(s)`);
  return parts.length > 0 ? parts.join(" ") : "0 mo(s)";
}

export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 8) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

export function getCurrentSemester(): 1 | 2 {
  const month = new Date().getMonth() + 1;
  return month >= 8 || month <= 1 ? 1 : 2;
}
```

**Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor(lib): extract date utility functions"
```

---

## Task 3: Create shared lib/supabase.ts

**Files:**
- Create: `src/lib/supabase.ts`

**Step 1: Create `src/lib/supabase.ts`**

Currently `createClient` is called in 8 files (`director.routes.ts`, `projects.routes.ts`, `moas.routes.ts`, `auth.routes.ts`, `admin.routes.ts`, `special-orders.routes.ts`, `storage.routes.ts`, `middleware/auth.ts`).

```ts
import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);
```

**Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor(lib): create Supabase singleton client"
```

---

## Task 4: Create cross-cutting services/auth-user.service.ts

**Files:**
- Create: `src/services/auth-user.service.ts`

**Step 1: Create `src/services/auth-user.service.ts`**

Extract from `members.routes.ts:17-33` and `proposals.routes.ts:48-63`:

```ts
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { proposalMembers } from "../db/schema/proposal-members.js";
import { proposals } from "../db/schema/proposals.js";
import { roles } from "../db/schema/roles.js";
import { users } from "../db/schema/users.js";

export const PROJECT_LEADER_ROLE = "Project Leader";

export async function isProjectLeader(
  proposalId: string,
  userId: string,
): Promise<boolean> {
  const [member] = await db
    .select({ memberId: proposalMembers.memberId })
    .from(proposalMembers)
    .where(
      and(
        eq(proposalMembers.proposalId, proposalId),
        eq(proposalMembers.userId, userId),
        eq(proposalMembers.projectRole, PROJECT_LEADER_ROLE),
      ),
    )
    .limit(1);
  return !!member;
}

export async function isProjectLeaderOfMember(
  memberId: string,
  userId: string,
): Promise<boolean> {
  const [result] = await db
    .select({ memberId: proposalMembers.memberId })
    .from(proposalMembers)
    .innerJoin(proposals, eq(proposalMembers.proposalId, proposals.proposalId))
    .where(
      and(
        eq(proposalMembers.memberId, memberId),
        eq(proposals.createdBy, userId),
      ),
    )
    .limit(1);
  return !!result;
}

export async function isExtensionDirector(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ userId: users.userId })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .where(
      and(
        eq(users.userId, userId),
        eq(roles.roleName, "Director"),
      ),
    )
    .limit(1);
  return !!user;
}

export async function isImmediateSupervisor(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ userId: users.userId })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .where(
      and(
        eq(users.userId, userId),
        eq(roles.roleName, "Immediate Supervisor"),
      ),
    )
    .limit(1);
  return !!user;
}

export async function isCollegeDean(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ userId: users.userId })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .where(
      and(
        eq(users.userId, userId),
        eq(roles.roleName, "College Dean"),
      ),
    )
    .limit(1);
  return !!user;
}

export async function getUserRole(db: any, userId: string): Promise<string | null> {
  const [user] = await db
    .select({ roleName: roles.roleName })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .where(eq(users.userId, userId))
    .limit(1);
  return user?.roleName ?? null;
}

export async function getUserCollege(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ collegeId: users.collegeId })
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);
  return user?.collegeId ?? null;
}
```

**Step 2: Update consumers**

- `members.routes.ts`: Remove local `isProjectLeader()` + `PROJECT_LEADER_ROLE`, import from `../services/auth-user.service.js`
- `proposals.routes.ts`: Remove local `isProjectLeader()`, import from `../services/auth-user.service.js`

**Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 4: Run affected tests**

Run: `cd backend && npx vitest run --reporter=verbose src/routes/members.routes.test.ts src/routes/proposals.routes.test.ts`

Expected: All tests pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(services): extract auth-user.service with role/scope check functions"
```

---

## Task 5: Create cross-cutting services/file.service.ts

**Files:**
- Create: `src/services/file.service.ts`

**Step 1: Create `src/services/file.service.ts`**

Extract from `storage.routes.ts:21-35`, `moas.routes.ts:25-39`, `special-orders.routes.ts:21-35`:

```ts
export function sanitizeFilename(fileName: string): string {
  const timestamp = Date.now();
  const sanitized = fileName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
  return `${timestamp}_${sanitized}`;
}
```

**Step 2: Update consumers**

- `storage.routes.ts`: Remove local `sanitizeFilename()`, import from `../services/file.service.js`
- `moas.routes.ts`: Remove local `sanitizeFilename()`, import from `../services/file.service.js`
- `special-orders.routes.ts`: Remove local `sanitizeFilename()`, import from `../services/file.service.js`

**Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(services): extract file.service with sanitizeFilename"
```

---

## Task 6: Move all route files into modules/

**Files:**
- Delete (eventually): `src/routes/` directory
- Create: `src/modules/auth/auth.routes.ts` (copy from `routes/auth.routes.ts`)
- Create: `src/modules/admin/admin.routes.ts`
- Create: `src/modules/members/members.routes.ts`
- Create: `src/modules/storage/storage.routes.ts` (update to import from `services/file.service.js`)
- Create: `src/modules/special-orders/special-orders.routes.ts` (update to import from `services/file.service.js`)
- Create: `src/modules/search/search.routes.ts`
- Create: `src/modules/reports/reports.routes.ts`
- Create: `src/modules/notifications/notifications.routes.ts`
- Create: `src/modules/settings/settings.routes.ts`
- Create: `src/modules/audit/audit.routes.ts`
- Modify: `src/app.ts` — update all imports from `./routes/` to `./modules/`

**Step 1: Copy each flat route file to `src/modules/<name>/<name>.routes.ts`**

For each of the 10 small route files:
1. Create `src/modules/<name>/` directory
2. Copy the file content (preserving existing `import` paths to `../db/`, `../lib/`, `../middleware/`, `../services/`)
3. Update tests that import `./<name>.routes.js` — they need to import `./modules/<name>/<name>.routes.js` instead (or use the barrel index path)

CRITICAL: Update import paths inside the copied files:
- `../db/` → stays `../db/` (still two levels up from src)
- `../lib/` → stays `../lib/`
- `../middleware/` → stays `../middleware/`
- `../services/` → stays `../services/`
- `../env.js` → stays `../env.js`

Update these files:
- `storage.routes.ts` and `special-orders.routes.ts`: change `import { sanitizeFilename }` from local to `../services/file.service.js`
- `members.routes.ts`: change `import { isProjectLeader }` from local to `../services/auth-user.service.js`

**Step 2: Update `src/app.ts`**

```ts
// From:
import directorRoutes from "./routes/director.routes.js";
import proposalRoutes from "./routes/proposals.routes.js";
// etc.

// To:
import directorRoutes from "./modules/director/index.js";
import proposalRoutes from "./modules/proposals/index.js";
import projectRoutes from "./modules/projects/index.js";
import actionCenterRoutes from "./modules/action-center/index.js";
import moaRoutes from "./modules/moas/index.js";
import authRoutes from "./modules/auth/auth.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import memberRoutes from "./modules/members/members.routes.js";
import storageRoutes from "./modules/storage/storage.routes.js";
import specialOrderRoutes from "./modules/special-orders/special-orders.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import reportRoutes from "./modules/reports/reports.routes.js";
import notificationRoutes from "./modules/notifications/notifications.routes.js";
import settingRoutes from "./modules/settings/settings.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";
```

**Step 3: Update test imports**

Test files that import route files need updating:
- `auth.routes.test.ts`: `import app from "./auth.routes.js"` → `import app from "../modules/auth/auth.routes.js"`
- `projects.routes.test.ts`: → `../modules/projects/crud.routes.js` (will be split later)
- `proposals.routes.test.ts`: → `../modules/proposals/crud.routes.js`
- `moas.routes.test.ts`: → `../modules/moas/moas.routes.js`
- etc.

**Step 4: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 5: Run all tests**

Run: `cd backend && npx vitest run --reporter=verbose`

Expected: All tests pass. If some fail, fix import paths.

**Step 6: Delete old `src/routes/` directory**

Only after ALL tests pass with new paths.

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move all route files into modules/ with domain structure"
```

---

## Task 7: Split director.routes.ts into sub-routes + service + schema

**Files:**
- Create: `src/modules/director/dashboard.routes.ts`
- Create: `src/modules/director/faculty-directory.routes.ts`
- Create: `src/modules/director/moa-repository.routes.ts`
- Create: `src/modules/director/project-hub.routes.ts`
- Create: `src/modules/director/email-report.routes.ts`
- Create: `src/modules/director/director.service.ts`
- Create: `src/modules/director/director.schema.ts`
- Create: `src/modules/director/index.ts`
- Modify: `src/app.ts`

**Step 1: Create `src/modules/director/director.schema.ts`**

Extract all director-specific zod schemas from `director.routes.ts`:
- Dashboard stats response schemas
- Faculty directory query/response schemas
- MOA repository schemas
- Project hub schemas
- Email report schemas

**Step 2: Create `src/modules/director/director.service.ts`**

Extract business logic from `director.routes.ts`:
- Dashboard aggregation queries (count proposals, projects, MOAs, faculty)
- Faculty search/filter logic
- MOA listing for director view
- Project listing for director view
- Email report generation logic

Each function signature:
```ts
export async function getDashboardStats(db: any): Promise<DashboardStats>
export async function searchFaculty(db: any, query: string, filters: FacultyFilters): Promise<FacultyMember[]>
export async function getMoaList(db: any, pagination: PaginationQuery): Promise<MoaListItem[]>
export async function getProjectList(db: any, pagination: PaginationQuery, filters: ProjectFilters): Promise<ProjectListItem[]>
export async function generateEmailReport(db: any, filters: ReportFilters): Promise<string>
```

**Step 3: Create sub-route files**

Each sub-route file:
```ts
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { db } from "../../db/client.js";
import { supabase } from "../../lib/supabase.js";
import { env } from "../../env.js";
import { ApiError } from "../../lib/errors.js";
import { type AuthEnv, authMiddleware } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { ROLE_NAMES } from "../../lib/types.js";
import { ErrorSchema, MessageSchema, ParamId, PaginationQuery } from "../../lib/schemas.js";
import { formatDuration } from "../../lib/date.utils.js";
import { getDashboardStats, searchFaculty, getMoaList, getProjectList, generateEmailReport } from "./director.service.js";
// (import module schemas from ./director.schema.ts)

const app = new OpenAPIHono<AuthEnv>();

app.use(authMiddleware);
app.use(requireRole(ROLE_NAMES.SUPER_ADMIN, ROLE_NAMES.DIRECTOR, ROLE_NAMES.RET_CHAIR));

// route handlers...

export default app;
```

**Sub-route boundaries (from `director.routes.ts`):**
- `dashboard.routes.ts`: Lines ~62-350 (dashboard stats endpoints)
- `faculty-directory.routes.ts`: Lines ~351-700 (faculty listing, search, details)
- `moa-repository.routes.ts`: Lines ~701-950 (MOA listing/search for director)
- `project-hub.routes.ts`: Lines ~951-1350 (project listing/details for director)
- `email-report.routes.ts`: Lines ~1351-1711 (email report generation/sending)

**Step 4: Create `src/modules/director/index.ts`**

```ts
import { Hono } from "hono";
import dashboard from "./dashboard.routes.js";
import facultyDirectory from "./faculty-directory.routes.js";
import moaRepository from "./moa-repository.routes.js";
import projectHub from "./project-hub.routes.js";
import emailReport from "./email-report.routes.js";

const router = new Hono();

router.route("/", dashboard);
router.route("/", facultyDirectory);
router.route("/", moaRepository);
router.route("/", projectHub);
router.route("/", emailReport);

export default router;
```

**Step 5: Update `app.ts`**

Change:
```ts
import directorRoutes from "./routes/director.routes.js";
app.route("/api/v1", directorRoutes);
```
To:
```ts
import directorRoutes from "./modules/director/index.js";
app.route("/api/v1", directorRoutes);
```

**Step 6: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor(modules): split director into sub-routes + service + schema"
```

---

## Task 8: Split proposals.routes.ts into sub-routes + service + schema

**Files:**
- Create: `src/modules/proposals/crud.routes.ts`
- Create: `src/modules/proposals/review.routes.ts`
- Create: `src/modules/proposals/comments.routes.ts`
- Create: `src/modules/proposals/proposals.service.ts`
- Create: `src/modules/proposals/proposals.schema.ts`
- Create: `src/modules/proposals/index.ts`

**Step 1: Create `src/modules/proposals/proposals.schema.ts`**

Extract proposal-specific zod schemas from `proposals.routes.ts`:
- ProposalCreateSchema, ProposalUpdateSchema, ProposalResponseSchema
- Review schemas (endorsement, approval)
- Comment schemas
- Metadata schemas

**Step 2: Create `src/modules/proposals/proposals.service.ts`**

Extract business logic from `proposals.routes.ts`:
- Proposal CRUD operations (create, read, update, list)
- Submit logic (status transitions)
- Review logic (endorsement, approval, return)
- Comment CRUD
- Metadata fetching (SDGs, departments, etc.)
- Restore deleted proposals

**Step 3: Create sub-route files**

- `crud.routes.ts`: Lines ~1-750 (create, read, update, list, submit, metadata, restore)
- `review.routes.ts`: Lines ~751-1200 (endorsement, approval, recommendation)
- `comments.routes.ts`: Lines ~1201-1652 (comment CRUD)

**Step 4: Create `src/modules/proposals/index.ts`**

```ts
import { Hono } from "hono";
import crud from "./crud.routes.js";
import review from "./review.routes.js";
import comments from "./comments.routes.js";

const router = new Hono();
router.route("/", crud);
router.route("/", review);
router.route("/", comments);
export default router;
```

**Step 5: Verify it compiles + tests pass**

Run: `cd backend && npx tsc --noEmit && npx vitest run --reporter=verbose src/routes/proposals.routes.test.ts`

Expected: No compile errors, all tests pass.

Note: Test file still imports from `../routes/proposals.routes.js` — don't change tests yet (test files will be updated in a later task when old routes dir is deleted).

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(modules): split proposals into sub-routes + service + schema"
```

---

## Task 9: Split projects.routes.ts into sub-routes + service + schema

**Files:**
- Create: `src/modules/projects/crud.routes.ts`
- Create: `src/modules/projects/status.routes.ts`
- Create: `src/modules/projects/reporting.routes.ts`
- Create: `src/modules/projects/projects.service.ts`
- Create: `src/modules/projects/projects.schema.ts`
- Create: `src/modules/projects/index.ts`

**Step 1: Create `src/modules/projects/projects.schema.ts`**

Extract project-specific zod schemas from `projects.routes.ts`.

**Step 2: Create `src/modules/projects/projects.service.ts`**

Extract business logic:
- Project CRUD operations
- Link-MOA logic
- Status transition logic
- Close/activate/readiness check logic
- Schedule reporting logic
- Restore logic

**Step 3: Create sub-route files**

- `crud.routes.ts`: Lines ~1-700 (create, read, update, list, link-MOA, restore)
- `status.routes.ts`: Lines ~701-1300 (transitions, close, activate, readiness)
- `reporting.routes.ts`: Lines ~1301-1782 (schedule, progress)

**Step 4: Create `src/modules/projects/index.ts`**

```ts
import { Hono } from "hono";
import crud from "./crud.routes.js";
import status from "./status.routes.js";
import reporting from "./reporting.routes.js";

const router = new Hono();
router.route("/", crud);
router.route("/", status);
router.route("/", reporting);
export default router;
```

**Step 5: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(modules): split projects into sub-routes + service + schema"
```

---

## Task 10: Refactor action-center.routes.ts into module

**Files:**
- Create: `src/modules/action-center/routes.ts`
- Create: `src/modules/action-center/action-center.service.ts`
- Create: `src/modules/action-center/action-center.schema.ts`
- Create: `src/modules/action-center/index.ts`

**Step 1: Create `src/modules/action-center/action-center.schema.ts`**

Extract action-center schemas.

**Step 2: Create `src/modules/action-center/action-center.service.ts`**

The main problem: `action-center.routes.ts` has a giant `if/else if` block (~500 lines) with near-identical queries per role. Extract:

```ts
export interface ActionCenterQuery {
  role: string;
  userId: string;
  collegeId?: string;
  page: number;
  limit: number;
  status?: string;
  type?: "proposal" | "project" | "moa";
}

export async function getActionCenterItems(
  db: any,
  query: ActionCenterQuery,
): Promise<{ items: any[]; total: number }>
```

The function builds the appropriate WHERE clause based on role, then runs a single set of paginated queries. The route handler just calls this and returns the result.

**Step 3: Create `src/modules/action-center/routes.ts`**

~50 lines — single route handler that parses query params, calls the service, returns result.

**Step 4: Create `src/modules/action-center/index.ts`**

```ts
import routes from "./routes.js";
export default routes;
```

**Step 5: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(modules): refactor action-center with shared service layer"
```

---

## Task 11: Refactor moas.routes.ts into module

**Files:**
- Create: `src/modules/moas/moas.routes.ts`
- Create: `src/modules/moas/moas.service.ts`
- Create: `src/modules/moas/moas.schema.ts`
- Create: `src/modules/moas/index.ts`

**Step 1: Create `src/modules/moas/moas.schema.ts`**

Extract MOA-specific schemas.

**Step 2: Create `src/modules/moas/moas.service.ts`**

Extract:
- MOA CRUD business logic
- Partner lookup logic
- File upload logic (using `services/file.service.js` for sanitizeFilename, `lib/supabase.js` for Supabase client)
- Linked project query logic

**Step 3: Create `src/modules/moas/moas.routes.ts`**

Route handlers calling the service layer.

**Step 4: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(modules): extract moas module with service layer"
```

---

## Task 12: Clean up — delete old routes/ dir, update test imports, final verification

**Files:**
- Delete: `src/routes/` (entire directory)
- Modify: all test files in `src/` that import from `../routes/` or `./routes/`

**Step 1: Delete `src/routes/` directory**

Only if every route file has been moved to `src/modules/`.

**Step 2: Update test import paths**

Test files that need updating (from `src/routes/`):
- `src/routes/auth.routes.test.ts` → move/update to `src/modules/auth/auth.routes.test.ts`
- `src/routes/projects.routes.test.ts` → move to `src/modules/projects/`
- `src/routes/proposals.routes.test.ts` → move to `src/modules/proposals/`
- `src/routes/moas.routes.test.ts` → move to `src/modules/moas/`
- `src/routes/members.routes.test.ts` → move to `src/modules/members/`
- `src/routes/storage.routes.test.ts` → move to `src/modules/storage/`
- `src/routes/audit.routes.test.ts` → move to `src/modules/audit/`
- `src/routes/reports.routes.test.ts` → move to `src/modules/reports/`
- `src/routes/settings.routes.test.ts` → move to `src/modules/settings/`
- `src/routes/special-orders.routes.test.ts` → move to `src/modules/special-orders/`
- `src/routes/derived-states.routes.test.ts` → move to `src/modules/`

The main change in each test: update the import path to the new file location. E.g.:
```ts
// Before:
import app from "./auth.routes.js";
// After:
import app from "../modules/auth/auth.routes.js";
```

**Step 3: Run ALL tests**

Run: `cd backend && npx vitest run --reporter=verbose`

Expected: ALL tests pass. If any fail:
1. Fix the import path in the test file
2. Fix any broken imports in the route files
3. Re-run

**Step 4: Type check**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors.

**Step 5: Final commit**

```bash
git add -A
git commit -m "refactor: delete old routes/ dir, update test paths, final cleanup"
```

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Test files import from `./routes/` paths | Catch all during Task 12; run full test suite before deleting old dir |
| Import path typos in moved files | Each task verifies with `tsc --noEmit` before committing |
| Missed a route import in `app.ts` | Final full test run + type check will catch it |
| Service extraction changes behavior | Extracting logic line-by-line without rewriting; no behavior changes |
| Splitting breaks the barrel export contract | All module `index.ts` files re-export the same router; app.ts just changes import path |

## Rollback Plan

If something goes wrong after any commit:
```bash
git revert --no-edit HEAD
```
Each commit is atomic — no mixed concerns. Reverting one commit undoes a single, well-defined change.
