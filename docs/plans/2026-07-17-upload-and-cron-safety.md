# Upload Authorization and Cron Safety Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent unauthorized proposal document uploads and make the existing Node cron jobs safe to run across restarts or multiple backend instances without introducing a separate job system.

**Architecture:** Proposal document uploads will require the authenticated user to be an active proposal member, a Project Leader, or an administrator with full proposal access; existing campus/department scoping remains an additional boundary. Cron entrypoints will call a small reusable database-backed lease helper. Scheduled notifications will use an optional unique deduplication key so retries cannot create or email the same event repeatedly. Privacy retention will use the same lease wrapper while retaining its existing conditional updates and transactions.

**Tech Stack:** Hono, Drizzle ORM, PostgreSQL/Supabase, node-cron, Vitest, TypeScript.

---

### Task 1: Enforce proposal document upload authorization

**Files:**
- Modify: `backend/src/modules/storage/storage.service.ts`
- Modify: `backend/src/db/schema/proposal-members.ts` only if the query needs a supporting index
- Test: `backend/src/modules/storage/storage.routes.test.ts`

**Steps:**
1. Add a failing route test proving an in-scope non-member cannot upload.
2. Add a failing route/service test proving an active proposal member can upload.
3. Implement one membership query that checks the authenticated user, proposal, active membership, and scope.
4. Preserve Director/Super Admin access through the existing full-scope rule.
5. Run the focused storage tests.

### Task 2: Add reusable cron leases

**Files:**
- Create: `backend/src/lib/cron-lock.ts`
- Modify: `backend/src/cron/report-overdue.ts`
- Modify: `backend/src/cron/moa-expiration.ts`
- Modify: `backend/src/cron/privacy-retention.ts`
- Test: `backend/src/lib/cron-lock.test.ts`

**Steps:**
1. Add a failing test for a lease acquired by one invocation and rejected while active.
2. Add a failing test for an expired lease being reclaimable.
3. Implement a short database lease using an atomic update/insert and an ownership token.
4. Wrap each scheduled handler with a distinct job name and release only its own lease.
5. Log skipped invocations and preserve existing error handling.

### Task 3: Deduplicate scheduled notifications

**Files:**
- Modify: `backend/src/db/schema/notifications.ts`
- Modify: `backend/src/lib/notification.helpers.ts`
- Modify: `backend/src/cron/report-overdue.ts`
- Modify: `backend/src/cron/moa-expiration.ts`
- Create: generated migration under `backend/drizzle/`
- Test: focused notification/cron tests

**Steps:**
1. Add a failing test proving a repeated scheduled notification with the same key does not send a second email.
2. Add an optional nullable unique deduplication key to notifications.
3. Insert with `ON CONFLICT DO NOTHING` and send email only when the insert succeeds.
4. Use stable keys based on milestone/recipient and MOA/recipient.
5. Remove the redundant non-idempotent MOA email path or route it through the same deduplication behavior.
6. Generate and inspect the Drizzle migration.

### Task 4: Verify

**Files:**
- No production files unless verification exposes a defect.

**Steps:**
1. Run focused upload, lock, notification, and cron tests.
2. Run backend typecheck.
3. Run the complete backend test suite.
4. Review the diff for unrelated changes and migration correctness.
