# Sprint 2: Split the Big 4 + MOA Module

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Prerequisite:** Sprint 1 is complete. All route files are in `modules/` as barrel re-exports. Shared lib/services created. All imports use `@/` path alias.

**Goal:** Split the 5 largest route files into feature-based sub-routes with service layers and domain-specific schemas. Eliminate ~1000 lines of duplicated query logic.

**Branch:** `refactor/backend`

**Tech Stack:** TypeScript (ESM), Hono (OpenAPIHono), Drizzle ORM, Zod (via @hono/zod-openapi), Supabase

**Principles:** KISS, DRY, YAGNI, single responsibility, loose coupling, high cohesion

---

## Current State (after Sprint 1)

```
src/modules/
├── director/index.ts           ← barrel re-exporting routes/director.routes.js
├── proposals/index.ts          ← barrel re-exporting routes/proposals.routes.js
├── projects/index.ts           ← barrel re-exporting routes/projects.routes.js
├── action-center/index.ts      ← barrel re-exporting routes/action-center.routes.js
├── moas/index.ts               ← barrel re-exporting routes/moas.routes.js
├── auth/auth.routes.ts         ← already a proper module (single file)
├── admin/admin.routes.ts
├── members/members.routes.ts
├── storage/storage.routes.ts
├── special-orders/special-orders.routes.ts
├── search/search.routes.ts
├── reports/reports.routes.ts
├── notifications/notifications.routes.ts
├── settings/settings.routes.ts
└── audit/audit.routes.ts

src/routes/                     ← still contains the original files
├── director.routes.ts          (1705 lines, 7 endpoints)
├── proposals.routes.ts         (1788 lines, 14 endpoints)
├── projects.routes.ts          (1769 lines, 11 endpoints)
├── action-center.routes.ts     (823 lines, 1 endpoint with 700-line if/else)
├── moas.routes.ts              (932 lines, 8 endpoints)
└── *.routes.test.ts            (test files)

src/services/
├── auth-user.service.ts        ← role/scope checks
└── file.service.ts             ← sanitizeFilename()

src/lib/
├── schemas.ts                  ← ErrorSchema, MessageSchema, ParamId, PaginationQuery
├── date.utils.ts               ← months, formatDuration, getCurrentAcademicYear, getCurrentSemester
├── supabase.ts                 ← singleton createClient
└── ... (existing)
```

## Target State (after Sprint 2)

```
src/modules/
├── director/                   ← 6 sub-routes + service + schema
│   ├── index.ts                (mounts 6 sub-apps)
│   ├── dashboard.routes.ts     (GET /director/dashboard)
│   ├── faculty-directory.routes.ts (GET /director/faculty)
│   ├── moa-repository.routes.ts (GET /director/moas, GET /director/moas/active)
│   ├── project-hub.routes.ts   (GET /director/hub/projects)
│   ├── project-details.routes.ts (GET /director/projects/{proposalId})
│   ├── email-report.routes.ts  (POST /director/email-report)
│   ├── director.service.ts     (7 service functions)
│   └── director.schema.ts      (16 zod schemas)
├── proposals/                  ← 5 sub-routes + service + schema
│   ├── index.ts                (mounts 5 sub-apps)
│   ├── crud.routes.ts          (list, get-by-id, create, update, RET stats, derived-state, metadata, restore)
│   ├── submit.routes.ts        (submit + 5 completeness checks)
│   ├── review.routes.ts        (endorse/approve/return/reject state machine)
│   ├── comments.routes.ts      (comment CRUD + spatial annotations)
│   ├── proposals.service.ts    (8 service functions)
│   └── proposals.schema.ts     (10+ zod schemas)
├── projects/                   ← 5 sub-routes + service + schema
│   ├── index.ts                (mounts 5 sub-apps)
│   ├── crud.routes.ts          (list, create, get-details, derived-state, restore)
│   ├── status.routes.ts        (transition, close, link-moa)
│   ├── activate.routes.ts      (composite activation)
│   ├── reporting.routes.ts     (readiness, reporting-schedule)
│   ├── projects.service.ts     (10+ service functions)
│   └── projects.schema.ts      (11+ zod schemas)
├── action-center/              ← 1 route + service + schema
│   ├── index.ts
│   ├── routes.ts               (~50 lines)
│   ├── action-center.service.ts (4 unified functions)
│   └── action-center.schema.ts (3 schemas)
├── moas/                       ← 1 route + service + schema
│   ├── index.ts
│   ├── moas.routes.ts          (moved from routes/, thin handlers)
│   ├── moas.service.ts         (8+ service functions)
│   └── moas.schema.ts          (8 schemas, deduped)
└── ... (other modules unchanged)

src/routes/                     ← DELETED (all files moved to modules/)

src/services/                   ← unchanged (cross-cutting only)
src/lib/                        ← unchanged
```

---

## Task 1: Split director.routes.ts (1705 lines → 6 sub-routes + service + schema)

> **Endpoints:** 7 (GET × 6, POST × 1)
> **Key duplication:** RET_CHAIR scoping logic 7×, leader subquery 2×, faculty query 2×

### Files to create/modify

| Action | File |
|--------|------|
| Create | `src/modules/director/director.schema.ts` |
| Create | `src/modules/director/director.service.ts` |
| Create | `src/modules/director/dashboard.routes.ts` |
| Create | `src/modules/director/faculty-directory.routes.ts` |
| Create | `src/modules/director/moa-repository.routes.ts` |
| Create | `src/modules/director/project-hub.routes.ts` |
| Create | `src/modules/director/project-details.routes.ts` |
| Create | `src/modules/director/email-report.routes.ts` |
| Modify | `src/modules/director/index.ts` (replace barrel with actual router) |
| Delete | `src/routes/director.routes.ts` |

### Step 1: Create `director.schema.ts`

Extract all 16 inline zod schemas from `director.routes.ts`:

| Schema | Source line | Purpose |
|--------|------------|---------|
| `HubProjectSchema` | 60 | Single hub item (proposal/project) |
| `HubProjectListSchema` | 74 | Paginated hub list |
| `HubQuerySchema` | 81 | Query params for hub |
| `DashboardMetricSchema` | 113 | Dashboard metric numbers |
| `ChartPointSchema` | 122 | Per-dept chart point |
| `ActivitySchema` | 129 | Recent activity item |
| `MoaSchema` | 135 | Expiring MOA item |
| `MoaRepositoryItemSchema` | 140 | Single MOA repo row |
| `MoaRepositorySchema` | 148 | Paginated MOA repo + metrics |
| `FacultyInvolvementSchema` | 158 | Faculty row with counts |
| `FacultyDirectorySchema` | 173 | Paginated faculty + metrics |
| `DirectorDashboardSchema` | 602 | Composite dashboard response |
| `ProjectDetailsMemberSchema` | 989 | Member with special order |
| `ProjectDetailsHistoryItemSchema` | 1007 | History entry |
| `ProjectDetailsAttachmentSchema` | 1016 | Signed URL attachment |
| `ProjectDetailsSchema` | 1024 | Full project details |

### Step 2: Create `director.service.ts`

Extract 7 service functions. Each takes `db` as first param and returns plain data:

```ts
import { db } from "@/db/client.js";
// ... schema table imports ...

export async function getDashboardStats(db, user) {
  // Lines 830-985: 5 parallel metric queries
  // - Project metrics (total, ongoing, completed, overdue, pendingClosure)
  // - Under evaluation count
  // - Chart data (proposals by campus+dept)
  // - Recent activities (last 3 audit logs)
  // - Expiring MOAs (validUntil in now..now+14d)
  // Returns: { metrics, chartData, recentActivities, expiringMoas }
}

export async function getFacultyDirectory(db, query, user) {
  // Lines 229-443: role-scoped faculty listing
  // - RET_CHAIR scoping (department or campus)
  // - Search + college filter
  // - Paginated query with involvement counts
  // Returns: { items, total, metrics }
}

export async function getFacultyInvolvementCounts(db, userIds) {
  // Lines 365-403: lead + collaborator counts per faculty
  // Reused by getFacultyDirectory AND sendEmailReport
  // Returns: Map<string, { leadCount, collabCount }>
}

export async function getMoaRepository(db, query) {
  // Lines 485-600: paginated MOA list + metrics
  // - Status classification (Valid/Renewal Needed/Expired)
  // - 30-day window logic
  // Returns: { items, total, metrics }
}

export async function getActiveMoas(db) {
  // Lines 1681-1703: simple active MOA list for project activation
  // Returns: { moaId, partnerName, validFrom, validUntil }[]
}

export async function getHubProjects(db, query, user) {
  // Lines 687-828: unified proposal+project listing
  // - Leader subquery CTE
  // - Status filter (Endorsed/Approved/Returned/Rejected + bypassedRetChair)
  // - RET_CHAIR scoping + myProjectsOnly filter
  // Returns: { items, total }
}

export async function getProjectDetails(db, proposalId, user) {
  // Lines 1073-1406: composite detail
  // - Main row query (proposals → projects → moas → partners)
  // - RET_CHAIR security check
  // - 6 parallel queries (members, documents, reviews, SDGs, special orders, edit logs)
  // - History assembly from documents + reviews + audit logs
  // - Supabase signed URLs for attachments
  // Returns: full ProjectDetails object
}

export async function sendEmailReport(db, body, user) {
  // Lines 1445-1665: email flow
  // - Faculty query (reuse getFacultyDirectory logic without pagination)
  // - Involvement counts (reuse getFacultyInvolvementCounts)
  // - HTML template rendering (academicRankLabels map)
  // - Resend API send (dynamic import)
  // Returns: void (throws on failure)
}
```

### Step 3: Create sub-route files

Each sub-route creates its own `OpenAPIHono<AuthEnv>` app:

```ts
import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { installApiErrorHandler } from "@/lib/errors.js";
// ... schema + service imports ...

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);
app.use(authMiddleware);
app.use(requireRole(ROLE_NAMES.SUPER_ADMIN, ROLE_NAMES.DIRECTOR, ROLE_NAMES.RET_CHAIR));

// createRoute + handler calling service...

export default app;
```

**Sub-route → endpoint mapping:**

| Sub-route file | Endpoint(s) | Source lines |
|----------------|-------------|-------------|
| `dashboard.routes.ts` | `GET /director/dashboard` | 602-985 |
| `faculty-directory.routes.ts` | `GET /director/faculty` | 186-444 |
| `moa-repository.routes.ts` | `GET /director/moas`, `GET /director/moas/active` | 446-600 + 1667-1703 |
| `project-hub.routes.ts` | `GET /director/hub/projects` | 672-828 |
| `project-details.routes.ts` | `GET /director/projects/{proposalId}` | 987-1406 |
| `email-report.routes.ts` | `POST /director/email-report` | 1408-1665 |

### Step 4: Create `index.ts`

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

### Step 5: Delete `src/routes/director.routes.ts`

### Step 6: Verify

```bash
cd backend && npx tsc --noEmit && npx vitest run
```

### Step 7: Commit

```bash
git add -A
git commit -m "refactor(modules): split director into 6 sub-routes + service + schema"
```

---

## Task 2: Split proposals.routes.ts (1788 lines → 5 sub-routes + service + schema)

> **Endpoints:** 14 (GET × 7, POST × 5, PATCH × 1, undocumented restore × 1)
> **Key duplication:** role-scope where-conditions every query, leader subquery 5×+

### Files to create/modify

| Action | File |
|--------|------|
| Create | `src/modules/proposals/proposals.schema.ts` |
| Create | `src/modules/proposals/proposals.service.ts` |
| Create | `src/modules/proposals/crud.routes.ts` |
| Create | `src/modules/proposals/submit.routes.ts` |
| Create | `src/modules/proposals/review.routes.ts` |
| Create | `src/modules/proposals/comments.routes.ts` |
| Modify | `src/modules/proposals/index.ts` |
| Delete | `src/routes/proposals.routes.ts` |

### Step 1: Create `proposals.schema.ts`

| Schema | Source line | Purpose |
|--------|------------|---------|
| `ProposalSchema` | 52 | Proposal response shape |
| `ProposalListSchema` | 78 | Paginated proposal list |
| `RETDashboardStatsSchema` | 82 | RET Chair dashboard counts |
| `CreateProposalSchema` | 90 | Create body (members, departments, sectors, SDGs) |
| `UpdateProposalSchema` | 117 | Update body (all optional) |
| `ReviewProposalSchema` | 129 | Review body (decision + comments) |
| `DerivedStateSchema` | 456 | ACT/WAIT/WATCH state |
| `CommentParams` | 1559 | Path params (proposalId + docId) |
| `CreateCommentSchema` | 1570 | Comment body with annotation JSON |
| `CommentUserSchema` | 1586 | Comment author info |
| `CommentResponseSchema` | 1593 | Full comment response |
| `CommentListSchema` | 1614 | Array of comments |

### Step 2: Create `proposals.service.ts`

```ts
export function buildProposalScopeConditions(user): SQL[]
// The repeated FACULTY/RET_CHAIR scoping — appears in list, get-by-id, create

export function getLeaderSubquery()
// CTE: SELECT proposalId, userId WHERE projectRole = 'Project Leader'

export function getUserMemberSubquery(userId)
// CTE: checks if current user is a member

export async function checkDuplicateTitle(title): Promise<boolean>
// Case-insensitive ilike check

export async function createProposalInTransaction(tx, body, userId)
// Lines 634-748: insert proposal + members + departments + sectors + SDGs

export async function updateProposalWithSectors(id, body, existing)
// Lines 820-964: update + optional sector re-sync (delete+reinsert)

export async function validateCompleteness(proposalId): Promise<CompletenessResult>
// Lines 1019-1110: 5 checks (documents, members+leader, sectors, SDGs, dates)

export async function processReview(user, proposalId, body, existing): Promise<ReviewResult>
// Lines 1205-1452: full state machine
// EC-01: conflict-of-interest (isProjectLeader blocks review)
// EC-04: revisionNum incremented on RETURNED
// EC-05: stacked rejections preserved (always INSERT, never UPDATE)
// 3 flows: RET Chair endorsement, Director approval, Director bypassed approval
// On approval: creates projects row if not exists
```

### Step 3: Create sub-route files

| Sub-route file | Endpoint(s) | Source lines |
|----------------|-------------|-------------|
| `crud.routes.ts` | `GET /proposals`, `GET /proposals/{id}`, `POST /proposals`, `PATCH /proposals/{id}`, `GET /proposals/ret/dashboard-stats`, `GET /proposals/{id}/derived-state`, metadata routes, `POST /:id/restore` | 182-964 + 304-369 + 455-566 + 1454-1554 + 1770-1786 |
| `submit.routes.ts` | `POST /proposals/{id}/submit` | 966-1171 |
| `review.routes.ts` | `POST /proposals/{id}/review` | 1173-1452 |
| `comments.routes.ts` | `POST + GET /proposals/{id}/documents/{docId}/comments` | 1556-1768 |

Note: The restore route (lines 1770-1786) is undocumented with no auth — add proper OpenAPI docs and auth middleware during extraction.

### Step 4-7: index.ts, delete, verify, commit

Same pattern as Task 1.

---

## Task 3: Split projects.routes.ts (1769 lines → 5 sub-routes + service + schema)

> **Endpoints:** 11 (GET × 5, POST × 5, undocumented restore × 1)
> **Key duplication:** role-scope filtering 3×, leader subquery 3×, MOA expiry check 4×, project lookup 6×

### Files to create/modify

| Action | File |
|--------|------|
| Create | `src/modules/projects/projects.schema.ts` |
| Create | `src/modules/projects/projects.service.ts` |
| Create | `src/modules/projects/crud.routes.ts` |
| Create | `src/modules/projects/status.routes.ts` |
| Create | `src/modules/projects/activate.routes.ts` |
| Create | `src/modules/projects/reporting.routes.ts` |
| Modify | `src/modules/projects/index.ts` |
| Delete | `src/routes/projects.routes.ts` |

### Step 1: Create `projects.schema.ts`

| Schema | Source line | Purpose |
|--------|------------|---------|
| `ProjectSchema` | 51 | Project response shape |
| `ProjectListSchema` | 72 | Paginated project list |
| `CreateProjectSchema` | 76 | Create body |
| `LinkMoaSchema` | 82 | Link MOA body |
| `TransitionSchema` | 84 | Status transition body |
| `ParamId` | 88 | Path param |
| `PaginationQuery` | 95 | Query params |
| `ProjectDerivedStateSchema` | 703 | Derived state response |
| `ProjectDetailsMemberSchema` | 820 | Member with special order |
| `ProjectDetailsHistoryItemSchema` | 838 | History entry |
| `ProjectDetailsAttachmentSchema` | 847 | Attachment |
| `ProjectDetailsSchema` | 855 | Full details |
| `ActivateSchema` | 1204 | Activation body |
| `ProjectReadinessSchema` | 1374 | Readiness checklist |
| `ProjectReportingScheduleSchema` | 1572 | Schedule response |

### Step 2: Create `projects.service.ts`

```ts
export function buildUserProjectScope(user): SQL[]
// FACULTY/RET_CHAIR scoping — shared by LIST, DERIVED, DETAILS

export function getLeaderSubquery()
// Reusable CTE (appears 3×)

export async function listProjects(filters, pagination, user)
// Paginated listing with role scope

export async function createProjectFromProposal(proposalId, user)
// Transaction: validates proposal approved, no duplicate, inserts project

export async function getProjectDetails(id, user)
// 6 parallel queries + Supabase signed URLs + history assembly

export async function linkMoaToProject(projectId, moaId, user)
// MOA existence + expiry validation + update + audit

export async function validateTransition(project, targetStatus)
// Approved→Ongoing (requires MOA, re-validates expiry), Ongoing→Completed

export async function transitionProjectStatus(projectId, targetStatus, user)
// validate + update + audit diff

export async function validateProjectClosure(projectId)
// Checks FINAL_ACCOMPLISHMENT + TERMINAL reports exist

export async function closeProject(projectId, user)
// validate + update + audit

export async function activateProject(id, body, user)
// Composite: auto-create project + link-moa + transition + create schedule

export async function getProjectReadiness(id)
// 4-part checklist (proposal approved, special orders, MOA, schedule)

export async function getProjectReportingSchedule(id)
// Schedule + due dates + reports + upcoming/overdue partition
```

### Step 3: Create sub-route files

| Sub-route file | Endpoint(s) | Source lines |
|----------------|-------------|-------------|
| `crud.routes.ts` | `GET /projects`, `POST /projects`, `GET /projects/{id}`, `GET /projects/{id}/derived-state`, `POST /:id/restore` | 138-372 + 702-816 + 818-1201 + 1754-1767 |
| `status.routes.ts` | `POST /projects/{id}/link-moa`, `POST /projects/{id}/transition`, `POST /projects/{id}/close` | 374-700 |
| `activate.routes.ts` | `POST /projects/{id}/activate` | 1203-1371 |
| `reporting.routes.ts` | `GET /projects/{id}/readiness`, `GET /projects/{id}/reporting-schedule` | 1373-1752 |

### Step 4-7: index.ts, delete, verify, commit

Same pattern as Task 1.

---

## Task 4: Refactor action-center.routes.ts (823 lines → 1 route + service + schema)

> **Endpoints:** 1 (GET /action-center — no pagination, returns all items)
> **Key problem:** 700-line if/else per role with 11 near-identical for-loops, N+1 schedule queries

### Files to create/modify

| Action | File |
|--------|------|
| Create | `src/modules/action-center/action-center.schema.ts` |
| Create | `src/modules/action-center/action-center.service.ts` |
| Create | `src/modules/action-center/routes.ts` |
| Modify | `src/modules/action-center/index.ts` |
| Delete | `src/routes/action-center.routes.ts` |

### Step 1: Create `action-center.schema.ts`

3 schemas: `ActionItemSchema` (30-43), `ActionCenterResponseSchema` (45-57), `getActionCenterRoute` (59-72)

### Step 2: Create `action-center.service.ts`

The core refactoring — eliminate ~400 lines of duplication:

```ts
// UNIFIED QUERY FUNCTIONS (eliminate 4× proposal queries, 4× project queries, 3× report queries)

export async function getPendingProposals(db, user, role): Promise<ActionItem[]>
// Parameterized by: statusFilter, scopeBuilder, joinType
// Unifies: RET_CHAIR lines 106-159, DIRECTOR lines 343-401, FACULTY lines 591-647

export async function getProjectsByStatus(db, user, role, projectStatus): Promise<ActionItem[]>
// Parameterized by: projectStatus, scopeBuilder
// Unifies: RET_CHAIR overdue (219-277), DIRECTOR approved (404-462),
//           DIRECTOR overdue (465-521), FACULTY overdue (650-711)

export async function getUpcomingReports(db, user, role): Promise<ActionItem[]>
// Parameterized by: scopeBuilder
// Unifies: RET_CHAIR (280-340), DIRECTOR (524-583), FACULTY (714-778)

export async function batchFetchSchedules(projectIds): Promise<Map<string, {scheduleId}>>
// Eliminates N+1: single SELECT WHERE projectId IN (...) instead of 4 separate per-row queries

// PLUS: buildActionItems() factory for the repetitive for-loop pattern
// and getSuperAdminItems() for the single SUPER_ADMIN section (pending registrations)
```

### Step 3: Create `routes.ts`

~50 lines — the handler drops from ~750 to ~50:

```ts
const app = new OpenAPIHono<AuthEnv>();
app.use(authMiddleware);

app.openapi(getActionCenterRoute, async (c) => {
  const user = c.get("user");
  const actItems: ActionItem[] = [];
  const watchItems: ActionItem[] = [];
  const stats = { pendingReviews: 0, returnedProposals: 0, overdueReports: 0, expiringMoas: 0, projectsNeedingActivation: 0 };

  // Call service functions based on role, combine results
  const [proposals, projects, reports] = await Promise.all([
    getPendingProposals(db, user, user.roleName),
    getProjectsByStatus(db, user, user.roleName, "OVERDUE"),
    getUpcomingReports(db, user, user.roleName),
  ]);
  // ... combine into actItems/watchItems ...

  return c.json({ actItems, watchItems, stats });
});
```

### Step 4-6: index.ts, delete, verify, commit

Same pattern as Task 1.

---

## Task 5: Refactor moas.routes.ts (932 lines → 1 route + service + schema)

> **Endpoints:** 8 (GET × 3, POST × 3, PATCH × 1, undocumented restore × 1)
> **Key issues:** ParamId/PaginationQuery duplicated locally, restore route has wrong path

### Files to create/modify

| Action | File |
|--------|------|
| Create | `src/modules/moas/moas.schema.ts` |
| Create | `src/modules/moas/moas.service.ts` |
| Create | `src/modules/moas/moas.routes.ts` (moved from routes/) |
| Modify | `src/modules/moas/index.ts` |
| Delete | `src/routes/moas.routes.ts` |

### Step 1: Create `moas.schema.ts`

| Schema | Source line | Purpose |
|--------|------------|---------|
| `MoaSchema` | 130 | Base MOA shape |
| `MoaDetailSchema` | 143 | MOA with partner name + computed status |
| `MoaLinkedProjectSchema` | 159 | Project linked to MOA |
| `MoaListSchema` | 169 | Paginated list |
| `CreateMoaSchema` | 173 | Create body |
| `UpdateMoaSchema` | 181 | Update body |

Deduplication: Import `ParamId` from `@/lib/schemas.js` instead of redefining locally (line 189-194). For PaginationQuery with `archived` field, either extend the shared one or define a local `MoaPaginationQuery`.

### Step 2: Create `moas.service.ts`

```ts
export function canManageMoas(user): boolean
// Line 37-42: checks RET_CHAIR or DIRECTOR

export async function isMoaLinkedToUserProject(moaId, userId): Promise<boolean>
// Lines 49-63: auth fallback for non-manager roles

export async function syncProjectsToNewMoa(partnerId, newMoaId, validUntil, userId, ipAddress)
// Lines 69-127: find old MOAs → find linked projects → re-link + audit

export async function getMoaList(db, pagination)
// Lines 260-293: paginated query + count

export async function getMoaById(db, id)
// Lines 334-384: join query + status computation

export async function getLinkedProjects(db, id, user)
// Lines 430-482: multi-join with role scoping

export async function createMoa(db, body, user, ip)
// Lines 518-579: partner check + insert + audit + sync

export async function uploadMoaDocument(db, formData, user, ip)
// Lines 609-762: form validation → get-or-create partner → Supabase upload
//   (with rollback on DB failure) → insert → audit → sync

export async function updateMoa(db, id, body, user, ip)
// Lines 796-914: partial update + expired project restoration + audit

export async function restoreMoa(db, id)
// Lines 917-930: simple update (fix: add auth + audit)
```

### Step 3: Create `moas.routes.ts`

Move content from `routes/moas.routes.ts`, replacing inline logic with service calls. Fix:
- Restore route path: `/:id/restore` → proper OpenAPI route
- Restore route: add `canManageMoas()` auth + audit log
- Import `ParamId` from `@/lib/schemas.js`

### Step 4-6: index.ts, delete, verify, commit

Same pattern as Task 1.

---

## Task 6: Clean up — delete old routes/, move test files, final verification

### Step 1: Verify all route files moved

Confirm `src/routes/` only contains test files (route files deleted in Tasks 1-5).

### Step 2: Move test files to module directories

| Test file | New location |
|-----------|-------------|
| `src/routes/audit.routes.test.ts` | `src/modules/audit/audit.routes.test.ts` |
| `src/routes/auth.routes.test.ts` | `src/modules/auth/auth.routes.test.ts` |
| `src/routes/members.routes.test.ts` | `src/modules/members/members.routes.test.ts` |
| `src/routes/storage.routes.test.ts` | `src/modules/storage/storage.routes.test.ts` |
| `src/routes/special-orders.routes.test.ts` | `src/modules/special-orders/special-orders.routes.test.ts` |
| `src/routes/reports.routes.test.ts` | `src/modules/reports/reports.routes.test.ts` |
| `src/routes/settings.routes.test.ts` | `src/modules/settings/settings.routes.test.ts` |
| `src/routes/moas.routes.test.ts` | `src/modules/moas/moas.routes.test.ts` |
| `src/routes/projects.routes.test.ts` | `src/modules/projects/projects.routes.test.ts` |
| `src/routes/proposals.routes.test.ts` | `src/modules/proposals/proposals.routes.test.ts` |
| `src/routes/derived-states.routes.test.ts` | `src/modules/proposals/derived-states.routes.test.ts` |
| `src/routes/action-center.routes.test.ts` | `src/modules/action-center/action-center.routes.test.ts` (if exists) |

Update `../../test/helpers.js` imports to the new relative path from the module directory.

### Step 3: Update `src/app.ts`

Verify all imports point to `./modules/` (should already be correct from Sprint 1). Remove any remaining `./routes/` references.

### Step 4: Full verification

```bash
cd backend && npx tsc --noEmit && npx vitest run && npm run build
```

### Step 5: Commit

```bash
git add -A
git commit -m "refactor: delete old routes/ dir, move test files, final cleanup"
```

---

## Commit Sequence

| # | Commit message | What it does |
|---|---------------|-------------|
| 1 | `refactor(modules): split director into 6 sub-routes + service + schema` | Task 1 |
| 2 | `refactor(modules): split proposals into 5 sub-routes + service + schema` | Task 2 |
| 3 | `refactor(modules): split projects into 5 sub-routes + service + schema` | Task 3 |
| 4 | `refactor(modules): refactor action-center with unified service layer` | Task 4 |
| 5 | `refactor(modules): extract moas module with service layer` | Task 5 |
| 6 | `refactor: delete old routes/ dir, move test files, final cleanup` | Task 6 |

Each commit is atomic. `git revert --no-edit HEAD` rolls back any single task.

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Import path typos in split files | Each task verifies with `tsc --noEmit` + `vitest run` before committing |
| Service extraction changes behavior | Extract logic line-by-line without rewriting; no behavior changes |
| N+1 queries in action-center | Service uses batch prefetch (`IN (...)`) instead of per-row queries |
| Restore routes lack auth | Add proper OpenAPI docs + auth middleware during extraction |
| Missing test coverage | Existing tests cover all endpoints; import paths updated in Task 6 |
| MOA upload Supabase rollback | Extract to service; verify rollback works via existing tests |
