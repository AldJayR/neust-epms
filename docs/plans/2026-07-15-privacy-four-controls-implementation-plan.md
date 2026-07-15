# Privacy Four Controls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the four highest-value backend controls from the privacy remediation plan: authorization closure, uploaded-file provenance, reliable audit trails, and hold-aware retention.

**Architecture:** Reuse the existing Hono route structure, Drizzle schemas, `buildProposalScope`, `system_settings`, `insertAuditLog`, and Supabase Storage. Add small shared helpers where the same authorization, hashing, sanitization, or retention behavior is needed across modules. Use additive database migrations and preserve records through soft archival rather than hard deletion.

**Tech Stack:** TypeScript, Hono, Drizzle ORM/PostgreSQL, Supabase Storage, Vitest, node-cron.

---

## Scope and Order

Implement in this order:

1. Authorization closure, because it fixes active disclosure paths.
2. File provenance and integrity, because official uploaded records currently lack verifiable origin metadata.
3. Audit reliability, because the first two controls need durable evidence.
4. Retention, because archival behavior depends on the final authorization and audit model.

Do not implement legal-hold tables, digital signatures, a general privacy-request portal, or destructive deletion in this change. Retention must remain compatible with the institution's approved records-disposition schedule.

## Shared Acceptance Criteria

- A user cannot read or mutate proposal data outside the existing campus/department scope.
- A document identifier cannot be used with a different proposal identifier to access comments or files.
- Every official uploaded PDF has a server-generated SHA-256 hash and uploader provenance.
- Every successful material mutation has an audit event with actor, timestamp, action, resource, and IP address.
- Audit values never contain passwords, bearer tokens, reset tokens, raw file contents, or unnecessary PII.
- Retention is configurable, hold-aware, auditable, and non-destructive.
- Existing active-record queries continue excluding archived records.

## Task 1: Close Proposal and Document Authorization

**Files:**
- Create: `backend/src/lib/proposal-access.ts`
- Modify: `backend/src/lib/scope-helpers.ts`
- Modify: `backend/src/modules/members/members.routes.ts`
- Modify: `backend/src/modules/members/members.service.ts`
- Modify: `backend/src/modules/proposals/comments.routes.ts`
- Modify: `backend/src/modules/storage/storage.service.ts`
- Modify: `backend/src/modules/special-orders/special-orders.service.ts`
- Modify: `backend/src/modules/special-orders/special-orders.routes.ts`
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/src/modules/projects/*.ts` where project/member access is resolved
- Verify: `backend/src/modules/members/members.routes.test.ts`
- Verify: `backend/src/modules/proposals/proposals.routes.test.ts`
- Verify: `backend/src/modules/storage/storage.routes.test.ts`
- Verify: `backend/src/modules/special-orders/special-orders.routes.test.ts`
- Verify: `backend/src/modules/reports/reports.routes.test.ts`

### Implementation

1. Add a shared proposal-access helper that loads a non-archived proposal and applies the existing role scope:
   - Super Admin and Director retain full access.
   - Faculty is limited to department when assigned to a department, otherwise campus.
   - RET Chair uses department scope on main campus and campus scope elsewhere.
   - Return `403 FORBIDDEN` for an existing but out-of-scope proposal and `404 NOT_FOUND` for a missing/archived proposal, following the current route conventions.
2. Update member service APIs to accept the authenticated user for all proposal-member reads and writes. Check proposal access before listing, adding, or removing members.
3. Replace the comments route's proposal lookup with a joined document/proposal lookup. Require:
   - `proposalDocuments.proposalId === route proposalId`.
   - The proposal is non-archived and accessible to the caller.
   - The document is non-archived where the schema supports archival.
4. Apply the same shared access check to special-order upload/download, project-report upload/read paths, proposal-document listing/upload/signed URLs, and project-specific file routes.
5. Ensure every route that accepts both a parent ID and child ID validates the relationship in SQL rather than checking each identifier independently.
6. Preserve existing role-specific business rules such as project-leader-only mutations after the broader scope check succeeds.

### Verification

- Add cases where a user from another campus receives `403` from member listing and comment listing/creation.
- Add a case where a valid document ID is paired with the wrong proposal ID and receives `404` or `403`, without data being returned.
- Add signed-URL cases for an out-of-scope proposal and mismatched document parent.
- Run the affected Vitest route suites and backend typecheck.

## Task 2: Add Uploaded-File Provenance and Integrity

**Files:**
- Create: `backend/src/services/file-integrity.service.ts`
- Modify: `backend/src/db/schema/proposal-documents.ts`
- Modify: `backend/src/db/schema/project-reports.ts`
- Modify: `backend/src/db/schema/special-orders.ts`
- Modify: `backend/src/db/schema/moas.ts`
- Modify: `backend/src/modules/storage/storage.service.ts`
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/src/modules/special-orders/special-orders.service.ts`
- Modify: `backend/src/modules/moas/moas.service.ts`
- Modify: related response schemas under `backend/src/modules/{storage,reports,special-orders,moas}/`
- Create: generated migration under `backend/drizzle/` using `pnpm --dir backend db:generate`
- Verify: `backend/src/modules/storage/storage.routes.test.ts`
- Verify: `backend/src/modules/reports/reports.routes.test.ts`
- Verify: `backend/src/modules/special-orders/special-orders.routes.test.ts`
- Verify: `backend/src/modules/moas/moas.routes.test.ts`

### Data Model

Add these nullable columns initially so existing rows remain readable and can be backfilled or marked legacy:

- `content_hash varchar(64)` for SHA-256 hex.
- `uploaded_by uuid` referencing `users.user_id`.
- `source_ip varchar(45)`.

Apply them to `proposal_documents`, `project_reports`, `special_orders`, and `moas`. Keep existing `submitted_by_id` fields; `uploaded_by` records the actor for the specific file upload.

### Implementation

1. Add `hashFileSha256(file: File): Promise<string>` in `file-integrity.service.ts`. Read the file bytes server-side and return lowercase SHA-256 hex. Do not log bytes or hashes in application logs.
2. Keep the existing PDF magic-byte validation as the file-type gate. Do not rely on the filename or MIME type alone.
3. Compute the hash before the Supabase upload and persist hash, authenticated user ID, and trusted client IP with the database record.
4. For replacement uploads, retain the latest provenance metadata while preserving the existing record/version behavior. Proposal document versions must each retain their own metadata.
5. Include integrity metadata only in privileged/admin or official-record responses. Do not expose source IP in ordinary faculty-facing list responses.
6. Ensure a database insert/update failure removes the newly uploaded object from Supabase, as current services already attempt to do for storage failures.
7. Generate and inspect the Drizzle migration before applying it. Do not make destructive changes to existing file records.

### Verification

- Confirm a known PDF produces the expected SHA-256 hash.
- Confirm a spoofed `.pdf` or `application/pdf` file with invalid magic bytes is rejected.
- Confirm proposal, report, special-order, and MOA uploads persist uploader ID, source IP, and hash.
- Confirm a failed metadata insert cleans up the Supabase object.
- Run the affected route suites and backend typecheck.

## Task 3: Make Audit Logging Reliable and Privacy-Safe

**Files:**
- Modify: `backend/src/lib/audit.ts`
- Modify: `backend/src/lib/audit-diff.ts`
- Modify: `backend/src/db/schema/audit-logs.ts`
- Modify: `backend/src/modules/proposals/comments.routes.ts`
- Modify: `backend/src/modules/members/members.service.ts`
- Modify: `backend/src/modules/storage/storage.service.ts`
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/src/modules/special-orders/special-orders.service.ts`
- Modify: `backend/src/modules/moas/moas.service.ts`
- Modify: `backend/src/modules/projects/*.ts`
- Modify: `backend/src/modules/admin/admin.service.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/audit/audit.service.ts`
- Verify: relevant route tests under `backend/src/modules/**/*.routes.test.ts`

### Implementation

1. Define an allowlisted audit-value sanitizer. Permit resource IDs, status/role transitions, record types, and safe metadata. Redact keys matching password, token, secret, authorization, reset code, file content, and other credential/content fields.
2. Update `insertAuditLog` to sanitize `oldValue` and `newValue` before persistence. Preserve null values and avoid changing the existing audit API unnecessarily.
3. Add indexes for common review queries: `created_at`, `table_affected`, and the existing actor/time access path. Use a generated migration.
4. Add a single audit event for comment creation and verify member add/remove events include the affected member and proposal IDs.
5. For each material mutation touched by this remediation, put the business update and audit insert in one database transaction. Pass the transaction executor into `insertAuditLog`.
6. Where storage is involved, use a compensating cleanup sequence: upload object, transactionally persist metadata and audit event, and remove the object if the database transaction fails.
7. Populate `oldValue` and `newValue` for status, role, archive/restore, and provenance changes. Do not serialize entire database rows when only a few material fields changed.
8. Standardize actions as `<Verb> <resource> <id>` with optional safe context. Do not place free-form search strings, email addresses, titles containing personal data, or document contents in actions.
9. Keep access/download audit events, but record only actor, resource ID, route purpose, and IP. Do not record signed URLs or bearer tokens.
10. Review Sentry and error logging paths for request-body, header, and PII leakage while touching error-prone upload and authorization flows.

### Verification

- Confirm each successful mutation creates exactly one relevant audit event.
- Confirm a failed transaction creates neither the business mutation nor its audit event.
- Confirm old/new status values are present for material transitions.
- Confirm password/reset/token/file-content fields are absent from stored audit JSON.
- Confirm download events do not contain signed URLs.
- Run audit, auth, proposal, member, storage, report, special-order, MOA, and project route suites plus typecheck.

## Task 4: Add Hold-Aware Retention and Remove Transactional Hard Deletes

**Files:**
- Modify: `backend/src/db/schema/projects.ts`
- Modify: `backend/src/db/schema/proposal-members.ts`
- Modify: `backend/src/db/schema/system-settings.ts` only if a setting validation constraint is needed
- Create: `backend/src/cron/privacy-retention.ts`
- Modify: `backend/src/index.ts`
- Modify: `backend/src/modules/settings/settings.schema.ts`
- Modify: `backend/src/modules/settings/settings.service.ts`
- Modify: `backend/src/modules/projects/crud.routes.ts`
- Modify: `backend/src/modules/projects/projects.service.ts`
- Modify: `backend/src/modules/members/members.service.ts`
- Modify: `backend/src/modules/proposals/proposals.service.ts`
- Modify: active-record queries that read `proposal_members`
- Create: generated migration under `backend/drizzle/` using `pnpm --dir backend db:generate`
- Verify: `backend/src/modules/projects/projects.routes.test.ts`
- Verify: `backend/src/modules/members/members.routes.test.ts`
- Verify: `backend/src/modules/settings/settings.routes.test.ts`
- Verify: `backend/src/modules/proposals/proposals.routes.test.ts`

### Data Model and Policy Assumptions

1. Add `projects.on_hold boolean not null default false`.
2. Add `proposal_members.archived_at timestamptz` with an index for active-member queries.
3. Reuse `system_settings` with the key `project_retention_years`; default to `10` when absent. Validate that the value is an integer within an administratively approved range before saving it.
4. Archival is not destruction. The job must never delete database rows or Supabase objects. Final disposal remains subject to the approved records-disposition schedule and authorization under the applicable records law.

### Implementation

1. Replace member hard delete with an update setting `archivedAt` and `updated`/equivalent timestamp. Include the prior active row in the audit diff.
2. Update every membership query, leader subquery, completeness check, special-order lookup, and project-member lookup to exclude archived members. Preserve historical membership through the archived row.
3. Replace proposal-beneficiary join-table replacement deletes with a non-destructive approach. Prefer archiving old links where the schema supports it; if the current join table cannot preserve history without a migration, add the smallest necessary `archived_at` field and update active queries.
4. Add a Super Admin-only project hold mutation or extend the existing project update route. Audit both enabling and clearing the hold with old/new values.
5. Add `privacy-retention.ts` with a callable `archiveExpiredProjects(now = new Date())` function and a weekly cron registration. Read `project_retention_years` from `system_settings`.
6. Select closed projects whose `actual_end_date` is older than the configured retention boundary, whose `archived_at` is null, and whose `on_hold` is false.
7. Archive the project and all directly linked records that already have archival support, including the proposal and project reports. Archive special orders only through their linked proposal members and only when their parent project is being archived.
8. Execute each project archival batch transactionally and write audit events using the system executor. If no valid system executor exists, fail safely and report the operational error rather than attributing the event to an arbitrary user.
9. Add a dry-run mode that reports candidate IDs/counts without changing records. Keep the scheduled production job non-destructive and idempotent.
10. Ensure restore operations are restricted to authorized roles, do not restore records under an active hold incorrectly, and audit the restore.
11. Register the cron in `backend/src/index.ts` alongside the existing jobs.

### Verification

- Confirm default retention is 10 years when no setting exists.
- Confirm invalid retention values are rejected.
- Confirm recent or non-closed projects are not archived.
- Confirm held projects are skipped.
- Confirm archived projects do not appear in active lists or signed-URL lookups.
- Confirm archival is idempotent and produces one event per actual archival transition.
- Confirm member removal and beneficiary replacement leave historical rows instead of deleting them.
- Confirm the source tree has no transactional `.delete()` calls remaining except cache invalidation or explicitly approved non-personal lookup cleanup.
- Run the affected route suites, retention tests, full backend tests, typecheck, and build.

## Final Verification and Evidence

Run from the repository root:

```bash
pnpm --dir backend test
pnpm --dir backend typecheck
pnpm --dir backend build
```

Before declaring completion:

- Inspect the generated SQL migrations and confirm they are additive.
- Review the final diff for accidental PII or secret logging.
- Confirm all active queries exclude archived members/records.
- Confirm authorization checks happen before returning child records or generating signed URLs.
- Record the migration names, test output, and the final access-control/retention behavior in the remediation evidence.
