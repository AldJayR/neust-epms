# Code Quality Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate code duplication, remove dead routes never consumed by the frontend, fix API contract mismatches, and consolidate shared utilities across the backend.

**Architecture:** Extract duplicated RBAC scoping logic into `lib/scope-helpers.ts`, remove redundant error handler installations (keep only global), delete backend routes the frontend never calls, and fix the notifications HTTP method mismatch.

**Tech Stack:** TypeScript, Hono, Drizzle ORM, Vitest, Zod

---

## Pre-Flight

```bash
cd backend && pnpm typecheck && pnpm test && pnpm build
```

Expected: All tests pass, typecheck clean, build produces `dist/` output.

---

## Phase 1: Shared Utilities

### Task 1: Extract shared `lib/scope-helpers.ts`

The same role-based scoping logic is duplicated in 7+ files. Extract to a single shared utility.

**Files:**
- Create: `backend/src/lib/scope-helpers.ts`
- Create: `backend/src/lib/scope-helpers.test.ts`

**Step 1: Create the shared scope-helpers utility**

Create `backend/src/lib/scope-helpers.ts`:

```typescript
import { eq, isNull, type SQL } from "drizzle-orm";
import { proposals } from "@/db/schema/proposals.js";
import { ROLE_NAMES, type AuthUser } from "@/lib/types.js";

/**
 * Build role-based scoping conditions for the proposals table.
 * - Faculty: scoped to their department (if assigned) or campus.
 * - RET Chair: scoped to department (if main campus + department) or campus.
 * - Director / Super Admin: no filtering (full access).
 *
 * Always includes `isNull(proposals.archivedAt)` to exclude archived records.
 */
export function buildProposalScope(user: AuthUser): SQL[] {
	const conditions: SQL[] = [isNull(proposals.archivedAt)];
	if (user.roleName === ROLE_NAMES.FACULTY) {
		conditions.push(
			user.departmentId !== null
				? eq(proposals.departmentId, user.departmentId)
				: eq(proposals.campusId, user.campusId),
		);
	} else if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		conditions.push(
			user.isMainCampus && user.departmentId !== null
				? eq(proposals.departmentId, user.departmentId)
				: eq(proposals.campusId, user.campusId),
		);
	}
	return conditions;
}

/**
 * Build a single scope clause (not array) for use in OR/AND compositions.
 * Returns undefined for roles with full access (Director, Super Admin).
 */
export function buildProposalScopeClause(user: AuthUser): SQL | undefined {
	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		return user.isMainCampus && user.departmentId !== null
			? eq(proposals.departmentId, user.departmentId)
			: eq(proposals.campusId, user.campusId);
	}
	return undefined;
}
```

**Step 2: Write the unit test**

Create `backend/src/lib/scope-helpers.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildProposalScope, buildProposalScopeClause } from "./scope-helpers.js";
import { ROLE_NAMES } from "@/lib/types.js";

describe("buildProposalScope", () => {
	it("returns archivedAt condition for Director (full access)", () => {
		const user = { roleName: ROLE_NAMES.DIRECTOR, departmentId: 1, campusId: 1, isMainCampus: true } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(1);
	});

	it("scopes by department for Faculty with departmentId", () => {
		const user = { roleName: ROLE_NAMES.FACULTY, departmentId: 5, campusId: 1, isMainCampus: false } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(2);
	});

	it("scopes by campus for Faculty without departmentId", () => {
		const user = { roleName: ROLE_NAMES.FACULTY, departmentId: null, campusId: 3, isMainCampus: false } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(2);
	});

	it("scopes by department for RET Chair on main campus with departmentId", () => {
		const user = { roleName: ROLE_NAMES.RET_CHAIR, departmentId: 2, campusId: 1, isMainCampus: true } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(2);
	});

	it("scopes by campus for RET Chair not on main campus", () => {
		const user = { roleName: ROLE_NAMES.RET_CHAIR, departmentId: null, campusId: 4, isMainCampus: false } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(2);
	});

	it("scopes by campus for RET Chair on main campus but no departmentId", () => {
		const user = { roleName: ROLE_NAMES.RET_CHAIR, departmentId: null, campusId: 1, isMainCampus: true } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(2);
	});
});

describe("buildProposalScopeClause", () => {
	it("returns undefined for Director", () => {
		const user = { roleName: ROLE_NAMES.DIRECTOR, departmentId: 1, campusId: 1, isMainCampus: true } as any;
		expect(buildProposalScopeClause(user)).toBeUndefined();
	});

	it("returns department clause for RET Chair on main campus", () => {
		const user = { roleName: ROLE_NAMES.RET_CHAIR, departmentId: 2, campusId: 1, isMainCampus: true } as any;
		expect(buildProposalScopeClause(user)).toBeDefined();
	});

	it("returns campus clause for RET Chair not on main campus", () => {
		const user = { roleName: ROLE_NAMES.RET_CHAIR, departmentId: null, campusId: 4, isMainCampus: false } as any;
		expect(buildProposalScopeClause(user)).toBeDefined();
	});

	it("returns undefined for Faculty (uses array version instead)", () => {
		const user = { roleName: ROLE_NAMES.FACULTY, departmentId: 5, campusId: 1, isMainCampus: false } as any;
		expect(buildProposalScopeClause(user)).toBeUndefined();
	});
});
```

**Step 3: Run the test**

```bash
cd backend && pnpm exec vitest run src/lib/scope-helpers.test.ts
```

Expected: All 10 tests PASS.

**Step 4: Commit**

```bash
git add backend/src/lib/scope-helpers.ts backend/src/lib/scope-helpers.test.ts
git commit -m "feat(lib): extract shared role-based proposal scoping logic

Centralizes the duplicated RBAC scoping pattern (Faculty → dept/campus,
RET Chair → dept/campus based on isMainCampus) into lib/scope-helpers.ts.
"
```

---

### Task 2: Replace duplicated scoping in all consumers

Update each module to import from `lib/scope-helpers.ts` instead of defining its own copy.

**Files:**
- Modify: `backend/src/modules/search/search.service.ts`
- Modify: `backend/src/modules/projects/projects.service.ts`
- Modify: `backend/src/modules/proposals/proposals.service.ts` + `crud.routes.ts`
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/src/modules/action-center/action-center.service.ts`
- Modify: `backend/src/modules/moas/moas.service.ts`

**Step 1-6: Replace each module's local scoping function**

For each module:
1. Add `import { buildProposalScope } from "@/lib/scope-helpers.js";` (or `buildProposalScopeClause` for action-center/moas)
2. Delete the local scoping function
3. Replace all call sites

**Step 7: Run tests**

```bash
cd backend && pnpm test && pnpm typecheck
```

Expected: All tests PASS.

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: replace duplicated scoping logic with shared scope-helpers

Replaces 7+ local copies of the RBAC proposal scoping pattern with the
centralized buildProposalScope/buildProposalScopeClause from lib/scope-helpers.
"
```

---

### Task 3: Extract shared `lib/leader-subquery.ts`

The `getLeaderSubquery()` function is defined identically in 3 files.

**Files:**
- Create: `backend/src/lib/leader-subquery.ts`
- Modify: `backend/src/modules/projects/projects.service.ts`
- Modify: `backend/src/modules/proposals/proposals.service.ts`
- Modify: `backend/src/modules/action-center/action-center.service.ts`
- Modify: `backend/src/modules/director/director.service.ts`

**Step 1: Create the shared subquery**

Create `backend/src/lib/leader-subquery.ts`:

```typescript
import { eq } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";

/**
 * Reusable subquery that selects Project Leader members.
 * Used across projects, proposals, action-center, and director modules.
 */
export function getLeaderSubquery() {
	return db
		.select({
			proposalId: proposalMembers.proposalId,
			userId: proposalMembers.userId,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.projectRole, "Project Leader"))
		.as("leader_members");
}
```

**Step 2: Update consumers**

- `projects.service.ts`: Delete local `getLeaderSubquery`, import from `@/lib/leader-subquery.js`
- `proposals.service.ts`: Delete local `getLeaderSubquery`, import from `@/lib/leader-subquery.js`
- `action-center.service.ts`: Delete local `buildLeaderSubquery`, import from `@/lib/leader-subquery.js`, replace all `buildLeaderSubquery()` → `getLeaderSubquery()`
- `director.service.ts`: Replace inline leader subqueries with `import { getLeaderSubquery } from "@/lib/leader-subquery.js";`

**Step 3: Run tests**

```bash
cd backend && pnpm test && pnpm typecheck
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(lib): extract shared getLeaderSubquery to lib/leader-subquery.ts

Centralizes the Project Leader subquery that was duplicated across
projects, proposals, action-center, and director modules.
"
```

---

## Phase 2: Remove Redundant Error Handler

### Task 4: Remove redundant `installApiErrorHandler` from route files

The global error handler in `app.ts:128` already catches all errors. Each route file redundantly installs its own copy.

**Files:** 25+ route files (see list)

**Step 1: Remove `installApiErrorHandler` calls from all route files**

For each route file, remove:
1. `import { installApiErrorHandler } from "@/lib/errors.js";` (keep `ApiError` import if used)
2. `installApiErrorHandler(app);`

Files: `audit.routes.ts`, `settings.routes.ts`, `notifications.routes.ts`, `search.routes.ts`, `members.routes.ts`, `reports.routes.ts`, `special-orders.routes.ts`, `storage.routes.ts`, `admin.routes.ts`, `auth.routes.ts`, `submit.routes.ts`, `review.routes.ts`, `crud.routes.ts` (proposals), `comments.routes.ts`, `status.routes.ts` (projects), `reporting.routes.ts`, `crud.routes.ts` (projects), `activate.routes.ts`, `moas.routes.ts`, `dashboard.routes.ts`, `faculty-directory.routes.ts`, `moa-repository.routes.ts`, `project-hub.routes.ts`, `project-details.routes.ts`, `email-report.routes.ts`, `action-center.routes.ts`

**Step 2: Run full test suite**

```bash
cd backend && pnpm test && pnpm typecheck
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove redundant installApiErrorHandler from route files

The global error handler in app.ts already catches all errors. Each route
file was redundantly installing its own copy, stacking handlers unnecessarily.
"
```

---

## Phase 3: Delete Dead Backend Routes

These routes exist on the backend but are never called by the frontend.

### Task 5: Delete `POST /moas` (JSON create)

Frontend only uses `POST /moas/upload` (FormData), never JSON create.

**Files:**
- Modify: `backend/src/modules/moas/moas.routes.ts` — remove lines 131-162 (route + handler)
- Modify: `backend/src/modules/moas/moas.service.ts` — delete `createMoa()` function (lines 297+)
- Modify: `backend/src/modules/moas/moas.schema.ts` — delete `CreateMoaSchema`
- Modify: `backend/src/modules/moas/moas.routes.test.ts` — remove tests for `POST /moas`

**Step 1:** Remove route, handler, schema, service function, and tests

**Step 2:** Run tests: `cd backend && pnpm exec vitest run src/modules/moas`

**Step 3:** Commit:
```bash
git add -A
git commit -m "chore(moas): remove dead POST /moas route (JSON create)

Frontend only uses POST /moas/upload (FormData). This JSON create endpoint
was never called. Removes route, handler, createMoa() service function,
and CreateMoaSchema.
"
```

---

### Task 6: Delete `POST /special-orders` and `PATCH /special-orders/{id}`

Frontend only uses `POST /special-orders/upload` (FormData).

**Files:**
- Modify: `backend/src/modules/special-orders/special-orders.routes.ts` — remove `createRoute_` (lines 50-73) and `updateRoute` (lines 75-97)
- Modify: `backend/src/modules/special-orders/special-orders.service.ts` — delete `createSpecialOrder()` (lines 56+) and `updateSpecialOrder()` (lines 98+)
- Modify: `backend/src/modules/special-orders/special-orders.schema.ts` — delete `CreateSpecialOrderSchema` and `UpdateSpecialOrderSchema`
- Modify: `backend/src/modules/special-orders/special-orders.routes.test.ts` — remove tests for `POST /special-orders`

**Step 1:** Remove routes, handlers, service functions, schemas, and tests

**Step 2:** Run tests: `cd backend && pnpm exec vitest run src/modules/special-orders`

**Step 3:** Commit:
```bash
git add -A
git commit -m "chore(special-orders): remove dead JSON create/update routes

Frontend only uses POST /special-orders/upload (FormData). Removes:
- POST /special-orders (JSON create)
- PATCH /special-orders/{id} (JSON update)
- createSpecialOrder(), updateSpecialOrder() service functions
- CreateSpecialOrderSchema, UpdateSpecialOrderSchema
"
```

---

### Task 7: Delete `DELETE /reports/{id}`

Frontend never archives reports via this endpoint.

**Files:**
- Modify: `backend/src/modules/reports/reports.routes.ts` — remove lines 98-125 (route + handler)
- Modify: `backend/src/modules/reports/reports.service.ts` — delete `archiveReport()` function (lines 356+)
- Modify: `backend/src/modules/reports/reports.routes.test.ts` — remove tests for `DELETE /reports/:id`

**Step 1:** Remove route, handler, service function, and tests

**Step 2:** Run tests: `cd backend && pnpm exec vitest run src/modules/reports`

**Step 3:** Commit:
```bash
git add -A
git commit -m "chore(reports): remove dead DELETE /reports/{id} route

Frontend never archives reports via this endpoint. Removes the route,
handler, and archiveReport() service function.
"
```

---

### Task 8: Delete `POST /projects` and `POST /projects/{id}/link-moa`

Frontend has no "create project" UI (projects auto-create via activation). Frontend uses `POST /projects/{id}/activate` instead of `link-moa`.

**Files:**
- Modify: `backend/src/modules/projects/crud.routes.ts` — remove `POST /projects` route (lines 63-93) and the Director-only middleware (lines 31-38)
- Modify: `backend/src/modules/projects/status.routes.ts` — remove `POST /projects/{id}/link-moa` route (lines 27-63)
- Modify: `backend/src/modules/projects/projects.service.ts` — delete `createProjectFromProposal()` (lines 226+) and `linkMoaToProject()` (lines 592+)
- Modify: `backend/src/modules/projects/projects.schema.ts` — delete `CreateProjectSchema` and `LinkMoaSchema`
- Modify: `backend/src/modules/projects/projects.routes.test.ts` — remove tests for both routes

**Step 1:** Remove routes, handlers, service functions, schemas, and tests

**Step 2:** Run tests: `cd backend && pnpm exec vitest run src/modules/projects`

**Step 3:** Commit:
```bash
git add -A
git commit -m "chore(projects): remove dead create and link-moa routes

- POST /projects: Frontend has no "create project" UI; projects auto-create
  during activation via POST /projects/{id}/activate.
- POST /projects/{id}/link-moa: Frontend uses the composite activate endpoint
  instead. Removes route, handler, createProjectFromProposal(), linkMoaToProject(),
  CreateProjectSchema, LinkMoaSchema, and related tests.
"
```

---

### Task 9: Delete `GET /director/projects/{proposalId}`

Frontend uses `GET /projects/{id}` instead for project details.

**Files:**
- Delete: `backend/src/modules/director/project-details.routes.ts` (entire file)
- Modify: `backend/src/modules/director/index.ts` — remove `import projectDetails` and `router.route("/", projectDetails)`
- Modify: `backend/src/modules/director/director.service.ts` — delete `getProjectDetails()` (lines 813-1131)

**Step 1:** Delete file, remove import, delete service function

**Step 2:** Run tests: `cd backend && pnpm exec vitest run src/modules/director && pnpm typecheck`

**Step 3:** Commit:
```bash
git add -A
git commit -m "chore(director): remove dead GET /director/projects/{proposalId} route

Frontend uses GET /projects/{id} instead for project details. Removes the
entire project-details.routes.ts file, its import, and the getProjectDetails()
service function from director.service.ts.
"
```

---

### Task 10: Delete `POST /auth/users` (admin provision)

Frontend uses `POST /admin/users` instead. Both do the same thing.

**Files:**
- Modify: `backend/src/modules/auth/auth.routes.ts` — remove lines 137-172 (route + handler + auth middleware for `/auth/users`)
- Modify: `backend/src/modules/auth/auth.service.ts` — delete `assertCanProvisionUsers()` (lines 52+) and `createUser()` (lines 191+)
- Modify: `backend/src/modules/auth/auth.schema.ts` — delete `CreateUserBodySchema` (lines 37-50)
- Modify: `backend/src/modules/auth/auth.routes.test.ts` — remove tests for `POST /auth/users`

**Step 1:** Remove route, handler, service functions, schema, and tests

**Step 2:** Run tests: `cd backend && pnpm exec vitest run src/modules/auth`

**Step 3:** Commit:
```bash
git add -A
git commit -m "chore(auth): remove dead POST /auth/users route

Frontend uses POST /admin/users for user provisioning instead. Removes
the duplicate route, createUser(), assertCanProvisionUsers(), and
CreateUserBodySchema.
"
```

---

### Task 11: Delete `GET /proposals/metadata/sectors`

Frontend never fetches beneficiary sectors from this endpoint.

**Files:**
- Modify: `backend/src/modules/proposals/crud.routes.ts` — remove lines 575-598 (route + inline handler)

**Step 1:** Remove the route and handler

**Step 2:** Run tests: `cd backend && pnpm exec vitest run src/modules/proposals`

**Step 3:** Commit:
```bash
git add -A
git commit -m "chore(proposals): remove dead GET /proposals/metadata/sectors route

Frontend never fetches beneficiary sectors from this endpoint.
"
```

---

## Phase 4: Fix API Contract Mismatch

### Task 12: Fix HTTP method mismatch on `/notifications/read-all`

Frontend sends `PATCH` but backend defines `POST`.

**Files:**
- Modify: `backend/src/modules/notifications/notifications.routes.ts` — change `method: "post"` to `method: "patch"` on line 123

**Step 1:** Change the route method from `"post"` to `"patch"`

**Step 2:** Run tests: `cd backend && pnpm exec vitest run src/modules/notifications`

**Step 3:** Commit:
```
git add -A
git commit -m "fix(notifications): change read-all route from POST to PATCH

Frontend sends PATCH /notifications/read-all but backend defined POST.
Fixes the contract mismatch to match what the frontend actually sends.
"
```

---

## Final Verification

**Step 1:** Run complete verification

```bash
cd backend && pnpm typecheck && pnpm test && pnpm build
```

Expected: All tests pass, typecheck clean, build produces output.

**Step 2:** Verify no remaining scoping duplications

```bash
cd backend && grep -rn "ROLE_NAMES.FACULTY" src/modules/ --include="*.service.ts" | grep -v "scope-helpers"
```

Expected: Only references in scope-helpers.ts itself.

---

## Summary

| Phase | Task | Description | Files Changed |
|-------|------|-------------|---------------|
| **1** | 1 | Extract scope-helpers | +2 new |
| **1** | 2 | Replace 7+ duplicated scoping | 6 service files |
| **1** | 3 | Extract leader subquery | +1 new, 4 modified |
| **2** | 4 | Remove redundant error handler | 25 route files |
| **3** | 5 | Delete `POST /moas` | 4 files |
| **3** | 6 | Delete `POST/PATCH /special-orders` | 4 files |
| **3** | 7 | Delete `DELETE /reports/{id}` | 3 files |
| **3** | 8 | Delete `POST /projects` + `link-moa` | 5 files |
| **3** | 9 | Delete `GET /director/projects/{id}` | 3 files |
| **3** | 10 | Delete `POST /auth/users` | 4 files |
| **3** | 11 | Delete `GET /proposals/metadata/sectors` | 1 file |
| **4** | 12 | Fix notifications PATCH mismatch | 1 file |

**Total: ~55 files changed, 3 new lib files, 11 dead routes removed, 1 contract mismatch fixed.**
