# Backend Risk Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close confirmed authorization, workflow-integrity, storage-lifecycle, and operational-resilience gaps before the application receives real users or production traffic.

**Architecture:** Enforce authorization and resource ownership at every route/service boundary; make database constraints and transactions the final integrity layer. Preserve the new reporting-milestone model, and address remaining risks in small independent batches with route-level regression tests before each production change.

**Tech Stack:** Hono, Zod/OpenAPI, Drizzle ORM, PostgreSQL, Supabase Storage, node-cron, Resend, Sentry, Vitest.

---

## Confirmed Findings

- Proposal comments accept any document ID after only checking proposal existence, and comment listing ignores the proposal ID and scope entirely: `backend/src/modules/proposals/comments.routes.ts:47-173`.
- All authenticated users can list every setting value, while only writes are role-checked: `backend/src/modules/settings/settings.routes.ts:16-39`, `settings.service.ts:17-52`.
- JSON body limits trust `Content-Length`; requests without it bypass the 1 MB check. The request timeout returns `408` without cancelling downstream work: `backend/src/app.ts:67-150`.
- Proposal leaders can edit Pending Review and Endorsed content: `backend/src/modules/proposals/proposals.service.ts:180-249`.
- Project detail and MOA-linked-project queries omit archive predicates: `backend/src/modules/projects/projects.service.ts:206-243`, `backend/src/modules/moas/moas.service.ts:235-271`.
- Replacing special-order files leaves old storage objects; duplicate-number failures leak the newly uploaded object: `backend/src/modules/special-orders/special-orders.service.ts:101-169`.
- Partner creation is a read-then-insert outside an encompassing transaction/unique constraint: `backend/src/modules/moas/moas.service.ts:359-420`.
- Cron starts in every API process, has no explicit timezone or idempotency state, and overdue notifications repeat for each unfinished milestone: `backend/src/index.ts:18-20`, `backend/src/cron/report-overdue.ts:54-195`.
- The report document route lacks a validated UUID parameter and throws a generic error for a missing file: `backend/src/modules/reports/reports.routes.ts:98-130`.
- Password changes have no dedicated rate limiter: `backend/src/modules/auth/auth.routes.ts:136-208`.

### Task 1: Close Proposal Comment Authorization Bypasses

**Files:**
- Modify: `backend/src/modules/proposals/comments.routes.ts`
- Modify: `backend/src/modules/proposals/proposals.service.ts` or create a focused authorization helper
- Test: `backend/src/modules/proposals/proposals.routes.test.ts`

**Step 1: Write failing tests.**

- A document from proposal B cannot be read or commented through proposal A's URL.
- Faculty cannot access comments outside their member/scope authorization.
- RET Chair cannot access a bypassed proposal.

**Step 2: Implement document binding and scope checks.**

- Query the document using both `proposalId` and `documentId`.
- Apply the same proposal-scope/role rules used by proposal details.
- Return `404` for a mismatched proposal/document pair so IDs cannot be enumerated.
- Remove commenter email from comment responses unless it is an explicit product requirement.

**Step 3: Run focused tests and commit.**

```bash
pnpm --dir backend test src/modules/proposals/proposals.routes.test.ts
git commit -m "fix: enforce proposal comment authorization"
```

### Task 2: Enforce State And Archive Boundaries

**Files:**
- Modify: `backend/src/modules/proposals/proposals.service.ts`
- Modify: `backend/src/modules/projects/projects.service.ts`
- Modify: `backend/src/modules/moas/moas.service.ts`
- Test: `backend/src/modules/proposals/proposals.routes.test.ts`
- Test: `backend/src/modules/projects/projects.routes.test.ts`
- Test: `backend/src/modules/moas/moas.routes.test.ts`

**Step 1: Write failing tests.**

- Pending Review and Endorsed proposals reject edits.
- Project detail excludes archived proposal/project/MOA records.
- MOA linked-project lists exclude archived projects and archived proposals.

**Step 2: Implement the minimum rules.**

- Permit content edits only for Draft and Returned proposals.
- Add archive predicates to every joined resource in detail/link queries.
- Preserve explicit archive-list endpoints only where intended.

**Step 3: Run focused tests and commit.**

```bash
git commit -m "fix: enforce proposal and archive state boundaries"
```

### Task 3: Restrict Settings And Normalize Route Errors

**Files:**
- Modify: `backend/src/modules/settings/settings.routes.ts`
- Modify: `backend/src/modules/settings/settings.service.ts`
- Modify: `backend/src/modules/reports/reports.routes.ts`
- Modify: `backend/src/modules/reports/reports.schema.ts`
- Test: `backend/src/modules/settings/settings.routes.test.ts`
- Test: `backend/src/modules/reports/reports.routes.test.ts`

**Step 1: Write failing tests.**

- Non-Super Admin settings reads return `403`.
- Missing report upload file returns the standard `422` envelope.
- Invalid report ID returns a validation `400` response.

**Step 2: Implement role and parameter validation.**

- Pass authenticated user to `listSettings` and require Super Admin.
- Reuse `ParamId` for report document uploads.
- Replace raw errors with `ApiError` responses.

**Step 3: Run focused tests and commit.**

```bash
git commit -m "fix: protect settings and normalize report errors"
```

### Task 4: Make Files And Partner Creation Transaction-Safe

**Files:**
- Modify: `backend/src/modules/special-orders/special-orders.service.ts`
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/src/modules/moas/moas.service.ts`
- Modify: `backend/src/db/schema/partners.ts`
- Create: Drizzle migration for partner uniqueness
- Test: special-order, reports, and MOA route tests

**Step 1: Write failing tests.**

- Replacing a file removes the old object only after the database update succeeds.
- A duplicate special-order number removes the new upload.
- Partner creation handles concurrent duplicate names through a unique constraint/upsert.

**Step 2: Implement compensating storage operations.**

- Always remove a newly uploaded object on any failed database operation.
- Delete old objects only after a successful record replacement.
- Add a unique partner-name constraint and use insert-on-conflict retrieval in a transaction.

**Step 3: Run focused tests and commit.**

```bash
git commit -m "fix: protect storage lifecycle and partner integrity"
```

### Task 5: Harden HTTP Boundaries And Sensitive Endpoints

**Files:**
- Modify: `backend/src/app.ts`
- Modify: `backend/src/modules/auth/auth.routes.ts`
- Modify: `backend/src/lib/client-ip.ts`
- Modify: `backend/src/env.ts`
- Test: `backend/src/app.test.ts`
- Test: `backend/src/modules/auth/auth.routes.test.ts`

**Step 1: Write failing tests.**

- Headerless/chunked JSON exceeding the limit is rejected.
- Password-change attempts hit a dedicated limit.
- Production CORS accepts only configured trusted origins.

**Step 2: Implement safe request limits.**

- Replace header-only body enforcement with a bounded-body strategy supported by the Node/Hono adapter.
- Add a low per-account/IP password-change limiter.
- Configure CORS from validated environment origins.
- Restrict trusted proxy behavior to deployments where direct backend access is blocked.

**Step 3: Treat timeout cancellation as a separate design decision.**

Do not claim that `Promise.race` cancels mutations. Either remove the misleading timeout or propagate an abort signal through all cancellable dependencies; add idempotency for mutation routes before client retries are encouraged.

### Task 6: Make Cron Execution Safe In Production

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/src/cron/report-overdue.ts`
- Modify: `backend/src/cron/moa-expiration.ts`
- Create: database-backed cron lock/idempotency schema and migration
- Test: new cron-focused tests

**Step 1: Add a singleton execution strategy.**

- Run cron in a dedicated worker process, or acquire a PostgreSQL advisory/distributed lock before each job.
- Use `Asia/Manila` explicitly in cron schedules.

**Step 2: Add idempotency.**

- Persist a notification key per milestone/recipient/event.
- Send an overdue notification once per defined policy, rather than once per process/day indefinitely.
- Isolate each record so one notification/email failure does not abandon the batch.

**Step 3: Add lifecycle handling.**

- Retain the HTTP server handle.
- On `SIGTERM`/`SIGINT`, stop cron scheduling, stop accepting new requests, and close PostgreSQL connections.
- Capture unhandled route errors with Sentry when configured.

### Task 7: Final Verification

Run after all remediation tasks:

```bash
pnpm --dir backend test
pnpm --dir backend typecheck
pnpm --dir backend build
pnpm --dir frontend test
pnpm --dir frontend build
```

Manually exercise cross-scope comment access, settings access, review-stage edits, archived-resource URLs, file replacement failure, rate limits, and a repeated cron run. Confirm the reporting-milestone flow remains intact.
