# Sprint 1: Foundation — Lib, Services, and Module Structure

> **Status:** ✅ Completed

**Goal:** Establish the new module architecture by creating shared lib utilities, extracting cross-cutting services, and moving all route files into `modules/` directories.

**Branch:** `refactor/backend`

**Definition of Done:**
- All 5 lib/service files created and committed
- All 15 route files copied into `modules/<domain>/` with duplicate schemas cleaned up
- `app.ts` imports from `modules/`
- `tsc --noEmit` passes
- All existing tests pass

**Rollback:** `git revert --no-edit HEAD` after any single commit.

---

## Task 1: Create lib/schemas.ts

**Files:**
- Create: `backend/src/lib/schemas.ts`

Centralize `ErrorSchema`, `MessageSchema`, `ParamId`, `PaginationQuery` from all route files.

```ts
import { z } from "@hono/zod-openapi";

export const ErrorSchema = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
  })
  .openapi("Error");

export const MessageSchema = z
  .object({ message: z.string() })
  .openapi("Message");

export const ParamId = z
  .object({ id: z.coerce.number() })
  .openapi("ParamId");

export const PaginationQuery = z
  .object({
    page: z.coerce.number().optional().default(1),
    limit: z.coerce.number().optional().default(10),
  })
  .openapi("PaginationQuery");
```

## Task 2: Create lib/date.utils.ts

**Files:**
- Create: `backend/src/lib/date.utils.ts`

Extract `months` array and `formatDuration` from `director.routes.ts:1248` and `projects.routes.ts:1062`.

## Task 3: Create lib/supabase.ts

**Files:**
- Create: `backend/src/lib/supabase.ts`

Singleton `createClient` call — currently duplicated in 8 files.

## Task 4: Create services/auth-user.service.ts

**Files:**
- Create: `backend/src/services/auth-user.service.ts`
- Modify: `backend/src/routes/members.routes.ts` — replace local `isProjectLeader` with import
- Modify: `backend/src/routes/proposals.routes.ts` — replace local `isProjectLeader` with import

Extract role/scope checks currently duplicated in `members.routes.ts:17-33` and `proposals.routes.ts:48-63`.

## Task 5: Create services/file.service.ts

**Files:**
- Create: `backend/src/services/file.service.ts`
- Modify: `backend/src/routes/storage.routes.ts` — replace local `sanitizeFilename` with import
- Modify: `backend/src/routes/moas.routes.ts` — replace local `sanitizeFilename` with import
- Modify: `backend/src/routes/special-orders.routes.ts` — replace local `sanitizeFilename` with import

Extract `sanitizeFilename()` currently duplicated in 3 files.

## Task 6: Move all route files into modules/

**Files:**
- Create: `backend/src/modules/auth/auth.routes.ts`
- Create: `backend/src/modules/admin/admin.routes.ts`
- Create: `backend/src/modules/members/members.routes.ts`
- Create: `backend/src/modules/storage/storage.routes.ts`
- Create: `backend/src/modules/special-orders/special-orders.routes.ts`
- Create: `backend/src/modules/search/search.routes.ts`
- Create: `backend/src/modules/reports/reports.routes.ts`
- Create: `backend/src/modules/notifications/notifications.routes.ts`
- Create: `backend/src/modules/settings/settings.routes.ts`
- Create: `backend/src/modules/audit/audit.routes.ts`
- Create: `backend/src/modules/director/` (placeholder — empty, will be populated in Sprint 2)
- Create: `backend/src/modules/proposals/` (placeholder)
- Create: `backend/src/modules/projects/` (placeholder)
- Create: `backend/src/modules/action-center/` (placeholder)
- Create: `backend/src/modules/moas/` (placeholder)
- Modify: `backend/src/app.ts`

While copying each file, replace its local `ErrorSchema`/`MessageSchema`/`ParamId`/`PaginationQuery` definitions with imports from `../../lib/schemas.js`.

The big 4 modules (director, proposals, projects, action-center) get empty `index.ts` barrels that re-export the original route file — so `app.ts` can consistently import from `./modules/<name>`.

Example for director placeholder:
```ts
// backend/src/modules/director/index.ts
import app from "../../routes/director.routes.js";
export default app;
```

This keeps `app.ts` imports clean while the big files haven't been split yet.

---

## Completion Summary

**Completed:** 2026-07-08

**Commits:**
1. `ca04f69` — `refactor(backend): extract shared lib/services and modernize tsconfig` (Tasks 1-5 + tsconfig modernization)
2. `8cf4aa8` — `refactor(backend): normalize all imports to use @/ path alias` (post-sprint improvement)

**Files changed:** 51 + 68 = 119 files across both commits

**What was delivered:**
- `lib/schemas.ts` — centralized ErrorSchema, MessageSchema, ParamId, PaginationQuery
- `lib/date.utils.ts` — extracted months, formatDuration, getCurrentAcademicYear, getCurrentSemester
- `lib/supabase.ts` — singleton Supabase client
- `services/auth-user.service.ts` — isProjectLeader, PROJECT_LEADER_ROLE, isExtensionDirector, getUserRole
- `services/file.service.ts` — sanitizeFilename
- `modules/` — 15 directories created, all 10 small route files moved, big 4 get barrel index.ts re-exports
- `app.ts` — imports from `modules/` instead of `routes/`
- `tsconfig.json` — modernized (removed deprecated baseUrl, added @/* alias, enabled strict options)
- All cross-directory imports normalized to `@/` path alias

**Verification:** `tsc --noEmit` clean, all 193 tests pass, `npm run build` succeeds.

**Sprint 2 prep:** Big 4 modules (director, proposals, projects, action-center) ready for sub-route extraction and service layer creation.
