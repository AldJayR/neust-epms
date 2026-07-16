# Backend Security Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the confirmed backend access-control, workflow-integrity, authentication, availability, file-handling, and operational-security weaknesses identified in the July 2026 audit, while making the Supabase deployment deny direct unauthorized data access.

**Architecture:** Make authorization action-specific rather than treating campus/department visibility as write authority. Centralize active-record checks and state transitions, use compare-and-swap database updates for one-time file submission, and separate durable business mutations from best-effort notifications. Keep application authorization in Hono/Drizzle but enforce a database/Supabase deny-by-default backstop for direct API access.

**Tech Stack:** TypeScript, Hono, Zod, Vitest, Drizzle ORM/PostgreSQL, Supabase Auth/Storage, node-cron, Resend, pnpm.

---

## Execution Rules

- Work in a dedicated worktree. Do not restore or include unrelated deleted files already present in the current working tree.
- Do not inspect, print, commit, or add `backend/.env` or any credential file.
- Use `pnpm --filter backend ...` from the repository root. Never use a dependency install that rewrites the lockfile until Task 17 explicitly addresses it.
- Add regression tests before each production change. Run the focused test after every task and the full backend suite after each phase.
- Treat the Supabase verification in Task 1 as a release blocker. Do not claim direct Data API protection from source review alone.
- Keep public API changes intentional and update OpenAPI schemas and frontend callers in the same pull request where response contracts change.

## Risk-to-Task Map

| Risk | Tasks |
|---|---|
| Direct Supabase Data API bypass | 1 |
| Scope-only document access and upload | 2, 3 |
| Project readiness/schedule BOLA | 2, 4 |
| Stale leader/MOA/account authorization | 2, 5, 6 |
| Report upload race and post-commit deletion | 7 |
| Broken project close lifecycle | 8 |
| MOA renewal confused deputy | 9 |
| Weak Director provisioning/session lifecycle | 10, 11 |
| PII directory exposure | 12 |
| Resource exhaustion/body limits | 13 |
| File ingestion, orphan objects, retention | 14, 15 |
| Cron duplication and notification reliability | 16 |
| Supply chain, production configuration, observability | 17, 18 |

## Phase 0: Release Gate and Security Baseline

### Task 1: Verify and enforce Supabase data-access boundaries

**Files:**
- Create: `backend/drizzle/000x_enable_rls_and_revoke_direct_api_access.sql`
- Create: `backend/docs/security/supabase-access-verification.md`
- Modify: `backend/.env.example`
- Test: Supabase staging SQL verification, documented in `backend/docs/security/supabase-access-verification.md`

**Step 1: Record the current production/staging posture without exposing secrets**

Run the following only through an approved privileged PostgreSQL/Supabase SQL console against a non-production clone first:

```sql
SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;
```

Expected before remediation: this may show disabled RLS and/or direct grants. Record only table names, RLS state, and grant types, never connection strings or keys.

**Step 2: Write the failing security verification checklist**

Create `backend/docs/security/supabase-access-verification.md` with these pass criteria:

- `anon` and `authenticated` cannot select, insert, update, or delete backend-owned application tables directly.
- All application tables have RLS enabled and forced, or reside in a schema not exposed through the Data API.
- The `documents` bucket denies unauthenticated and user-supplied direct object reads/writes except deliberately public avatar access.
- The backend service role continues to access required tables and Storage operations.
- A test JWT and anon key receive `42501`, an RLS denial, or an equivalent denied response for every backend-owned table.

**Step 3: Add a deny-by-default migration**

Create a migration that, for every backend-owned application table:

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
```

Repeat for all application tables. Do not add permissive policies. The Hono backend uses a server-side database credential and Supabase service role; document exactly which database role is exempt from RLS and ensure it is not exposed to browser clients.

If Supabase SQL tooling requires a privileged owner to retain maintenance access, grant only that role explicitly. Do not use `GRANT ALL TO PUBLIC`.

**Step 4: Add Storage policy verification and configuration documentation**

Document the required bucket settings:

- `documents` is private.
- `avatars` is public only if public avatars are a product requirement.
- No browser client receives the service-role key.
- Signed URLs are generated only by the backend after authorization.

Add `TRUST_PROXY=false` with an explanatory comment to `.env.example`; do not set it to true by default.

**Step 5: Apply and test in staging**

Run the generated migration using the controlled deployment migration process:

```bash
pnpm --filter backend db:migrate
```

Expected: migration succeeds; backend smoke endpoints still work; direct Data API calls as `anon` and `authenticated` are denied.

**Step 6: Commit**

```bash
git add backend/drizzle backend/docs/security/supabase-access-verification.md backend/.env.example
```

### Task 2: Create shared action authorization and active-state helpers

**Files:**
- Create: `backend/src/lib/proposal-policy.ts`
- Create: `backend/src/lib/project-policy.ts`
- Modify: `backend/src/lib/scope-helpers.ts`
- Modify: `backend/src/services/auth-user.service.ts`
- Test: `backend/src/lib/proposal-policy.test.ts`
- Test: `backend/src/lib/project-policy.test.ts`

**Step 1: Write failing authorization matrix tests**

Cover these cases in table-driven tests using mocked Drizzle query results or pure predicates where possible:

- Faculty may view only a proposal they actively belong to unless an explicit portfolio role policy grants access.
- Project Leader may upload a proposal document only while their membership is active and proposal status is `Draft` or `Returned`.
- Director and Super Admin may perform portfolio actions without membership where product policy permits.
- RET Chair read access is limited to the documented campus/department portfolio; it does not imply document-write authority.
- An archived proposal, archived membership, archived MOA, or non-active user never passes an active-resource predicate.

**Step 2: Run the focused tests to establish failure**

Run:

```bash
pnpm --filter backend test -- proposal-policy project-policy
```

Expected: FAIL because the policy modules do not yet exist.

**Step 3: Implement narrow, action-specific helpers**

Create `proposal-policy.ts` with functions such as:

```ts
export async function assertCanViewProposal(user: AuthUser, proposalId: string): Promise<ProposalAccess>
export async function assertCanManageProposalDocuments(user: AuthUser, proposalId: string): Promise<ProposalAccess>
export async function assertCanManageProposal(user: AuthUser, proposalId: string): Promise<ProposalAccess>
```

Each function must load the proposal with `archivedAt IS NULL`, load active membership when needed, and make the role/action decision in one location. Do not return a boolean that callers can forget to check; throw `ApiError(403, ...)` on denial.

Create `project-policy.ts` with an `assertCanViewProject(user, projectOrProposalId)` helper that resolves the project and binds it to the proposal policy.

Keep `scope-helpers.ts` for building portfolio query predicates. Do not use it as a substitute for object-level authorization.

**Step 4: Run focused tests**

Run:

```bash
pnpm --filter backend test -- proposal-policy project-policy
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/lib/proposal-policy.ts backend/src/lib/project-policy.ts backend/src/lib/scope-helpers.ts backend/src/services/auth-user.service.ts backend/src/lib/proposal-policy.test.ts backend/src/lib/project-policy.test.ts
```

## Phase 1: Access Control and Workflow Integrity

### Task 3: Enforce proposal document read/write policy

**Files:**
- Modify: `backend/src/modules/storage/storage.service.ts:20-241`
- Modify: `backend/src/modules/storage/storage.routes.ts:78-221`
- Modify: `backend/src/modules/projects/projects.service.ts:259-505`
- Test: `backend/src/modules/storage/storage.routes.test.ts`
- Test: `backend/src/modules/projects/projects.routes.test.ts`

**Step 1: Write failing regression tests**

Add tests proving:

- A same-department, non-member Faculty user receives 403 for document list, signed URL, upload, project detail attachment URLs, and comments where product policy requires membership.
- An active Project Leader can upload only to `Draft` and `Returned` proposals.
- A Project Leader receives 403 when the proposal is pending review, endorsed, approved, rejected, or archived.
- Director/Super Admin behavior matches the documented policy.
- No signed URL is requested from Supabase when authorization fails.

**Step 2: Run focused tests to verify failure**

Run:

```bash
pnpm --filter backend test -- storage.routes projects.routes
```

Expected: FAIL because current access is department/campus-only.

**Step 3: Replace scope-only checks**

Replace `canAccessProposalDocuments()` and `ensureUploadProposalDocumentAccess()` with the Task 2 policy functions. Re-authorize inside `uploadProposalDocument()` immediately before assigning a version and inserting metadata, so route-level checks cannot become stale.

In project detail responses, return document metadata only. Do not create a signed URL for every attachment in `getProjectDetails()`. Keep explicit, authorization-checked document URL issuance in `getDocumentSignedUrl()`.

**Step 4: Run focused tests**

Run:

```bash
pnpm --filter backend test -- storage.routes projects.routes
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/storage/storage.service.ts backend/src/modules/storage/storage.routes.ts backend/src/modules/projects/projects.service.ts backend/src/modules/storage/storage.routes.test.ts backend/src/modules/projects/projects.routes.test.ts
```

### Task 4: Authorize readiness and reporting schedule resources

**Files:**
- Modify: `backend/src/modules/projects/reporting.routes.ts:40-71`
- Modify: `backend/src/modules/projects/projects.service.ts:911-1176`
- Modify: `backend/src/modules/projects/projects.schema.ts`
- Test: `backend/src/modules/projects/projects.routes.test.ts`

**Step 1: Write failing BOLA tests**

Test a Faculty user against a project in another department/campus and an unrelated project in the same department. Both `GET /projects/{id}/readiness` and `GET /projects/{id}/reporting-schedule` must return 403 or the product’s consistent non-disclosing 404.

Test that an allowed project member receives only schedule data required by the UI, without `storagePath`.

**Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter backend test -- projects.routes
```

Expected: FAIL because route handlers do not pass `c.get("user")` to the services.

**Step 3: Bind route handlers to project policy**

Pass the authenticated user to both services and call `assertCanViewProject()` before reading project, milestone, report, or storage data. Remove `storagePath` from reporting schedule response schemas and serializers.

**Step 4: Run focused tests**

Run:

```bash
pnpm --filter backend test -- projects.routes
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/projects/reporting.routes.ts backend/src/modules/projects/projects.service.ts backend/src/modules/projects/projects.schema.ts backend/src/modules/projects/projects.routes.test.ts
```

### Task 5: Repair stale authorization and lifecycle predicates

**Files:**
- Modify: `backend/src/modules/special-orders/special-orders.service.ts:238-333`
- Modify: `backend/src/modules/projects/projects.service.ts:510-545`
- Modify: `backend/src/modules/projects/projects.service.ts:760-907`
- Modify: `backend/src/modules/admin/admin.service.ts:108-250`
- Modify: `backend/src/middleware/auth.ts:62-100`
- Modify: `backend/src/db/schema/users.ts`
- Create: `backend/drizzle/000x_add_user_account_state.sql`
- Test: `backend/src/modules/special-orders/special-orders.routes.test.ts`
- Test: `backend/src/modules/projects/projects.routes.test.ts`
- Test: `backend/src/modules/admin/admin.routes.test.ts`
- Test: `backend/src/middleware/auth.test.ts`

**Step 1: Write failing regression tests**

Add tests for:

- A former/archived Project Leader cannot get another member’s Special Order URL.
- An archived MOA cannot activate a project or satisfy an `Ongoing` transition.
- A rejected account cannot be bulk-approved or bulk-reactivated.
- A rejected or archived account is denied by authentication even if `isActive` is accidentally true.

**Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter backend test -- special-orders.routes projects.routes admin.routes auth
```

Expected: FAIL against current predicates.

**Step 3: Introduce an explicit account-state model**

Add a `userAccountState` enum/string field with values:

```ts
"pending_verification" | "pending_approval" | "active" | "suspended" | "rejected" | "archived"
```

Backfill current active accounts to `active`, inactive non-archived accounts to `pending_approval`, and archived accounts to `rejected` or `archived` according to existing administrative meaning. Update middleware to accept only `active`.

Require bulk approval to update only `pending_approval`; require status operations to target allowed source states. Preserve a deliberate, audited restore endpoint if policy needs one.

**Step 4: Apply active predicates consistently**

- Add `isNull(proposalMembers.archivedAt)` to every Project Leader lookup.
- Add `isNull(moas.archivedAt)` plus valid date-range checks to activation and transition queries.
- Centralize these checks in the Task 2 policy helpers where possible.

**Step 5: Run focused tests**

Run:

```bash
pnpm --filter backend test -- special-orders.routes projects.routes admin.routes auth
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/src/modules/special-orders/special-orders.service.ts backend/src/modules/projects/projects.service.ts backend/src/modules/admin/admin.service.ts backend/src/middleware/auth.ts backend/src/db/schema/users.ts backend/drizzle backend/src/modules/special-orders/special-orders.routes.test.ts backend/src/modules/projects/projects.routes.test.ts backend/src/modules/admin/admin.routes.test.ts backend/src/middleware/auth.test.ts
```

### Task 6: Validate proposal membership creation and leader cardinality

**Files:**
- Modify: `backend/src/modules/proposals/proposals.schema.ts:51-75`
- Modify: `backend/src/modules/proposals/proposals.service.ts:54-182`
- Modify: `backend/src/modules/proposals/crud.routes.ts:405-462`
- Modify: `backend/src/db/schema/proposal-members.ts`
- Create: `backend/drizzle/000x_enforce_single_active_project_leader.sql`
- Test: `backend/src/modules/proposals/proposals.routes.test.ts`

**Step 1: Write failing tests**

Cover proposal creation with:

- More than one `Project Leader`.
- A member from another campus/department where policy disallows it.
- An inactive, rejected, or archived user ID.
- Duplicate member IDs.
- A creator omitted from members.

**Step 2: Run the focused suite**

Run:

```bash
pnpm --filter backend test -- proposals.routes
```

Expected: FAIL because creation currently maps client-controlled role strings directly.

**Step 3: Restrict and validate server-side membership**

Replace free-form `projectRole` with a Zod enum. Make the creator the sole initial Project Leader; accept only collaborator roles for supplied members unless an explicit transfer flow is designed. Validate each user is active, non-archived, and organizationally eligible before insert.

Add a partial unique PostgreSQL index enforcing one active `Project Leader` per proposal. Include a data-cleanup migration or fail migration explicitly if historical duplicates exist.

**Step 4: Run focused tests**

Run:

```bash
pnpm --filter backend test -- proposals.routes
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/proposals/proposals.schema.ts backend/src/modules/proposals/proposals.service.ts backend/src/modules/proposals/crud.routes.ts backend/src/db/schema/proposal-members.ts backend/drizzle backend/src/modules/proposals/proposals.routes.test.ts
```

### Task 7: Make report document submission atomic and idempotent

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts:307-506`
- Modify: `backend/src/modules/reports/reports.routes.ts:96-131`
- Modify: `backend/src/db/schema/project-reports.ts`
- Create: `backend/drizzle/000x_add_report_upload_state.sql`
- Test: `backend/src/modules/reports/reports.routes.test.ts`

**Step 1: Write failing race and failure-injection tests**

Add tests that run two concurrent valid upload requests for one report and assert:

- Exactly one request returns success.
- The losing request returns `409 ALREADY_SUBMITTED` or an idempotent success for the same key.
- Exactly one object remains referenced.
- The losing uploaded object is deleted.
- Audit events, milestone completion, project transition, and notifications happen once.

Add a test that forces notification or post-submit processing to fail after the database row is committed and assert the referenced object is not deleted.

**Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter backend test -- reports.routes
```

Expected: FAIL because the current update uses only `report_id` and cleanup deletes after committed work.

**Step 3: Add an explicit upload claim**

Add report upload state or use a row lock/compare-and-swap sequence:

1. Atomically claim a report only when it has no `storagePath` and is in `pending` state.
2. Upload the object after claim, using a generated immutable path.
3. Commit `storagePath`, hash, uploader, and `available` state in one transaction.
4. If any operation before the commit fails, release the claim and delete only the new object.
5. If post-commit notification fails, leave the object and report intact; create a durable outbox event for retry.

Validate the path parameter with the shared UUID `ParamId` schema.

**Step 4: Make side effects idempotent**

Use conditional milestone/project updates and an outbox/event key so duplicate requests cannot create duplicate notifications. Do not issue email directly inside the request’s critical path.

**Step 5: Run focused tests**

Run:

```bash
pnpm --filter backend test -- reports.routes
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/src/modules/reports/reports.service.ts backend/src/modules/reports/reports.routes.ts backend/src/db/schema/project-reports.ts backend/drizzle backend/src/modules/reports/reports.routes.test.ts
```

### Task 8: Centralize project transition rules

**Files:**
- Create: `backend/src/modules/projects/project-state-machine.ts`
- Modify: `backend/src/modules/projects/projects.service.ts:508-710`
- Modify: `backend/src/modules/reports/reports.service.ts:407-473`
- Modify: `backend/src/modules/projects/projects.schema.ts:149-151`
- Modify: `backend/src/modules/projects/status.routes.ts:19-88`
- Test: `backend/src/modules/projects/project-state-machine.test.ts`
- Test: `backend/src/modules/projects/projects.routes.test.ts`

**Step 1: Write failing transition-table tests**

Test every supported transition explicitly:

- `Approved -> Ongoing` requires an active MOA.
- `Ongoing -> Pending Closure` occurs only after both required report files are available.
- `Pending Closure -> Closed` requires both required reports.
- Generic transition cannot set `Completed` directly.
- Archived or expired MOAs cannot satisfy activation.
- Concurrent transition attempts return a deterministic conflict rather than overwriting state.

**Step 2: Run the tests to verify failure**

Run:

```bash
pnpm --filter backend test -- project-state-machine projects.routes
```

Expected: FAIL because state rules are split between project and report services.

**Step 3: Implement one transition authority**

Move transition validation and updates to `project-state-machine.ts`. Expose explicit functions, for example:

```ts
transitionToOngoing(...)
markPendingClosureIfComplete(...)
closePendingProject(...)
```

Use a conditional `WHERE project_id = ? AND project_status = ?` update and throw a 409 when no row changes. Remove `Completed` from the generic request schema unless there is a separately documented, report-validated business path.

**Step 4: Update API documentation and response tests**

Update OpenAPI route summaries and error responses so the API accurately describes the legal state transitions.

**Step 5: Run focused tests**

Run:

```bash
pnpm --filter backend test -- project-state-machine projects.routes reports.routes
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/src/modules/projects/project-state-machine.ts backend/src/modules/projects/projects.service.ts backend/src/modules/reports/reports.service.ts backend/src/modules/projects/projects.schema.ts backend/src/modules/projects/status.routes.ts backend/src/modules/projects/project-state-machine.test.ts backend/src/modules/projects/projects.routes.test.ts
```

### Task 9: Restrict MOA renewal synchronization

**Files:**
- Modify: `backend/src/modules/moas/moas.service.ts:32-118`
- Modify: `backend/src/modules/moas/moas.service.ts:301-479`
- Modify: `backend/src/modules/moas/moas.routes.ts`
- Test: `backend/src/modules/moas/moas.routes.test.ts`

**Step 1: Write failing authorization and workflow tests**

Test that:

- RET Chair upload cannot rebind a project outside the Chair’s allowed portfolio.
- A new MOA upload does not silently migrate all partner projects.
- An explicitly authorized Director renewal can preview selected projects, then apply only selected authorized IDs.
- Expired project restoration occurs only through the state machine and is audited.

**Step 2: Run focused tests to verify failure**

Run:

```bash
pnpm --filter backend test -- moas.routes
```

Expected: FAIL because `syncProjectsToNewMoa()` globally selects by partner ID.

**Step 3: Replace implicit global synchronization**

Remove automatic cross-project synchronization from upload. Add a Director-only renewal action that accepts explicit `projectIds`, uses project policy checks, shows a preview before execution, and updates all selected projects in a transaction through the state machine.

If RET Chairs must upload MOAs, allow upload only; require Director approval before linking or migrating any project.

**Step 4: Run focused tests**

Run:

```bash
pnpm --filter backend test -- moas.routes projects.routes
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/moas/moas.service.ts backend/src/modules/moas/moas.routes.ts backend/src/modules/moas/moas.routes.test.ts
```

## Phase 2: Identity, Privacy, and Abuse Resistance

### Task 10: Replace temporary passwords with invitation-based Director provisioning

**Files:**
- Modify: `backend/src/modules/admin/admin.service.ts:253-383`
- Modify: `backend/src/modules/admin/admin.schema.ts:82-96`
- Modify: `backend/src/modules/admin/admin.routes.ts`
- Modify: `backend/src/modules/auth/auth.service.ts:49-81`
- Test: `backend/src/modules/admin/admin.routes.test.ts`
- Test: `backend/src/modules/auth/auth.routes.test.ts`

**Step 1: Write failing tests**

Assert that Director provisioning:

- Never returns a plaintext password.
- Uses a one-time invitation/setup mechanism.
- Creates a non-active or credential-setup-required account until password setup succeeds.
- Records an audit event without email/password secrets in free-form text.
- Rejects privileged use before setup completion.

**Step 2: Run focused tests to verify failure**

Run:

```bash
pnpm --filter backend test -- admin.routes auth.routes
```

Expected: FAIL because the current response includes `temporaryPassword`.

**Step 3: Implement a secure setup flow**

Use Supabase’s supported invite/recovery mechanism rather than generating a password. Return only an opaque provisioning result, never the setup token. Store account state as `pending_verification` or `pending_approval` until the identity provider confirms setup and an authorized administrator activates it.

Update the password-change flow to revoke other sessions after success, subject to confirmed Supabase API semantics. Explicitly inspect and handle the result of logout/session revocation operations.

**Step 4: Add privileged-session requirements**

Before enabling privileged administrative mutations, document and implement Supabase MFA/AAL2 or recent-authentication verification. Add one middleware helper and apply it to provisioning, role changes, bulk activation, and account rejection/restoration.

**Step 5: Run focused tests**

Run:

```bash
pnpm --filter backend test -- admin.routes auth.routes auth
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/src/modules/admin/admin.service.ts backend/src/modules/admin/admin.schema.ts backend/src/modules/admin/admin.routes.ts backend/src/modules/auth/auth.service.ts backend/src/modules/admin/admin.routes.test.ts backend/src/modules/auth/auth.routes.test.ts
```

### Task 11: Harden registration, login throttling, and session invalidation

**Files:**
- Modify: `backend/src/modules/auth/auth.schema.ts:25-67`
- Modify: `backend/src/modules/auth/auth.service.ts:119-239`
- Modify: `backend/src/modules/auth/auth.routes.ts:60-286`
- Modify: `backend/src/lib/client-ip.ts`
- Modify: `backend/src/app.ts:56-65`
- Test: `backend/src/modules/auth/auth.routes.test.ts`
- Test: `backend/src/middleware/auth.test.ts`

**Step 1: Write failing tests**

Add tests for:

- Registration sends/uses email verification rather than `email_confirm: true`.
- Registration returns generic duplicate-account messaging.
- Passwords require a minimum length appropriate to the MFA policy, accept up to at least 64 characters, and have a safe maximum.
- Login throttling keys on normalized account identifier plus IP, not only IP.
- Deactivation, rejection, password change, and role change invalidate active sessions as configured.

**Step 2: Run focused tests to verify failure**

Run:

```bash
pnpm --filter backend test -- auth.routes auth
```

Expected: FAIL for forced email confirmation, short password policy, and absent session lifecycle coverage.

**Step 3: Implement safe identity handling**

- Remove forced email confirmation from self-registration.
- Set a state requiring verified email and approval before authentication.
- Normalize emails consistently before lookup and rate-limit key generation.
- Set password maximums to protect the HIBP/hash path and document the selected minimum/maximum.
- Replace IP-only limits with a shared distributed limiter before deploying multiple replicas. If no shared store is available yet, place an edge/WAF account-based control in front and document it as a release dependency.

**Step 4: Harden proxy IP handling**

Do not use a boolean alone as the trust decision in production. Require known proxy CIDRs/hop count at the infrastructure layer, ensure proxies strip client-supplied forwarding headers, and reject/canonicalize invalid header values before using them as limiter/audit keys.

**Step 5: Run focused tests**

Run:

```bash
pnpm --filter backend test -- auth.routes auth
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/src/modules/auth/auth.schema.ts backend/src/modules/auth/auth.service.ts backend/src/modules/auth/auth.routes.ts backend/src/lib/client-ip.ts backend/src/app.ts backend/src/modules/auth/auth.routes.test.ts backend/src/middleware/auth.test.ts
```

### Task 12: Minimize directory and settings disclosure

**Files:**
- Modify: `backend/src/modules/auth/auth.schema.ts:85-96`
- Modify: `backend/src/modules/auth/auth.service.ts:266-282`
- Modify: `backend/src/modules/auth/auth.routes.ts:182-215`
- Modify: `backend/src/modules/settings/settings.routes.ts`
- Modify: `backend/src/modules/settings/settings.service.ts`
- Modify: `backend/src/modules/settings/settings.schema.ts`
- Test: `backend/src/modules/auth/auth.routes.test.ts`
- Test: `backend/src/modules/settings/settings.routes.test.ts`

**Step 1: Write failing disclosure tests**

Test that ordinary users cannot retrieve inactive, rejected, or archived accounts; cannot search outside permitted organizational scope; and do not receive email addresses unless the caller has an explicit membership-management need.

Test that arbitrary system setting values cannot be returned to ordinary authenticated users and cannot be created under unrecognized keys.

**Step 2: Run focused tests to verify failure**

Run:

```bash
pnpm --filter backend test -- auth.routes settings.routes
```

Expected: FAIL because the current query has no account-state/scope filters and settings are generic.

**Step 3: Implement a minimum-data directory contract**

Require a minimum prefix length, escape `%` and `_` for literal matching, filter `active`/non-archived users, scope users to the requester’s allowed team pool, and return `{ userId, displayName }` by default. Create a separate privileged endpoint only if email is operationally required.

**Step 4: Use typed, allowlisted settings**

Define supported setting keys and validators. Keep secrets out of `system_settings`; restrict sensitive setting read/write to Super Admin. Return a separate allowlisted public projection only if the UI needs specific values.

**Step 5: Run focused tests and commit**

Run:

```bash
pnpm --filter backend test -- auth.routes settings.routes
```

Expected: PASS.

```bash
git add backend/src/modules/auth/auth.schema.ts backend/src/modules/auth/auth.service.ts backend/src/modules/auth/auth.routes.ts backend/src/modules/settings backend/src/modules/auth/auth.routes.test.ts backend/src/modules/settings/settings.routes.test.ts
```

### Task 13: Enforce actual resource limits and cancellation boundaries

**Files:**
- Modify: `backend/src/app.ts:56-151`
- Modify: `backend/src/env.ts`
- Modify: `backend/src/modules/auth/auth.schema.ts`
- Modify: `backend/src/modules/proposals/proposals.schema.ts`
- Modify: `backend/src/modules/admin/admin.schema.ts`
- Modify: `backend/src/modules/reports/reports.schema.ts`
- Modify: `backend/src/modules/moas/moas.service.ts:319-365`
- Modify: `backend/src/modules/special-orders/special-orders.routes.ts`
- Test: `backend/src/app.test.ts`
- Test: relevant route schema tests

**Step 1: Write failing resource tests**

Add adapter-level tests for:

- Chunked/non-multipart bodies exceeding 1 MB without `Content-Length`.
- Declared-small bodies that exceed the actual limit.
- Oversized password, query, comment, filename, SO number, partner name, and review remark inputs.
- Excessive arrays for members, sector IDs/names, departments, SDGs, and bulk admin actions.
- Invalid/oversized forwarding headers.

**Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter backend test -- app auth.schema projects.schema reports
```

Expected: FAIL because current enforcement trusts `Content-Length` and many schemas are unbounded.

**Step 3: Enforce limits while consuming bytes**

Use Node/Hono middleware that counts received bytes from the actual request stream and aborts/rejects once the configured limit is exceeded. Do not rely only on `Content-Length`. Configure Node request headers, request, keep-alive, and connection timeouts from validated environment values.

Pass an abort/deadline signal to every API that supports it. Where a dependency cannot be cancelled, ensure timeout response does not invoke destructive compensation or duplicate processing.

**Step 4: Bound all API schemas**

Match Zod `.max()` and array `.max()` values to storage/database/business limits. Deduplicate arrays before query/insert work. Validate multipart metadata with Zod rather than manual nonempty checks.

**Step 5: Run focused tests and commit**

Run:

```bash
pnpm --filter backend test -- app auth.schema projects.schema reports
```

Expected: PASS.

```bash
git add backend/src/app.ts backend/src/env.ts backend/src/modules/auth/auth.schema.ts backend/src/modules/proposals/proposals.schema.ts backend/src/modules/admin/admin.schema.ts backend/src/modules/reports/reports.schema.ts backend/src/modules/moas/moas.service.ts backend/src/modules/special-orders/special-orders.routes.ts backend/src/app.test.ts
```

## Phase 3: Files, Retention, and Operational Reliability

### Task 14: Build a safe file-ingestion and signed-URL lifecycle

**Files:**
- Modify: `backend/src/services/file.service.ts`
- Modify: `backend/src/modules/storage/storage.service.ts`
- Modify: `backend/src/modules/moas/moas.service.ts`
- Modify: `backend/src/modules/special-orders/special-orders.service.ts`
- Modify: `backend/src/modules/reports/reports.service.ts`
- Create: `backend/src/services/file-scan.service.ts`
- Create: `backend/src/services/file-reconciliation.service.ts`
- Test: `backend/src/modules/storage/storage.routes.test.ts`
- Test: `backend/src/modules/special-orders/special-orders.routes.test.ts`

**Step 1: Write failing file tests**

Use fixture files to prove rejection/quarantine of:

- `%PDF-` plus arbitrary payload.
- Truncated PDFs without valid structure.
- PDFs with JavaScript, launch actions, attachments, remote actions, or encryption when not required.
- Malformed and decompression-bomb image payloads.

Add tests that special-order replacement either versions the old object explicitly or queues it for deletion after durable metadata update.

**Step 2: Run focused tests to verify failure**

Run:

```bash
pnpm --filter backend test -- storage.routes special-orders.routes reports.routes
```

Expected: FAIL because validation accepts five-byte PDF prefixes and replacement leaves previous files unmanaged.

**Step 3: Add quarantine and full-content validation**

Upload to a private quarantine path, validate the full document with a hardened parser/scanner, then promote or copy it to the final immutable path only after a clean result. Reject active PDF features not needed by the product. Decode and re-encode avatars with dimension/pixel limits and stripped metadata.

Do not issue signed URLs for `pending`, failed, or quarantined files. Use attachment disposition and `X-Content-Type-Options: nosniff` at the delivery layer where inline rendering is not required.

**Step 4: Make replacement and cleanup durable**

For Special Orders and every replaceable object, choose one model:

- Version metadata and apply retention to old versions, or
- Atomically update metadata and emit a durable deletion job for the old path.

Never delete a current object until the replacement reference is committed. Add a reconciliation job that detects storage-only objects and database-only paths without deleting legal-hold records.

**Step 5: Run focused tests and commit**

Run:

```bash
pnpm --filter backend test -- storage.routes special-orders.routes reports.routes
```

Expected: PASS.

```bash
git add backend/src/services/file.service.ts backend/src/services/file-scan.service.ts backend/src/services/file-reconciliation.service.ts backend/src/modules/storage/storage.service.ts backend/src/modules/moas/moas.service.ts backend/src/modules/special-orders/special-orders.service.ts backend/src/modules/reports/reports.service.ts backend/src/modules/storage/storage.routes.test.ts backend/src/modules/special-orders/special-orders.routes.test.ts
```

### Task 15: Implement complete privacy retention and audit boundaries

**Files:**
- Modify: `backend/src/cron/privacy-retention.ts`
- Modify: `backend/src/db/schema/proposal-documents.ts`
- Modify: `backend/src/db/schema/proposal-comments.ts`
- Modify: `backend/src/db/schema/notifications.ts`
- Modify: `backend/src/db/schema/audit-logs.ts`
- Modify: `backend/src/lib/audit.ts`
- Create: `backend/src/cron/privacy-retention.test.ts`
- Create: `backend/docs/security/data-retention-schedule.md`

**Step 1: Define retention classes before code**

Write `data-retention-schedule.md` with approved retention durations and legal basis for:

- Proposal/project business records.
- Uploaded documents and old file versions.
- Comments and annotations.
- Membership and beneficiary records.
- Notifications and email delivery data.
- Source IPs and audit records.
- Legal holds and incident-preservation exceptions.

Obtain product/legal approval before selecting deletion periods.

**Step 2: Write failing end-to-end retention tests**

Create a closed project with documents, comments, reviews, members, reports, Special Orders, notifications, and storage references. Verify the retention operation either anonymizes or purges every record class according to the approved schedule and queues object deletion safely.

Include a legal-hold case and partial failure/retry case.

**Step 3: Run tests to verify failure**

Run:

```bash
pnpm --filter backend test -- privacy-retention
```

Expected: FAIL because current code archives only project/proposal/report/Special Order rows.

**Step 4: Implement staged, resumable retention**

Use an explicit retention job/event state. Archive access first, then purge/anonymize dependent rows and Storage objects after the retention grace period. Keep only the minimum legally required audit evidence; never interpolate sensitive free text into `audit_logs.action`.

Make critical business mutation plus audit insertion transactional. Store fixed action codes and structured, allowlisted metadata. Add an append-only/independent audit-storage decision to the documentation rather than falsely claiming current rows are tamper-evident.

**Step 5: Run focused tests and commit**

Run:

```bash
pnpm --filter backend test -- privacy-retention audit
```

Expected: PASS.

```bash
git add backend/src/cron/privacy-retention.ts backend/src/cron/privacy-retention.test.ts backend/src/db/schema backend/src/lib/audit.ts backend/docs/security/data-retention-schedule.md
```

### Task 16: Move cron and email side effects to durable singleton processing

**Files:**
- Create: `backend/src/db/schema/outbox-events.ts`
- Create: `backend/src/services/outbox.service.ts`
- Create: `backend/src/cron/job-lock.service.ts`
- Modify: `backend/src/cron/moa-expiration.ts`
- Modify: `backend/src/cron/report-overdue.ts`
- Modify: `backend/src/cron/privacy-retention.ts`
- Modify: `backend/src/index.ts`
- Modify: `backend/src/lib/notification.helpers.ts`
- Create: `backend/src/cron/cron-idempotency.test.ts`
- Create: `backend/drizzle/000x_add_outbox_and_job_locks.sql`

**Step 1: Write failing multi-worker tests**

Simulate two job runners sharing one test database. Assert each logical MOA expiry and overdue-report event produces:

- One state mutation.
- One in-app notification per recipient/event.
- One email outbox event per recipient/event.
- No duplicate audit entries.

Test a missed scheduler period longer than 48 hours and verify unprocessed expired MOAs are still found.

**Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter backend test -- cron-idempotency
```

Expected: FAIL because every process schedules all jobs and notifications have no idempotency key.

**Step 3: Add singleton job ownership and durable events**

Use PostgreSQL advisory locks or leased job rows. Start schedules only in the dedicated worker role, not every API replica. Create outbox records with a unique business key such as:

```text
eventType:entityId:effectiveDate:recipientId
```

Use a unique database constraint to enforce idempotency. Process outbox rows with bounded concurrency, retry state, provider IDs, exponential backoff, and a dead-letter state.

**Step 4: Correct cron semantics**

- Select all unprocessed expirations rather than a rolling 48-hour query.
- Record when an overdue recipient was notified and only notify again according to an explicit reminder schedule.
- Set an explicit scheduler timezone.
- Replace parallel delayed `Promise.allSettled` email sends with bounded sequential/concurrent queue processing.

**Step 5: Run focused tests and commit**

Run:

```bash
pnpm --filter backend test -- cron-idempotency
```

Expected: PASS.

```bash
git add backend/src/db/schema/outbox-events.ts backend/src/services/outbox.service.ts backend/src/cron backend/src/index.ts backend/src/lib/notification.helpers.ts backend/drizzle
```

## Phase 4: Platform Hardening and Assurance

### Task 17: Repair supply-chain controls and deployment configuration

**Files:**
- Modify: `package.json`
- Modify: `backend/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `pnpm-workspace.yaml`
- Create: `.github/workflows/backend-security.yml`
- Create: `backend/docs/security/deployment-checklist.md`

**Step 1: Write CI checks before changing versions**

Create a CI workflow that runs:

```bash
pnpm install --frozen-lockfile
pnpm --filter backend typecheck
pnpm --filter backend test
pnpm audit --prod
```

Generate an SPDX or CycloneDX SBOM and retain it as a build artifact. Configure dependency update/advisory review as a separate required workflow.

**Step 2: Regenerate one canonical lockfile**

Choose one pnpm version compatible with the repository’s Node deployment target. Set the same exact `packageManager` version at the workspace root and remove the conflicting backend declaration. Regenerate the lockfile once using that version, verify it has one YAML document, then run a frozen install in a clean CI environment.

Do not use `latest` ranges for production dependencies.

**Step 3: Document production configuration**

Create a deployment checklist covering:

- TLS termination, HSTS, direct-backend network isolation, and header preservation.
- Explicit frontend CORS origin allowlist by environment; no localhost origins in production.
- Trusted proxy topology and forwarding-header stripping.
- Redis/shared rate limiter or equivalent edge control.
- Supabase RLS, grants, exposed schemas, buckets, and service-role rotation.
- Database least privilege, backup/PITR, Storage backup, restore drills, RPO/RTO.
- OpenAPI/Swagger production access policy.
- Health versus readiness endpoint exposure.

**Step 4: Run configuration checks**

Run:

```bash
pnpm install --frozen-lockfile
pnpm --filter backend typecheck
pnpm --filter backend test
pnpm audit --prod
```

Expected: all commands exit 0. Triage advisories rather than suppressing them without a documented exception.

**Step 5: Commit**

```bash
git add package.json backend/package.json pnpm-lock.yaml pnpm-workspace.yaml .github/workflows/backend-security.yml backend/docs/security/deployment-checklist.md
```

### Task 18: Improve production error handling, logging, monitoring, and shutdown

**Files:**
- Create: `backend/src/lib/logger.ts`
- Create: `backend/src/instrumentation.ts`
- Modify: `backend/src/index.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/src/lib/errors.ts`
- Modify: `backend/src/lib/notification.helpers.ts`
- Modify: `backend/src/cron/moa-expiration.ts`
- Modify: `backend/src/cron/report-overdue.ts`
- Modify: `backend/src/cron/privacy-retention.ts`
- Modify: `backend/src/db/client.ts`
- Create: `backend/src/lib/logger.test.ts`

**Step 1: Write failing logging and shutdown tests**

Test that:

- Error logs exclude authorization headers, tokens, cookies, passwords, full email addresses, raw provider responses, and arbitrary file paths.
- Every log includes request ID, route, status, and event code where available.
- Unexpected API and cron failures invoke Sentry capture when configured.
- Shutdown stops accepting traffic, stops schedulers, waits for bounded in-flight work, closes DB resources, and flushes Sentry.

**Step 2: Run focused tests to verify failure**

Run:

```bash
pnpm --filter backend test -- logger
```

Expected: FAIL because error handling writes raw objects to `console.error` and process shutdown is not implemented.

**Step 3: Implement structured, redacted observability**

Initialize Sentry instrumentation before importing application modules. Add a structured logger with allowlisted fields and control-character normalization. Translate provider errors to stable client-facing error codes while retaining redacted diagnostics in protected logs.

Track metrics/alerts for 401, 403, 429, 5xx, job freshness, outbox backlog, email failure, database pool exhaustion, and file scan failure.

**Step 4: Add graceful shutdown**

Retain server, cron, outbox, and database handles. On `SIGTERM`/`SIGINT`, stop receiving traffic, release job ownership, drain bounded work, close DB connections, flush Sentry, and then exit. Add a distinct liveness endpoint that does not query the database; restrict detailed readiness checks to internal monitoring.

**Step 5: Run focused tests and full backend verification**

Run:

```bash
pnpm --filter backend test -- logger
pnpm --filter backend typecheck
pnpm --filter backend test
pnpm --filter backend build
```

Expected: all commands exit 0.

**Step 6: Commit**

```bash
git add backend/src/lib/logger.ts backend/src/lib/logger.test.ts backend/src/instrumentation.ts backend/src/index.ts backend/src/app.ts backend/src/lib/errors.ts backend/src/lib/notification.helpers.ts backend/src/cron backend/src/db/client.ts
```

## Final Verification and Release Checklist

### Task 19: Run the complete security regression suite

**Files:**
- Modify as needed only for legitimate test fixes: `backend/src/**/*.test.ts`
- Create: `backend/docs/security/security-regression-matrix.md`

**Step 1: Create the regression matrix**

Map each audit finding to one or more automated tests, including:

- Same-scope non-member access denial.
- Parent/child ID binding.
- Account state transitions and session revocation.
- Direct Supabase role denial.
- Report upload race and post-commit failure.
- Project/MOA state transitions.
- User directory minimization.
- Real byte-limit enforcement.
- File quarantine and replacement lifecycle.
- Multi-worker cron idempotency.

**Step 2: Run all static checks and tests**

Run:

```bash
pnpm install --frozen-lockfile
pnpm --filter backend typecheck
pnpm --filter backend test
pnpm --filter backend build
pnpm audit --prod
```

Expected: all commands exit 0. Record actual test counts and advisory results in the pull request, not in source files if they contain transient output.

**Step 3: Run staging security checks**

- Execute direct Supabase anon/authenticated denial tests.
- Exercise a real reverse proxy with spoofed forwarding headers and chunked oversized bodies.
- Run two worker instances against the same staging database.
- Upload malicious-file fixtures into quarantine and confirm no signed URL is issued.
- Execute a controlled restore drill for database plus Storage metadata.

Expected: every attack simulation is denied or safely handled, and monitoring receives the expected redacted event.

**Step 4: Commit documentation only if changed**

```bash
git add backend/docs/security/security-regression-matrix.md
git commit -m "docs: map backend security regression coverage"
```

## Rollout Order

1. Block release until Task 1 confirms direct Supabase access is denied.
2. Deploy Tasks 2-9 together because they change authorization and workflow semantics that must remain consistent across routes.
3. Deploy Tasks 10-13 after frontend/API clients are updated for invitations, account state, directory response shape, and rate-limit behavior.
4. Deploy Tasks 14-16 behind feature flags or worker separation where possible; run storage reconciliation in report-only mode before deletion mode.
5. Complete Tasks 17-19 before declaring the remediation program closed.

## Acceptance Criteria

- No client role can directly access backend-owned Supabase data or private documents outside explicit policy.
- Unrelated same-scope faculty cannot view, comment on, download, or alter a proposal unless an explicit reviewed policy grants that exact action.
- Every ID-based project/proposal/document route performs object-level authorization.
- Account, membership, MOA, and project lifecycle checks are centralized and tested against stale/archived records.
- File submission is atomic from the user’s perspective and never leaves a committed row pointing to deleted content.
- Scheduled jobs execute once logically across replicas and notification/email delivery is idempotent.
- Resource limits are enforced against actual bytes and every expensive input has bounded schema limits.
- Production deployment verification covers Supabase, TLS, proxy headers, shared limiting, backups, logging, and monitoring.
