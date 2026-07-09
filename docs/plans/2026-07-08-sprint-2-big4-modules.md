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

## Task 1: Split director.routes.ts (1705 lines → 6 sub-routes + service + schema) ✅

> **Endpoints:** 7 (GET × 6, POST × 1)
> **Key duplication:** RET_CHAIR scoping logic 7×, leader subquery 2×, faculty query 2×
>
> **Completed:** Commit `6c53e1a` on `refactor/backend`. Created `director.schema.ts` (16 schemas), `director.service.ts` (8 functions), 6 thin sub-route files, updated `index.ts`. Removed dead helper functions. Fixed missing `roles` import, `env` usage, `exactOptionalPropertyTypes`. Deleted old `routes/director.routes.ts`. All 193 tests pass.

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

## Task 2: Split proposals.routes.ts (1788 lines → 4 sub-routes + service + schema) ✅

> **Endpoints:** 14 (GET × 7, POST × 5, PATCH × 1, undocumented restore × 1)
> **Key duplication:** role-scope where-conditions every query, leader subquery 5×+
>
> **Completed:** Commit `53da159` on `refactor/backend`. Created `proposals.schema.ts` (12 schemas), `proposals.service.ts` (9 functions), 4 sub-route files (crud, submit, review, comments), updated `index.ts`. Removed unused leader query from review handler. Fixed test mock expectations. Deleted old `routes/proposals.routes.ts`. All 193 tests pass.

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
| `ProposalSchema` | 52-76 | Proposal response shape (proposalId, campusId, title, status, leader info, etc.) |
| `ProposalListSchema` | 78-80 | `{ items: Proposal[], total: number }` |
| `RETDashboardStatsSchema` | 82-88 | `{ pendingReview, approvedProjects, deniedProjects }` |
| `CreateProposalSchema` | 90-115 | Create body: campusId, departmentId, title, bannerProgram, projectLocale, extensionCategory, budgets, dates, members[], departmentIds[], sectorIds[], sectorNames[], sdgIds[] |
| `UpdateProposalSchema` | 117-127 | Update body: all optional fields (title, bannerProgram, projectLocale, extensionCategory, budgets, sectorNames) |
| `ReviewProposalSchema` | 129-139 | `{ decision: Endorsed|Approved|Returned|Rejected, comments?: string }` |
| `DerivedStateSchema` | 456-463 | `{ state: ACT|WAIT|WATCH, owner, reason, nextTransition }` |
| `CommentParams` | 1559-1568 | `{ id: uuid, docId: uuid }` |
| `CreateCommentSchema` | 1570-1584 | `{ content: string, annotationJson?: {x,y,width,height,page} \| null }` |
| `CommentUserSchema` | 1586-1591 | `{ userId, name, email, roleName }` |
| `CommentResponseSchema` | 1593-1612 | Full comment with user info |
| `CommentListSchema` | 1614 | `CommentResponseSchema[]` |
| `ParamId` | 141-146 | Import from `@/lib/schemas.js` instead |
| `PaginationQuery` | 148-178 | Import from `@/lib/schemas.js` (needs `archived` field extension or local variant) |

**Note:** `ParamId` is defined locally at line 141-146 but should import from `@/lib/schemas.js`. `PaginationQuery` at line 148-178 has an `archived` field not in the shared version — either extend the shared one or define `ProposalPaginationQuery` locally.

### Step 2: Create `proposals.service.ts`

```ts
// ── Shared helpers (eliminate 5× duplication) ──

export function buildProposalScopeConditions(user: AuthUser): SQL[]
// Lines 214-226, 400-412, 488-505, 599-617, 835-846 (appear in list, get-by-id, derived-state, create, update)
// FACULTY: departmentId or campusId scope
// RET_CHAIR: isMainCampus ? departmentId : campusId scope
// DIRECTOR/SUPER_ADMIN: no scope (unfiltered)

export function getLeaderSubquery()
// Lines 228-235, 507-514: CTE selecting proposalMembers WHERE projectRole = 'Project Leader'
// Used in: list, derived-state

export function getUserMemberSubquery(userId: string)
// Lines 237-244: CTE checking if current user is a member
// Used in: list only

// ── CRUD operations ──

export async function checkDuplicateTitle(title: string): Promise<boolean>
// Lines 620-632: case-insensitive ilike check, returns true if duplicate exists

export async function createProposalInTransaction(tx, body, user): Promise<Proposal>
// Lines 634-748: transaction that inserts proposal + members + departments + sectors + SDGs
// - Auto-adds creator as Project Leader if not in members[]
// - sectorNames: get-or-create pattern (check existing, insert if not found)
// - If no sectorIds/sectorNames: defaults to first sector in DB
// - Sets bypassedRetChair = true if creator is RET_CHAIR

export async function updateProposalWithSectors(id, body, existing): Promise<Proposal>
// Lines 820-964: update proposal + optional sector re-sync
// - Updates only provided fields (title, bannerProgram, projectLocale, extensionCategory, budgets)
// - If sectorNames provided: delete existing proposalBeneficiaries, re-insert new ones
// - Uses captureAuditDiff for audit log

// ── Submit flow ──

export async function validateCompleteness(proposalId: string): Promise<void>
// Lines 1019-1110: throws ApiError(400, 'INCOMPLETE_PROPOSAL', ...) on first failure
// 5 checks in order:
//   1. Documents: at least 1 proposalDocuments row
//   2. Members: at least 1 member + at least 1 Project Leader
//   3. Sectors: at least 1 proposalBeneficiaries row
//   4. SDGs: at least 1 proposalSdgs row
//   5. Dates: targetStartDate + targetEndDate present, end >= start

// ── Review state machine ──

export async function processReview(user, proposalId, body): Promise<void>
// Lines 1205-1452: full state machine
// EC-01: conflict-of-interest — isProjectLeader blocks review (line 1239)
// Scope check: RET_CHAIR can only review proposals in their department/campus (lines 1248-1266)
// 3 flows:
//   RET Chair + PENDING_REVIEW + !bypassedRetChair: Endorsed|Returned|Rejected
//   Director + ENDORSED: Approved|Returned|Rejected
//   Director + PENDING_REVIEW + bypassedRetChair: Approved|Returned|Rejected
// EC-04: revisionNum incremented on RETURNED (line 1353)
// EC-05: stacked rejections preserved — always INSERT proposalReviews, never UPDATE (line 1364)
// DFD 6.1: Director returning Endorsed sets bypassedRetChair=true (lines 1357-1360)
// On APPROVED: creates projects row if not exists (lines 1396-1409)
// Sends notification to project leader with role-specific message (lines 1419-1449)
```

### Step 3: Create sub-route files

| Sub-route file | Endpoint(s) | Source lines | Key logic |
|----------------|-------------|-------------|-----------|
| `crud.routes.ts` | `GET /proposals`, `GET /proposals/{id}`, `POST /proposals`, `PATCH /proposals/{id}`, `GET /proposals/ret/dashboard-stats`, `GET /proposals/{id}/derived-state`, `GET /proposals/metadata/sdgs`, `GET /proposals/metadata/sectors`, `GET /proposals/metadata/requirements`, `POST /proposals/:id/restore` | 182-302, 304-369, 371-453, 455-566, 568-783, 785-964, 1454-1554, 1770-1786 | List with role scope + leader/member subqueries, create in transaction, update with sector re-sync, RET stats, derived state (deriveProposalState), metadata (static), restore (undocumented → add OpenAPI+auth) |
| `submit.routes.ts` | `POST /proposals/{id}/submit` | 966-1171 | Leader check, status check (Draft|Returned), 5 completeness validations, status→PENDING_REVIEW, audit, notification |
| `review.routes.ts` | `POST /proposals/{id}/review` | 1173-1452 | Leader conflict check, scope check, state machine (3 flows), revision increment, bypassedRetChair flag, project creation on approval, audit, notifications |
| `comments.routes.ts` | `POST + GET /proposals/{id}/documents/{docId}/comments` | 1556-1768 | Create: insert with user info + annotation JSON. List: join with users+roles for author info. RET_CHAIR bypass check on create. |

**Endpoint count per sub-route:**
- `crud.routes.ts`: 10 endpoints (GET×4, POST×2, PATCH×1, GET metadata×3) + undocumented restore
- `submit.routes.ts`: 1 endpoint
- `review.routes.ts`: 1 endpoint
- `comments.routes.ts`: 2 endpoints

**Auth middleware:** `app.ts` registers auth for `/proposals/*` at root — sub-routes inherit this. No need to add `authMiddleware` + `requireRole` in each sub-route (unlike director which required explicit role checks).

### Step 4: Create `index.ts`

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

### Step 5: Delete `src/routes/proposals.routes.ts`

### Step 6: Verify

```bash
cd backend && npx tsc --noEmit && npx vitest run
```

### Step 7: Commit

```bash
git add -A
git commit -m "refactor(modules): split proposals into 4 sub-routes + service + schema"
```

### Step 8: Notes for implementation

- **Auth:** The existing code has a comment "Auth for /proposals/* is registered once at the root app (see app.ts)." — sub-routes do NOT add authMiddleware/requireRole. They inherit from the root mount.
- **Restore route:** Lines 1770-1786 use `app.post("/:id/restore")` without OpenAPI docs or auth — convert to proper `createRoute` with auth middleware and `ApiError` response schema.
- **PaginationQuery with archived:** The local PaginationQuery (line 148-178) has an `archived` field not in `@/lib/schemas.js`. Either extend shared or define `ProposalPaginationQuery` locally.
- **Role names:** Uses `ROLE_NAMES.FACULTY`, `ROLE_NAMES.RET_CHAIR`, `ROLE_NAMES.DIRECTOR`, `ROLE_NAMES.SUPER_ADMIN` — all available from `@/lib/types.js`.
- **Review schema imports:** `REVIEW_DECISION`, `REVIEW_STAGE`, `PROPOSAL_STATUS` from `@/lib/types.js`.
- **Service dependencies:** `deriveProposalState` from `@/lib/derived-states.js`, `isProjectLeader` + `PROJECT_LEADER_ROLE` from `@/services/auth-user.service.js`, `createNotification` from `@/lib/notification.helpers.js`.

---

## Task 3: Split projects.routes.ts (1769 lines → 4 sub-routes + service + schema) ✅

> **Endpoints:** 11 (GET × 5, POST × 5, undocumented restore × 1)
> **Key duplication:** role-scope filtering 3×, leader subquery 3×, MOA expiry check 4×, project lookup 6×
> **Auth pattern:** Unlike proposals (auth at root `app.ts`), projects registers `authMiddleware` + `requireRole` **inline** in the route file. Each sub-route must re-register these.
> **Audit IP:** `getClientIp(c)` requires the Hono context — service functions doing audit calls must accept `ipAddress: string` from the handler.

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
| `ParamId` | 88 | Path param (reuse `@/lib/schemas.js` if compatible, else local) |
| `PaginationQuery` | 95 | Query params (local — includes `archived` field not in shared version) |
| `ProjectDerivedStateSchema` | 703 | Derived state response |
| `ProjectDetailsMemberSchema` | 820 | Member with special order |
| `ProjectDetailsHistoryItemSchema` | 838 | History entry |
| `ProjectDetailsAttachmentSchema` | 847 | Attachment |
| `ProjectDetailsSchema` | 855 | Full details response |
| `ActivateSchema` | 1204 | Activation body |
| `ProjectReadinessSchema` | 1374 | Readiness checklist |
| `ProjectReportingScheduleSchema` | 1572 | Schedule response |

### Step 2: Create `projects.service.ts`

Service functions take data deps as params. Functions that write audit logs accept `ipAddress: string` (handler extracts via `getClientIp(c)`).

```ts
// ── Shared helpers ──

export function buildUserProjectScope(user: AuthUser): SQL[]
// FACULTY/RET_CHAIR proposal-scope filtering — shared by LIST, DERIVED, DETAILS
// Lines 160-174 (LIST), 735-754 (DERIVED), 957-981 (DETAILS security check)

export function getLeaderSubquery(): SubqueryWithSelection<"proposalId" | "userId">
// Reusable CTE for Project Leader lookup via proposalMembers
// Lines 181-188, 756-763, 909-916 — appears 3× identically

// ── CRUD ──

export async function listProjects(
  user: AuthUser,
  opts: { page: number; limit: number; archived?: string },
): Promise<{ items: ProjectRow[]; total: number }>
// Lines 154-262: role scope + 4-way join + pagination + count

export async function createProjectFromProposal(
  proposalId: string,
  user: AuthUser,
  ipAddress: string,
): Promise<ProjectRow>
// Lines 289-372: transaction — validate proposal Approved, check 1:1, insert, audit

export async function getProjectDetails(
  id: string,
  user: AuthUser,
): Promise<ProjectDetailsResponse>
// Lines 905-1201: security check + 5 parallel queries + Supabase signed URLs + history assembly

// ── Status transitions ──

export async function linkMoaToProject(
  projectId: string,
  moaId: string,
  user: AuthUser,
  ipAddress: string,
): Promise<void>
// Lines 404-455: project+MOA lookup, expiry check, update, audit

export async function validateTransition(
  project: { projectId: string; projectStatus: string; moaId: string | null },
  targetStatus: string,
): Promise<void>
// Lines 488-545: Approved→Ongoing (MOA required + expiry re-check), Ongoing→Completed

export async function transitionProjectStatus(
  projectId: string,
  targetStatus: string,
  user: AuthUser,
  ipAddress: string,
): Promise<void>
// Lines 483-573: fetch project + validateTransition + update + audit diff

export async function closeProject(
  projectId: string,
  user: AuthUser,
  ipAddress: string,
): Promise<void>
// Lines 605-700: fetch project, validate state, check FINAL_ACCOMPLISHMENT + TERMINAL reports, update + audit

// ── Activate ──

export async function activateProject(
  id: string,
  body: { moaId: string; reportingFrequency: string; dueDates: Array<{ reportType: string; dueDate: string }> },
  user: AuthUser,
  ipAddress: string,
): Promise<void>
// Lines 1243-1371: composite — auto-create project if needed, validate MOA, link+transition+schedule in tx, audit

// ── Readiness & schedule ──

export async function getProjectReadiness(id: string): Promise<ReadinessResponse>
// Lines 1408-1569: 4-part checklist (proposal approved, special orders, MOA validity, reporting schedule)

export async function getProjectReportingSchedule(id: string): Promise<ReportingScheduleResponse>
// Lines 1626-1752: schedule lookup + due dates + reports + upcoming/overdue partition
```

### Step 3: Create sub-route files

Each sub-route creates its own `OpenAPIHono<AuthEnv>` and registers auth middleware independently.

**Auth middleware pattern** (must appear in each sub-route file that has protected endpoints):
```ts
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { ROLE_NAMES } from "@/lib/types.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);
app.use("/*", authMiddleware);
```

#### 3a. `crud.routes.ts` — 5 endpoints

| Endpoint | Auth | Source lines |
|----------|------|-------------|
| `GET /projects` | authMiddleware only (all roles) | 138-262 |
| `POST /projects` | authMiddleware + requireRole(DIRECTOR) | 264-372 |
| `GET /projects/{id}` | authMiddleware only | 880-1201 |
| `GET /projects/{id}/derived-state` | authMiddleware only | 712-816 |
| `POST /:id/restore` | authMiddleware only (undocumented) | 1754-1767 |

**Note:** POST /projects needs conditional role guard — only POST is director-only, GET passes through. Use the same pattern from original (lines 127-133):
```ts
const directorOnly = requireRole(ROLE_NAMES.DIRECTOR);
app.use("/projects", async (c, next) => {
  if (c.req.method === "POST") return directorOnly(c, next);
  return next();
});
```

#### 3b. `status.routes.ts` — 3 endpoints

| Endpoint | Auth | Source lines |
|----------|------|-------------|
| `POST /projects/{id}/link-moa` | authMiddleware + requireRole(DIRECTOR) | 374-455 |
| `POST /projects/{id}/transition` | authMiddleware + requireRole(DIRECTOR) | 457-573 |
| `POST /projects/{id}/close` | authMiddleware + requireRole(DIRECTOR) | 575-700 |

```ts
app.use("/*", authMiddleware);
app.use("/*", requireRole(ROLE_NAMES.DIRECTOR));
```

#### 3c. `activate.routes.ts` — 1 endpoint

| Endpoint | Auth | Source lines |
|----------|------|-------------|
| `POST /projects/{id}/activate` | authMiddleware + requireRole(DIRECTOR) | 1203-1371 |

```ts
app.use("/*", authMiddleware);
app.use("/*", requireRole(ROLE_NAMES.DIRECTOR));
```

**Note:** Handler also does `user.roleName !== ROLE_NAMES.DIRECTOR` check at line 1248 — keep this as a service-level guard (belt-and-suspenders) or remove since middleware already enforces it. Recommend removing (redundant).

#### 3d. `reporting.routes.ts` — 2 endpoints

| Endpoint | Auth | Source lines |
|----------|------|-------------|
| `GET /projects/{id}/readiness` | authMiddleware only | 1373-1569 |
| `GET /projects/{id}/reporting-schedule` | authMiddleware only | 1571-1752 |

```ts
app.use("/*", authMiddleware);
```

### Step 4: Update `index.ts`

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

### Step 5: Delete `src/routes/projects.routes.ts`

### Step 6: Verify

```bash
npx tsc --noEmit          # 0 errors
npx vitest run            # 193/193 pass (existing test file imports from ./index.js)
```

**Test file impact:** `projects.routes.test.ts` imports from `./index.js` — it will automatically pick up the new sub-routed module. No test changes needed.

### Step 7: Commit

```
refactor(projects): split projects routes into sub-routes + service + schema
```

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
