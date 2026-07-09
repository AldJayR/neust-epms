# Sprint 3 Small Modules Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish backend module homogenization by splitting the remaining smaller modules into route, schema, and service layers without changing API behavior.

**Architecture:** Keep each public Hono app and route path stable while moving Zod schemas into `<module>.schema.ts` and business/database logic into `<module>.service.ts`. Follow the existing `moas` and `proposals` pattern: `createRoute` declarations stay in `.routes.ts`, schemas are imported from `.schema.ts`, and route handlers only parse HTTP inputs, call service functions, and return responses.

**Tech Stack:** TypeScript ESM, Hono `OpenAPIHono`, `@hono/zod-openapi`, Drizzle ORM, Supabase, Vitest, pnpm

---

## Current Baseline

Sprint 1 and Sprint 2 are already complete. The old `backend/src/routes` directory no longer exists, and `backend/src/app.ts` already imports route apps from `backend/src/modules`.

Existing foundation files are already present:
- `backend/src/lib/schemas.ts`
- `backend/src/lib/supabase.ts`
- `backend/src/services/auth-user.service.ts`
- `backend/src/services/file.service.ts`

Do not repeat route-directory deletion, test-file moves, or shared foundation extraction in Sprint 3.

## Required Module Shape

Each remaining module should end in this shape:

```text
backend/src/modules/<module>/
├── index.ts                # Optional barrel, recommended for consistency
├── <module>.routes.ts      # Hono app, middleware, createRoute declarations, HTTP parsing
├── <module>.schema.ts      # Zod/OpenAPI schemas only
└── <module>.service.ts     # DB queries, transactions, Supabase/cache/audit side effects
```

Rules:
- Preserve all route paths exactly.
- Preserve each `.routes.ts` default export.
- If adding `index.ts`, update `backend/src/app.ts` imports explicitly.
- Keep multipart `FormData` parsing in route handlers; pass `File`, parsed fields, `AuthUser`, and IP address into services.
- Keep rate limiters and Hono middleware in route files.
- Do not move `createRoute` definitions into schema files for Sprint 3; use the `moas`/`proposals` style.
- Prefer `@/` imports for shared modules and relative imports for same-module files.

## Verification Commands

Run commands from `backend/`.

```bash
pnpm typecheck
pnpm exec vitest run src/modules/<module>/<module>.routes.test.ts
pnpm test
pnpm build
```

Expected results:
- `pnpm typecheck` passes with no TypeScript errors.
- Targeted module route tests pass after each module refactor.
- Final `pnpm test` and `pnpm build` pass.

## Known Test Coverage Gaps

Route tests currently exist for:
- `auth`
- `audit`
- `members`
- `reports`
- `settings`
- `special-orders`
- `storage`

Route tests are missing and should be added before extraction for:
- `admin`
- `notifications`
- `search`

Known test-risk to fix when touching auth:
- `backend/src/modules/auth/auth.routes.test.ts` mocks `../lib/password-check.js`, but production code imports `@/lib/password-check.js`. Correct the mock to the alias path before relying on that test for password-check behavior.

---

### Task 1: Refactor Auth Module

**Files:**
- Create: `backend/src/modules/auth/auth.schema.ts`
- Create: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.routes.ts`
- Modify: `backend/src/modules/auth/auth.routes.test.ts`

**Step 1: Fix the password-check test mock**

Change the mock path in `auth.routes.test.ts` from `../lib/password-check.js` to `@/lib/password-check.js`.

Run: `pnpm exec vitest run src/modules/auth/auth.routes.test.ts`

Expected: Existing tests still pass or expose real auth-route failures to preserve during extraction.

**Step 2: Extract auth schemas**

Move these schemas from `auth.routes.ts` into `auth.schema.ts` and export them:
- `UserResponseSchema`
- `RegisterUserBodySchema`
- `CreateUserBodySchema`
- `CheckPasswordBodySchema`
- `CheckPasswordResponseSchema`
- `LoginBodySchema`
- `LoginResponseSchema`
- `LogoutResponseSchema`
- `OnboardingCompleteResponseSchema`
- `UserSearchQuerySchema`
- `UserSearchResponseSchema`

Keep `ErrorSchema` imported from `@/lib/schemas.js`.

**Step 3: Extract auth service functions**

Create service functions for current handler logic:
- `checkPassword(password: string)`
- `registerUser(body, ipAddress)`
- `createUser(body, authUser, ipAddress)`
- `listDepartments()`
- `listCampuses()`
- `searchUsers(search: string)`
- `login(body, ipAddress)`
- `logout(authUser, bearerToken, ipAddress)`
- `completeOnboarding(userId: string)`

Move DB queries, Supabase calls, audit writes, cache invalidation, duplicate-profile checks, and password-compromise checks into these service functions.

**Step 4: Thin `auth.routes.ts`**

Keep only:
- `OpenAPIHono` setup
- error handler installation
- rate limiters
- auth middleware registration
- `createRoute` declarations
- `c.req.valid(...)`, `c.get("user")`, `c.req.header(...)`, `getClientIp(c)` calls
- service calls and `c.json(...)` responses

**Step 5: Verify auth**

Run: `pnpm typecheck`

Run: `pnpm exec vitest run src/modules/auth/auth.routes.test.ts`

Expected: Both pass.

**Step 6: Commit**

```bash
git add backend/src/modules/auth
git commit -m "refactor(auth): split routes schemas and service"
```

---

### Task 2: Add Admin Route Tests

**Files:**
- Create: `backend/src/modules/admin/admin.routes.test.ts`
- Read: `backend/test/helpers.ts`
- Read: `backend/test/setup.ts`

**Step 1: Add baseline route tests**

Cover the current externally visible behavior before extraction:
- `GET /admin/stats` returns counts for Super Admin.
- `GET /admin/users` returns paginated users.
- `PATCH /admin/users/status` rejects self-deactivation.
- `PATCH /admin/users/status` updates other users.
- `PATCH /admin/users/approve` handles empty approval list.
- `PATCH /admin/users/{id}/reject` returns 404 when user does not exist.
- `POST /admin/users` rejects non-Super Admin.
- `PATCH /admin/users/{id}` returns 404 for missing user.

Use the existing `setMockUser`, `MOCK_USERS`, `mockSelectChain`, and `mockMutationChain` helpers.

**Step 2: Verify tests fail or pass against current behavior**

Run: `pnpm exec vitest run src/modules/admin/admin.routes.test.ts`

Expected: Tests pass against the current module. If a test fails because the assertion does not match existing behavior, fix the test, not production code.

**Step 3: Commit**

```bash
git add backend/src/modules/admin/admin.routes.test.ts
git commit -m "test(admin): cover existing admin routes"
```

---

### Task 3: Refactor Admin Module

**Files:**
- Create: `backend/src/modules/admin/admin.schema.ts`
- Create: `backend/src/modules/admin/admin.service.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts`
- Test: `backend/src/modules/admin/admin.routes.test.ts`

**Step 1: Extract admin schemas**

Move and export schemas for:
- user response
- user list response
- admin stats response
- bulk status body
- bulk approval body
- user reject body
- director provisioning body and response
- user update body and response
- admin UUID params
- roles response

**Step 2: Extract admin service functions**

Create service functions for:
- `getAdminStats()`
- `listUsers(query)`
- `bulkUpdateUserStatus(authUser, body, ipAddress)`
- `listRoles()`
- `bulkApproveUsers(authUser, body, ipAddress)`
- `rejectUser(authUser, id, body, ipAddress)`
- `provisionDirector(authUser, body, ipAddress)`
- `updateUser(authUser, id, body, ipAddress)`

Move DB queries, transaction logic, Supabase user creation, audit diffs, audit writes, cache invalidation, and notification creation into the service.

**Step 3: Thin `admin.routes.ts`**

Keep route middleware and HTTP request/response handling only.

**Step 4: Verify admin**

Run: `pnpm typecheck`

Run: `pnpm exec vitest run src/modules/admin/admin.routes.test.ts`

Expected: Both pass.

**Step 5: Commit**

```bash
git add backend/src/modules/admin
git commit -m "refactor(admin): split routes schemas and service"
```

---

### Task 4: Refactor Storage Module

**Files:**
- Create: `backend/src/modules/storage/storage.schema.ts`
- Create: `backend/src/modules/storage/storage.service.ts`
- Modify: `backend/src/modules/storage/storage.routes.ts`
- Test: `backend/src/modules/storage/storage.routes.test.ts`

**Step 1: Extract storage schemas**

Move and export:
- `UploadResponseSchema`
- `DocumentListSchema`
- `PresignedUrlSchema`
- `ProposalParam`
- `DocumentParam`
- module-specific pagination query, or reuse `PaginationQuery` from `@/lib/schemas.js` if behavior remains identical

**Step 2: Extract storage service functions**

Create service functions for:
- `listProposalDocuments(user, proposalId, query)`
- `uploadProposalDocument(user, proposalId, file, contentLength, ipAddress)`
- `getProposalDocumentSignedUrl(user, proposalId, documentId, ipAddress)`

Move access checks, proposal lookup, version locking, storage path generation, Supabase upload, DB insert, rollback removal, signed URL generation, and audit writes into the service.

**Step 3: Keep multipart parsing in routes**

Routes should still call `await c.req.formData()` and validate that `file instanceof File` before calling the upload service.

**Step 4: Verify storage**

Run: `pnpm typecheck`

Run: `pnpm exec vitest run src/modules/storage/storage.routes.test.ts`

Expected: Both pass.

**Step 5: Commit**

```bash
git add backend/src/modules/storage
git commit -m "refactor(storage): split routes schemas and service"
```

---

### Task 5: Refactor Special Orders Module

**Files:**
- Create: `backend/src/modules/special-orders/special-orders.schema.ts`
- Create: `backend/src/modules/special-orders/special-orders.service.ts`
- Modify: `backend/src/modules/special-orders/special-orders.routes.ts`
- Test: `backend/src/modules/special-orders/special-orders.routes.test.ts`

**Step 1: Extract special-order schemas**

Move and export:
- `SpecialOrderSchema`
- `SpecialOrderListSchema`
- `CreateSpecialOrderSchema`
- `UpdateSpecialOrderSchema`
- `SignedUrlSchema`
- `ParamId`
- pagination query

**Step 2: Extract service functions**

Create service functions for:
- `listSpecialOrders(query)`
- `createSpecialOrder(user, body, ipAddress)`
- `updateSpecialOrder(id, body)`
- `uploadSpecialOrder(user, file, memberId, soNumber, contentLength, ipAddress)`
- `getSpecialOrderSignedUrl(user, id, ipAddress)`

Move member existence checks, Director/Project Leader/member authorization, Supabase upload, duplicate SO handling, rollback removal, record formatting, and audit writes into the service.

**Step 3: Verify special orders**

Run: `pnpm typecheck`

Run: `pnpm exec vitest run src/modules/special-orders/special-orders.routes.test.ts`

Expected: Both pass.

**Step 4: Commit**

```bash
git add backend/src/modules/special-orders
git commit -m "refactor(special-orders): split routes schemas and service"
```

---

### Task 6: Refactor Reports Module

**Files:**
- Create: `backend/src/modules/reports/reports.schema.ts`
- Create: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/src/modules/reports/reports.routes.ts`
- Test: `backend/src/modules/reports/reports.routes.test.ts`

**Step 1: Strengthen report tests**

Add coverage for:
- non-member report submission returns `403 NOT_MEMBER`
- missing project returns `404 NOT_FOUND`
- archive rejects unauthorized users
- report submission can transition project to Pending Closure when both closure reports exist

Run: `pnpm exec vitest run src/modules/reports/reports.routes.test.ts`

Expected: Tests pass against existing behavior before extraction.

**Step 2: Extract report schemas**

Move and export:
- `ReportSchema`
- `ReportListSchema`
- `CreateReportSchema`
- `ReportStatsSchema`
- `ParamId`
- pagination query

**Step 3: Extract report service functions**

Create service functions for:
- `listReports(user, query)`
- `getReportStats(user)`
- `createReport(user, body, ipAddress)`
- `archiveReport(user, id, ipAddress)`

Move role scoping, membership checks, sequential schedule checks, reporting-date completion, project status transitions, audit diffs, audit writes, notifications, and response enrichment into the service.

**Step 4: Verify reports**

Run: `pnpm typecheck`

Run: `pnpm exec vitest run src/modules/reports/reports.routes.test.ts`

Expected: Both pass.

**Step 5: Commit**

```bash
git add backend/src/modules/reports
git commit -m "refactor(reports): split routes schemas and service"
```

---

### Task 7: Refactor Members Module

**Files:**
- Create: `backend/src/modules/members/members.schema.ts`
- Create: `backend/src/modules/members/members.service.ts`
- Modify: `backend/src/modules/members/members.routes.ts`
- Test: `backend/src/modules/members/members.routes.test.ts`

**Step 1: Extract member schemas**

Move and export:
- `MemberSchema`
- `MemberListSchema`
- `AddMemberSchema`
- `ProposalParam`
- `MemberParam`
- pagination query

**Step 2: Extract member service functions**

Create service functions for:
- `listMembers(proposalId, query)`
- `addMember(authUser, proposalId, body, ipAddress)`
- `removeMember(authUser, proposalId, memberId, ipAddress)`

Move proposal lookup, project-leader checks, target-user validation, duplicate checks, single-leader enforcement, insert/delete transactions, and audit writes into the service.

**Step 3: Verify members**

Run: `pnpm typecheck`

Run: `pnpm exec vitest run src/modules/members/members.routes.test.ts`

Expected: Both pass.

**Step 4: Commit**

```bash
git add backend/src/modules/members
git commit -m "refactor(members): split routes schemas and service"
```

---

### Task 8: Add Search Route Tests

**Files:**
- Create: `backend/src/modules/search/search.routes.test.ts`
- Read: `backend/src/modules/search/search.routes.ts`
- Read: `backend/test/helpers.ts`

**Step 1: Add baseline tests**

Cover:
- authenticated search returns combined results for proposals/projects/reports
- Faculty search applies proposal scope
- Director or RET Chair can request MOA results
- Super Admin can request user results
- search term with only symbols returns `400 BAD_REQUEST`

**Step 2: Verify search tests**

Run: `pnpm exec vitest run src/modules/search/search.routes.test.ts`

Expected: Tests pass against current behavior before extraction.

**Step 3: Commit**

```bash
git add backend/src/modules/search/search.routes.test.ts
git commit -m "test(search): cover existing search routes"
```

---

### Task 9: Refactor Search Module

**Files:**
- Create: `backend/src/modules/search/search.schema.ts`
- Create: `backend/src/modules/search/search.service.ts`
- Modify: `backend/src/modules/search/search.routes.ts`
- Test: `backend/src/modules/search/search.routes.test.ts`

**Step 1: Extract search schemas and types**

Move and export:
- `SEARCH_TYPE`
- `SearchQuerySchema`
- `SearchResultItemSchema`
- `SearchResponseSchema`
- `SearchKind`
- `SearchResultItem`

**Step 2: Extract search service functions**

Create service functions for:
- `buildTsQuery(raw: string)`
- `proposalScope(user)`
- `searchEntities(user, query)`

Move full-text query construction, role-based result eligibility, ranking, and multi-query execution into the service.

**Step 3: Verify search**

Run: `pnpm typecheck`

Run: `pnpm exec vitest run src/modules/search/search.routes.test.ts`

Expected: Both pass.

**Step 4: Commit**

```bash
git add backend/src/modules/search
git commit -m "refactor(search): split routes schemas and service"
```

---

### Task 10: Add Notifications Route Tests

**Files:**
- Create: `backend/src/modules/notifications/notifications.routes.test.ts`
- Read: `backend/src/modules/notifications/notifications.routes.ts`

**Step 1: Add baseline tests**

Cover:
- `GET /notifications` returns formatted dates.
- `GET /notifications/unread-count` returns count.
- `PATCH /notifications/{id}/read` returns `404` when no row updates.
- `PATCH /notifications/{id}/read` returns `{ ok: true }` when updated.
- `POST /notifications/read-all` returns `{ ok: true }`.

**Step 2: Verify notifications tests**

Run: `pnpm exec vitest run src/modules/notifications/notifications.routes.test.ts`

Expected: Tests pass against current behavior before extraction.

**Step 3: Commit**

```bash
git add backend/src/modules/notifications/notifications.routes.test.ts
git commit -m "test(notifications): cover existing notification routes"
```

---

### Task 11: Refactor Notifications Module

**Files:**
- Create: `backend/src/modules/notifications/notifications.schema.ts`
- Create: `backend/src/modules/notifications/notifications.service.ts`
- Modify: `backend/src/modules/notifications/notifications.routes.ts`
- Test: `backend/src/modules/notifications/notifications.routes.test.ts`

**Step 1: Extract notification schemas**

Move and export:
- `NotificationSchema`
- unread count response schema
- mark-read params schema
- ok response schema

**Step 2: Extract notification service functions**

Create service functions for:
- `listNotifications(userId: string)`
- `getUnreadNotificationCount(userId: string)`
- `markNotificationRead(userId: string, id: string)`
- `markAllNotificationsRead(userId: string)`

Move all notification DB queries and date formatting into the service.

**Step 3: Verify notifications**

Run: `pnpm typecheck`

Run: `pnpm exec vitest run src/modules/notifications/notifications.routes.test.ts`

Expected: Both pass.

**Step 4: Commit**

```bash
git add backend/src/modules/notifications
git commit -m "refactor(notifications): split routes schemas and service"
```

---

### Task 12: Refactor Settings Module

**Files:**
- Create: `backend/src/modules/settings/settings.schema.ts`
- Create: `backend/src/modules/settings/settings.service.ts`
- Modify: `backend/src/modules/settings/settings.routes.ts`
- Test: `backend/src/modules/settings/settings.routes.test.ts`

**Step 1: Extract settings schemas**

Move and export:
- `SettingSchema`
- `SettingListSchema`
- `UpsertSettingSchema`
- pagination query

**Step 2: Extract settings service functions**

Create service functions for:
- `listSettings(query)`
- `upsertSetting(user, body, ipAddress)`

Move settings cache reads/writes, DB upsert, Super Admin check, audit write, and cache clearing into the service.

**Step 3: Verify settings**

Run: `pnpm typecheck`

Run: `pnpm exec vitest run src/modules/settings/settings.routes.test.ts`

Expected: Both pass.

**Step 4: Commit**

```bash
git add backend/src/modules/settings
git commit -m "refactor(settings): split routes schemas and service"
```

---

### Task 13: Refactor Audit Module

**Files:**
- Create: `backend/src/modules/audit/audit.schema.ts`
- Create: `backend/src/modules/audit/audit.service.ts`
- Modify: `backend/src/modules/audit/audit.routes.ts`
- Test: `backend/src/modules/audit/audit.routes.test.ts`

**Step 1: Strengthen audit tests**

Add coverage for:
- `GET /audit-logs/stats` response shape.
- search query filters list results.
- UUID label replacement in audit action text.

Run: `pnpm exec vitest run src/modules/audit/audit.routes.test.ts`

Expected: Tests pass against current behavior before extraction.

**Step 2: Extract audit schemas**

Move and export:
- `AuditLogSchema`
- `AuditLogListSchema`
- `AuditStatsSchema`
- pagination/search query schema

**Step 3: Extract audit service functions**

Create service functions for:
- `getAuditStats()`
- `listAuditLogs(user, query, ipAddress)`

Move stats queries, viewed-audit audit write, filtered list query, UUID extraction, UUID label lookup, and action formatting into the service.

**Step 4: Verify audit**

Run: `pnpm typecheck`

Run: `pnpm exec vitest run src/modules/audit/audit.routes.test.ts`

Expected: Both pass.

**Step 5: Commit**

```bash
git add backend/src/modules/audit
git commit -m "refactor(audit): split routes schemas and service"
```

---

### Task 14: Add Barrels and Standardize App Imports

**Files:**
- Create: `backend/src/modules/auth/index.ts`
- Create: `backend/src/modules/admin/index.ts`
- Create: `backend/src/modules/audit/index.ts`
- Create: `backend/src/modules/members/index.ts`
- Create: `backend/src/modules/notifications/index.ts`
- Create: `backend/src/modules/reports/index.ts`
- Create: `backend/src/modules/search/index.ts`
- Create: `backend/src/modules/settings/index.ts`
- Create: `backend/src/modules/special-orders/index.ts`
- Create: `backend/src/modules/storage/index.ts`
- Modify: `backend/src/app.ts`

**Step 1: Add barrel files**

Each `index.ts` should be exactly:

```ts
import app from "./<module>.routes.js";
export default app;
```

**Step 2: Update app imports**

Change `backend/src/app.ts` imports for these modules from direct `.routes.js` imports to `./modules/<module>/index.js`.

Do not change route mount order.

**Step 3: Verify app wiring**

Run: `pnpm typecheck`

Run: `pnpm exec vitest run src/app.test.ts`

Expected: Both pass.

**Step 4: Commit**

```bash
git add backend/src/app.ts backend/src/modules/*/index.ts
git commit -m "refactor(modules): add barrels for small modules"
```

---

### Task 15: Final Verification

**Files:**
- No planned source edits unless verification fails.

**Step 1: Run typecheck**

Run: `pnpm typecheck`

Expected: No errors.

**Step 2: Run all tests**

Run: `pnpm test`

Expected: All tests pass.

**Step 3: Run build**

Run: `pnpm build`

Expected: Build completes successfully.

**Step 4: Commit final fixes if needed**

Only if Step 1-3 required fixes:

```bash
git add backend/src backend/test
git commit -m "fix: stabilize small module refactor"
```

## Rollback Plan

Each task should be committed independently. If a task introduces failures that cannot be fixed quickly:

```bash
git revert --no-edit HEAD
```

Then re-run:

```bash
pnpm typecheck
pnpm test
```
