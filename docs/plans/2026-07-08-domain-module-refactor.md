# Domain Module Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Sprint 1:** ✅ Completed (Tasks 1-6) — commit `ca04f69`
> **Sprint 2:** ✅ Completed (Tasks 7-12) — commits `6c53e1a` to `2c35a36`
> **Sprint 3:** ⏳ Pending (Tasks 13-15; detailed execution in `2026-07-09-sprint-3-small-modules.md`)

**Goal:** Refactor the NEUST-EPMS backend from flat route files into domain modules with proper separation of concerns (routes + services + schemas).

**Architecture:** Split the largest route files into feature-based sub-routes under `modules/`, extract shared cross-cutting services into `services/`, centralize common zod schemas and utilities in `lib/`, and finish Sprint 3 by giving the remaining smaller modules their own route, schema, and service layers. Every route file now lives under `modules/<domain>/`; `backend/src/routes` is obsolete and should not be recreated.

**Tech Stack:** TypeScript (ESM), Hono (OpenAPIHono), Drizzle ORM, Zod (via @hono/zod-openapi), Supabase, node-cron

**Principles:** KISS, DRY, YAGNI, single responsibility, loose coupling, high cohesion, proper separation of concerns

---

## Original State Summary

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
│   ├── director/               ← 6 sub-routes + service + schema
│   │   ├── index.ts
│   │   ├── dashboard.routes.ts
│   │   ├── faculty-directory.routes.ts
│   │   ├── moa-repository.routes.ts
│   │   ├── project-hub.routes.ts
│   │   ├── project-details.routes.ts
│   │   ├── email-report.routes.ts
│   │   ├── director.service.ts
│   │   └── director.schema.ts
│   ├── proposals/              ← 5 sub-routes + service + schema
│   │   ├── index.ts
│   │   ├── crud.routes.ts
│   │   ├── submit.routes.ts
│   │   ├── review.routes.ts
│   │   ├── comments.routes.ts
│   │   ├── proposals.service.ts
│   │   └── proposals.schema.ts
│   ├── projects/               ← 5 sub-routes + service + schema
│   │   ├── index.ts
│   │   ├── crud.routes.ts
│   │   ├── status.routes.ts
│   │   ├── activate.routes.ts
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
│   ├── auth/                   ← route + service + schema + optional barrel
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.service.ts
│   │   └── auth.schema.ts
│   ├── admin/                  ← route + service + schema + optional barrel
│   ├── members/                ← route + service + schema + optional barrel
│   ├── storage/                ← route + service + schema + optional barrel
│   ├── special-orders/         ← route + service + schema + optional barrel
│   ├── search/                 ← route + service + schema + optional barrel
│   ├── reports/                ← route + service + schema + optional barrel
│   ├── notifications/          ← route + service + schema + optional barrel
│   ├── settings/               ← route + service + schema + optional barrel
│   └── audit/                  ← route + service + schema + optional barrel
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
- After this: update route files to import from here instead of redefining locally

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

> **Lines:** 1705 → 6 sub-routes + service + schema
> **Endpoints:** 7 (GET × 6, POST × 1)
> **Key duplication:** RET_CHAIR scoping logic 7×, leader subquery 2×, faculty query 2×

**Files:**
- Create: `src/modules/director/dashboard.routes.ts` (GET /director/dashboard)
- Create: `src/modules/director/faculty-directory.routes.ts` (GET /director/faculty)
- Create: `src/modules/director/moa-repository.routes.ts` (GET /director/moas, GET /director/moas/active)
- Create: `src/modules/director/project-hub.routes.ts` (GET /director/hub/projects)
- Create: `src/modules/director/project-details.routes.ts` (GET /director/projects/{proposalId})
- Create: `src/modules/director/email-report.routes.ts` (POST /director/email-report)
- Create: `src/modules/director/director.service.ts`
- Create: `src/modules/director/director.schema.ts`
- Modify: `src/modules/director/index.ts` (replace barrel with actual router)

**Step 1: Create `src/modules/director/director.schema.ts`**

Extract all 16 inline zod schemas from `director.routes.ts`:
- `HubProjectSchema` (line 60), `HubProjectListSchema` (74), `HubQuerySchema` (81)
- `DashboardMetricSchema` (113), `ChartPointSchema` (122), `ActivitySchema` (129), `MoaSchema` (135)
- `MoaRepositoryItemSchema` (140), `MoaRepositorySchema` (148)
- `FacultyInvolvementSchema` (158), `FacultyDirectorySchema` (173)
- `DirectorDashboardSchema` (602)
- `ProjectDetailsMemberSchema` (989), `ProjectDetailsHistoryItemSchema` (1007), `ProjectDetailsAttachmentSchema` (1016), `ProjectDetailsSchema` (1024)

**Step 2: Create `src/modules/director/director.service.ts`**

Extract business logic into 7 functions:
```ts
export async function getDashboardStats(db, user): Promise<DirectorDashboardStats>
// Lines 830-985: 5 parallel metric queries + helpers (formatRelativeTime, activityTitle)
// DRY: RET_CHAIR scope logic reused from shared helper

export async function getFacultyDirectory(db, query, user): Promise<FacultyDirectoryResult>
// Lines 229-443: role-scoped faculty listing + involvement counts
// DRY: share getFacultyInvolvementCounts with email-report

export async function getFacultyInvolvementCounts(db, userIds): Promise<Map<string, counts>>
// Lines 365-403: lead + collaborator counts per faculty member
// Reused by: getFacultyDirectory AND sendEmailReport

export async function getMoaRepository(db, query): Promise<MoaRepositoryResult>
// Lines 485-600: paginated MOA list + status computation

export async function getActiveMoas(db): Promise<MoaActiveItem[]>
// Lines 1681-1703: simple active MOA list

export async function getHubProjects(db, query, user): Promise<HubProjectListResult>
// Lines 687-828: unified proposal+project listing with leader subquery

export async function getProjectDetails(db, proposalId, user): Promise<ProjectDetails>
// Lines 1073-1406: 6 parallel queries + history/attachment assembly
// Uses: Supabase signed URLs, specialOrder mapping, history sorting

export async function sendEmailReport(db, body, user): Promise<void>
// Lines 1445-1665: faculty query (reuse getFacultyDirectory logic without pagination)
// + HTML template rendering + Resend API send
```

**Step 3: Create sub-route files**

Each sub-route creates its own `OpenAPIHono<AuthEnv>` app with auth middleware:
```ts
const app = new OpenAPIHono<AuthEnv>();
app.use(authMiddleware);
app.use(requireRole(ROLE_NAMES.SUPER_ADMIN, ROLE_NAMES.DIRECTOR, ROLE_NAMES.RET_CHAIR));
// route handler calling service...
export default app;
```

- `dashboard.routes.ts`: Lines 602-985 — `DirectorDashboardSchema` response, calls `getDashboardStats()`
- `faculty-directory.routes.ts`: Lines 186-444 — inline query schema (page/limit/search/college/status), calls `getFacultyDirectory()`
- `moa-repository.routes.ts`: Lines 446-600 + 1667-1703 — MOA listing + active MOAs (2 endpoints), calls `getMoaRepository()` + `getActiveMoas()`
- `project-hub.routes.ts`: Lines 672-828 — uses `HubQuerySchema`, calls `getHubProjects()`
- `project-details.routes.ts`: Lines 987-1406 — `ProjectDetailsSchema` response, calls `getProjectDetails()`
- `email-report.routes.ts`: Lines 1408-1665 — POST with body schema, calls `sendEmailReport()`

**Step 4: Create `src/modules/director/index.ts`**

```ts
import { Hono } from "hono";
import dashboard from "./dashboard.routes.js";
import facultyDirectory from "./faculty-directory.routes.js";
import moaRepository from "./moa-repository.routes.js";
import projectHub from "./project-hub.routes.js";
import projectDetails from "./project-details.routes.js";
import emailReport from "./email-report.routes.js";

const router = new Hono();
router.route("/", dashboard);
router.route("/", facultyDirectory);
router.route("/", moaRepository);
router.route("/", projectHub);
router.route("/", projectDetails);
router.route("/", emailReport);
export default router;
```

**Step 5: Delete `src/routes/director.routes.ts`** (the original file, now fully replaced)

**Step 6: Verify it compiles + tests pass**

Run: `cd backend && npx tsc --noEmit && npx vitest run`

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor(modules): split director into 6 sub-routes + service + schema"
```

---

## Task 8: Split proposals.routes.ts into sub-routes + service + schema

> **Lines:** 1788 → 5 sub-routes + service + schema
> **Endpoints:** 14 (GET × 7, POST × 5, PATCH × 1, undocumented restore × 1)
> **Key duplication:** role-scope where-conditions every query, leader subquery 5×+, completion checks

**Files:**
- Create: `src/modules/proposals/crud.routes.ts` (list, get-by-id, create, update)
- Create: `src/modules/proposals/submit.routes.ts` (submit + completeness checks)
- Create: `src/modules/proposals/review.routes.ts` (endorse/approve/return/reject state machine)
- Create: `src/modules/proposals/comments.routes.ts` (comment CRUD + spatial annotations)
- Create: `src/modules/proposals/proposals.service.ts`
- Create: `src/modules/proposals/proposals.schema.ts`
- Modify: `src/modules/proposals/index.ts` (replace barrel with actual router)

**Step 1: Create `src/modules/proposals/proposals.schema.ts`**

Extract all inline zod schemas from `proposals.routes.ts`:
- `ProposalSchema` (52), `ProposalListSchema` (78), `RETDashboardStatsSchema` (82)
- `CreateProposalSchema` (90), `UpdateProposalSchema` (117), `ReviewProposalSchema` (129)
- `DerivedStateSchema` (456) — used by derived-state route
- Comment schemas: `CommentParams` (1559), `CreateCommentSchema` (1570), `CommentUserSchema` (1586), `CommentResponseSchema` (1593), `CommentListSchema` (1614)

**Step 2: Create `src/modules/proposals/proposals.service.ts`**

Extract business logic into 8 functions:
```ts
export function buildProposalScopeConditions(user): SQL[]
// Lines 162-174, 234-250, 395-420: the repeated FACULTY/RET_CHAIR scoping

export function getLeaderSubquery()
// Reusable CTE: SELECT proposalId, userId WHERE projectRole = 'Project Leader'

export function getUserMemberSubquery(userId)
// Reusable CTE: checks if current user is a member

export async function checkDuplicateTitle(title): Promise<boolean>
// Case-insensitive title check via ilike

export async function createProposalInTransaction(tx, body, userId): Promise<Proposal>
// Lines 634-748: the big transactional insert (members, departments, sectors, SDGs)

export async function updateProposalWithSectors(id, body, existing): Promise<Proposal>
// Lines 820-964: update + optional sector re-sync

export async function validateCompleteness(proposalId): Promise<CompletenessResult>
// Lines 1019-1110: 5 checks (documents, members+leader, sectors, SDGs, dates)

export async function processReview(user, proposalId, body, existing): Promise<ReviewResult>
// Lines 1205-1452: full state machine (EC-01 conflict check, EC-04 revision increment,
//   EC-05 stacked rejections, 3 flows: RET Chair endorsement, Director approval, bypassed approval)
// On approval: creates projects row if not exists
```

**Step 3: Create sub-route files**

- `crud.routes.ts`: Lines 182-964 — list (GET /proposals), get-by-id (GET /proposals/{id}), create (POST /proposals), update (PATCH /proposals/{id}). Each calls service functions.
- `submit.routes.ts`: Lines 966-1171 — POST /proposals/{id}/submit. Calls `validateCompleteness()` then transitions status to PENDING_REVIEW. Sends leader notification.
- `review.routes.ts`: Lines 1173-1452 — POST /proposals/{id}/review. Calls `processReview()`. The most complex handler — the 3-flow state machine.
- `comments.routes.ts`: Lines 1556-1786 — POST + GET /proposals/{id}/documents/{docId}/comments. Comment CRUD with spatial annotation support.

Note: The RET dashboard stats route (lines 304-369) and derived-state route (lines 455-566) should go in `crud.routes.ts` since they're small and closely tied to proposal data. The metadata routes (lines 1454-1554) also go in `crud.routes.ts`. The undocumented restore route (lines 1770-1786) should get proper OpenAPI docs added during extraction.

**Step 4: Create `src/modules/proposals/index.ts`**

```ts
import { Hono } from "hono";
import crud from "./crud.routes.js";
import submit from "./submit.routes.js";
import review from "./review.routes.js";
import comments from "./comments.routes.js";

const router = new Hono();
router.route("/", crud);
router.route("/", submit);
router.route("/", review);
router.route("/", comments);
export default router;
```

**Step 5: Delete `src/routes/proposals.routes.ts`**

**Step 6: Verify it compiles + tests pass**

Run: `cd backend && npx tsc --noEmit && npx vitest run`

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor(modules): split proposals into 5 sub-routes + service + schema"
```

---

## Task 9: Split projects.routes.ts into sub-routes + service + schema

> **Lines:** 1769 → 5 sub-routes + service + schema
> **Endpoints:** 11 (GET × 5, POST × 5, undocumented restore × 1)
> **Key duplication:** role-scope filtering 3×, leader subquery 3×, MOA expiry check 4×, project lookup 6×

**Files:**
- Create: `src/modules/projects/crud.routes.ts` (list, create, get-details, derived-state, restore)
- Create: `src/modules/projects/status.routes.ts` (transition, close, link-moa)
- Create: `src/modules/projects/activate.routes.ts` (composite activation)
- Create: `src/modules/projects/reporting.routes.ts` (readiness, reporting-schedule)
- Create: `src/modules/projects/projects.service.ts`
- Create: `src/modules/projects/projects.schema.ts`
- Modify: `src/modules/projects/index.ts` (replace barrel with actual router)

**Step 1: Create `src/modules/projects/projects.schema.ts`**

Extract all 11 inline zod schemas:
- `ProjectSchema` (51), `ProjectListSchema` (72), `CreateProjectSchema` (76), `LinkMoaSchema` (82), `TransitionSchema` (84), `ParamId` (88), `PaginationQuery` (95)
- `ProjectDerivedStateSchema` (703), `ProjectDetailsMemberSchema` (820), `ProjectDetailsHistoryItemSchema` (838), `ProjectDetailsAttachmentSchema` (847), `ProjectDetailsSchema` (855)
- `ActivateSchema` (1204), `ProjectReadinessSchema` (1374), `ProjectReportingScheduleSchema` (1572)

**Step 2: Create `src/modules/projects/projects.service.ts`**

Extract business logic into 10+ functions:
```ts
export function buildUserProjectScope(user): SQL[]
// Lines 162-174, 735-749: FACULTY/RET_CHAIR scoping (shared with LIST, DERIVED, DETAILS)

export function getLeaderSubquery()
// Reusable CTE (appears 3×)

export async function listProjects(filters, pagination, user): Promise<ProjectListResult>
// Lines 138-262: paginated listing with role scope

export async function createProjectFromProposal(proposalId, user): Promise<Project>
// Lines 264-372: transactional creation (validates proposal approved, no duplicate)

export async function getProjectDetails(id, user): Promise<ProjectDetails>
// Lines 818-1201: 6 parallel queries + Supabase signed URLs + history assembly

export async function linkMoaToProject(projectId, moaId, user): Promise<void>
// Lines 374-455: MOA existence + expiry validation + update + audit

export async function validateTransition(project, targetStatus): Promise<void>
// Lines 504-545: Approved→Ongoing (requires MOA), Ongoing→Completed

export async function transitionProjectStatus(projectId, targetStatus, user): Promise<void>
// Lines 457-573: validate + update + audit diff

export async function validateProjectClosure(projectId): Promise<void>
// Lines 575-700: checks FINAL_ACCOMPLISHMENT + TERMINAL reports exist

export async function closeProject(projectId, user): Promise<void>
// validate closure + update status + audit

export async function activateProject(id, body, user): Promise<void>
// Lines 1203-1371: composite — auto-create project if needed + link-moa + transition + create schedule

export async function getProjectReadiness(id): Promise<ReadinessResult>
// Lines 1373-1569: 4-part checklist (proposal approved, special orders, MOA, schedule)

export async function getProjectReportingSchedule(id): Promise<ReportingScheduleResult>
// Lines 1571-1752: schedule + due dates + reports + upcoming/overdue partition
```

**Step 3: Create sub-route files**

- `crud.routes.ts`: Lines 138-372 + 702-816 + 818-1201 + 1754-1767 — list, create, get-details, derived-state, restore. The biggest sub-route file.
- `status.routes.ts`: Lines 374-700 — link-moa, transition, close. All Director-only state changes.
- `activate.routes.ts`: Lines 1203-1371 — composite activation (Director-only). Distinct from status because it creates schedules.
- `reporting.routes.ts`: Lines 1373-1752 — readiness checklist + reporting schedule. Read-only endpoints.

Note: The restore route (lines 1754-1767) is currently undocumented and has no auth — add proper OpenAPI docs and auth middleware during extraction.

**Step 4: Create `src/modules/projects/index.ts`**

```ts
import { Hono } from "hono";
import crud from "./crud.routes.js";
import status from "./status.routes.js";
import activate from "./activate.routes.js";
import reporting from "./reporting.routes.js";

const router = new Hono();
router.route("/", crud);
router.route("/", status);
router.route("/", activate);
router.route("/", reporting);
export default router;
```

**Step 5: Delete `src/routes/projects.routes.ts`**

**Step 6: Verify it compiles + tests pass**

Run: `cd backend && npx tsc --noEmit && npx vitest run`

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor(modules): split projects into 5 sub-routes + service + schema"
```

---

## Task 10: Refactor action-center.routes.ts into module

> **Lines:** 823 → 1 route + service + schema
> **Endpoints:** 1 (GET /action-center — no pagination, returns all items)
> **Key duplication:** 11 near-identical for-loops, N+1 schedule queries 4×, queries differ only in scope filter

**Problem:** The handler has a 700-line `if/else if` block per role (RET_CHAIR, DIRECTOR, FACULTY, SUPER_ADMIN) with near-identical query patterns. Each role block repeats the same 3 query types (proposals by status, projects by status, upcoming reports) differing only in scope filter and join type.

**Files:**
- Create: `src/modules/action-center/routes.ts`
- Create: `src/modules/action-center/action-center.service.ts`
- Create: `src/modules/action-center/action-center.schema.ts`
- Modify: `src/modules/action-center/index.ts` (replace barrel)

**Step 1: Create `src/modules/action-center/action-center.schema.ts`**

Extract 3 schemas:
- `ActionItemSchema` (lines 30-43)
- `ActionCenterResponseSchema` (lines 45-57)
- `getActionCenterRoute` (lines 59-72)

**Step 2: Create `src/modules/action-center/action-center.service.ts`**

The core refactoring — eliminate ~400 lines of duplication with 4 unified functions:

```ts
export async function getPendingProposals(db, user, role): Promise<ActionItem[]>
// Unifies: RET_CHAIR lines 106-159, DIRECTOR lines 343-401, FACULTY lines 591-647
// Parameterized by: statusFilter, scopeBuilder, joinType

export async function getProjectsByStatus(db, user, role, projectStatus): Promise<ActionItem[]>
// Unifies: RET_CHAIR lines 219-277 (overdue), DIRECTOR lines 404-462 (approved),
//           DIRECTOR lines 465-521 (overdue), FACULTY lines 650-711 (overdue)
// Parameterized by: projectStatus, scopeBuilder

export async function getUpcomingReports(db, user, role): Promise<ActionItem[]>
// Unifies: RET_CHAIR lines 280-340, DIRECTOR lines 524-583, FACULTY lines 714-778
// Parameterized by: scopeBuilder

export async function batchFetchSchedules(projectIds): Promise<Map<string, Schedule>>
// Eliminates N+1: single SELECT WHERE projectId IN (...) instead of per-row queries
// Used by all project sections that check reporting schedule

// Plus: buildActionItems() factory that maps rows → ActionItem with role-specific
// urgency/title/owner text, and the ACT/WATCH push logic
```

**Step 3: Create `src/modules/action-center/routes.ts`**

~50 lines — single route handler:
1. Parse user from context
2. Call service functions based on role
3. Combine results into `{ actItems, watchItems, stats }`
4. Return response

The handler drops from ~750 lines to ~50 lines.

**Step 4: Delete `src/routes/action-center.routes.ts`**

**Step 5: Verify it compiles + tests pass**

Run: `cd backend && npx tsc --noEmit && npx vitest run`

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(modules): refactor action-center with unified service layer"
```

---

## Task 11: Refactor moas.routes.ts into module

> **Lines:** 932 → 1 route + service + schema
> **Endpoints:** 8 (GET × 3, POST × 3, PATCH × 1, undocumented restore × 1)
> **Key issues:** ParamId/PaginationQuery duplicated locally, restore route has wrong path, complex upload handler

**Files:**
- Create: `src/modules/moas/moas.routes.ts` (moved from routes/)
- Create: `src/modules/moas/moas.service.ts`
- Create: `src/modules/moas/moas.schema.ts`
- Modify: `src/modules/moas/index.ts` (replace barrel)

**Step 1: Create `src/modules/moas/moas.schema.ts`**

Extract 8 inline schemas. Deduplication opportunity:
- Import `ParamId` from `@/lib/schemas.js` instead of redefining locally (line 189-194)
- Extend `PaginationQuery` from `@/lib/schemas.js` with the `archived` field, or define a local `MoaPaginationQuery` extending the shared one

Schemas to extract:
- `MoaSchema` (130), `MoaDetailSchema` (143), `MoaLinkedProjectSchema` (159), `MoaListSchema` (169)
- `CreateMoaSchema` (173), `UpdateMoaSchema` (181)

**Step 2: Create `src/modules/moas/moas.service.ts`**

Extract into 8+ functions:
```ts
export function canManageMoas(user): boolean
// Lines 37-42: checks RET_CHAIR or DIRECTOR

export async function isMoaLinkedToUserProject(moaId, userId): Promise<boolean>
// Lines 49-63: auth fallback for non-manager roles

export async function syncProjectsToNewMoa(partnerId, newMoaId, validUntil, userId, ipAddress): Promise<void>
// Lines 69-127: complex multi-step — find old MOAs, find linked projects, re-link + audit

export async function getMoaList(db, pagination): Promise<MoaListResult>
// Lines 260-293: paginated query + count

export async function getMoaById(db, id): Promise<MoaDetail | null>
// Lines 334-384: join query + status computation (classifyMoaStatus helper)

export async function getLinkedProjects(db, id, user): Promise<MoaLinkedProject[]>
// Lines 430-482: multi-join with role-based scoping

export async function createMoa(db, body, user, ip): Promise<Moa>
// Lines 518-579: partner check + insert + audit + syncProjectsToNewMoa

export async function uploadMoaDocument(db, formData, user, ip): Promise<Moa>
// Lines 609-762: form parsing → validation → get-or-create partner → Supabase upload
//   (with rollback on DB failure) → insert → audit → syncProjectsToNewMoa

export async function updateMoa(db, id, body, user, ip): Promise<Moa>
// Lines 796-914: partial update + date validation + expired project restoration + audit

export async function restoreMoa(db, id): Promise<void>
// Lines 917-930: simple update (fix: add proper auth + audit)
```

**Step 3: Create `src/modules/moas/moas.routes.ts`**

Move content from `routes/moas.routes.ts`, replacing inline logic with service calls. The route handler becomes thin — HTTP parsing + service call + response formatting.

Fix issues during extraction:
- Restore route path: change `/:id/restore` to `/moas/:id/restore` (or proper OpenAPI route)
- Restore route: add `canManageMoas()` auth check + audit log
- Import `ParamId` from `@/lib/schemas.js` instead of local definition

**Step 4: Delete `src/routes/moas.routes.ts`**

**Step 5: Verify it compiles + tests pass**

Run: `cd backend && npx tsc --noEmit && npx vitest run`

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(modules): extract moas module with service layer"
```

---

## Task 12: Sprint 2 cleanup status

**Status:** Complete.

The old `backend/src/routes` directory has already been removed. Tests and route modules already live under `backend/src/modules`, and `backend/src/app.ts` imports module apps from `./modules/...`.

Do not execute old cleanup instructions again. Sprint 3 starts from this baseline:

```text
backend/src/routes/                  # does not exist
backend/src/modules/<domain>/        # current route/test locations
backend/src/app.ts                   # module imports already active
```

Before Sprint 3 implementation, verify the baseline only if needed:

```bash
cd backend
pnpm typecheck
pnpm test
```

Expected: typecheck and tests pass before further refactoring.

---

## Task 13: Execute Sprint 3 detailed plan

> **Goals:** Split the remaining smaller modules into route, schema, and service files while preserving existing API behavior.

Use the dedicated Sprint 3 plan as the source of truth:

```text
docs/plans/2026-07-09-sprint-3-small-modules.md
```

Sprint 3 covers these modules in this order:

1. `auth`
2. `admin`
3. `storage`
4. `special-orders`
5. `reports`
6. `members`
7. `search`
8. `notifications`
9. `settings`
10. `audit`

Key Sprint 3 corrections from current-code validation:
- `admin`, `search`, and `notifications` need route tests before service extraction.
- `auth.routes.test.ts` must mock `@/lib/password-check.js`, not `../lib/password-check.js`, before relying on password-check behavior.
- Route paths and default `.routes.ts` exports must remain stable because existing tests import route files directly.
- Use the `moas`/`proposals` pattern: keep `createRoute` declarations in `.routes.ts`, move only Zod schemas to `.schema.ts`, and move DB/business logic to `.service.ts`.
- Use pnpm commands from `backend/`: `pnpm typecheck`, `pnpm exec vitest run ...`, `pnpm test`, and `pnpm build`.

---

## Task 14: Final module import standardization

> **Goals:** Make all modules consistently importable from `index.ts` barrels after Sprint 3 extraction.

**Files:**
- Create missing `src/modules/<module>/index.ts` files for small modules.
- Modify `src/app.ts` imports for small modules to use `./modules/<module>/index.js`.

**Steps:**
1. Add a two-line `index.ts` barrel to each small module that does not have one.
2. Update `src/app.ts` imports without changing route mount order.
3. Run `pnpm typecheck`.
4. Run `pnpm exec vitest run src/app.test.ts`.
5. Commit with `refactor(modules): add barrels for small modules`.

---

## Task 15: Final verification

> **Goals:** Confirm the full backend still compiles, tests, and builds after Sprint 3.

**Steps:**
1. Run type checking: `pnpm typecheck`.
2. Run Vitest test suite: `pnpm test`.
3. Run bundle build: `pnpm build`.
4. Fix only issues introduced by Sprint 3.
5. Commit any stabilization fixes with `fix: stabilize small module refactor`.

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Import path typos in split files | Each task verifies with `pnpm typecheck` + targeted `pnpm exec vitest run ...` before committing |
| Service extraction changes behavior | Extract logic line-by-line without rewriting; Sprint 3 must preserve API behavior |
| Splitting breaks the barrel export contract | Preserve each `.routes.ts` default export; add `index.ts` barrels only after module tests pass |
| N+1 queries in action-center | Service uses batch prefetch (`IN (...)`) instead of per-row queries |
| Restore routes lack auth | Add proper OpenAPI docs + auth middleware during extraction (Tasks 8, 9, 11) |
| Missing test coverage for small modules | Add tests before extraction for `admin`, `search`, and `notifications` |
| MOA upload Supabase rollback complexity | Extract to service; verify rollback path works via existing tests |

## Rollback Plan

If something goes wrong after any commit:
```bash
git revert --no-edit HEAD
```
Each commit is atomic — no mixed concerns. Reverting one commit undoes a single, well-defined change.

---

## Sprint Summary

| Sprint | Tasks | Status | Commits |
|--------|-------|--------|---------|
| Sprint 1 | Tasks 1-6 | ✅ Complete | `ca04f69`, `8cf4aa8`, `93fd48c` |
| Sprint 2 | Tasks 7-12 | ✅ Complete | `6c53e1a` to `2c35a36` |
| Sprint 3 | Tasks 13-15 | ⏳ Pending | — |
