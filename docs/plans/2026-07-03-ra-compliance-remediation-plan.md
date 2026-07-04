# RA 10173 / RA 10175 / RA 8792 Remediation Plan (Lean, DFD-Aligned)

**Date:** 2026-07-03  
**Scope:** NEUST-EPMS controls that are necessary for this system’s actual flows in `docs/dfd.md` (D1–D7), avoiding enterprise overengineering.

---

## Decision Update

This plan is revised to a **lean compliance core**:
1. enforce role/scope access for all proposal/project/report/document endpoints,
2. make D6 audit trail complete and reliable for all material changes,
3. enforce retention + disposal with legal-hold override,
4. strengthen electronic-record integrity/provenance for official files.

This is the minimum strong posture for this system’s documented behavior in Processes 1–9.

---

## DFD Mapping (Why these controls are necessary)

1. **Process 9.0 (Manage Activity Logs)** explicitly requires complete event recording in D6.  
2. **Processes 4.0 / 6.0 / 7.0 / 8.0** handle proposal, evaluation, project, SO, MOA, and report records (D2–D5), so access and retention controls are required.  
3. **Process 2.0 with D7** requires secure OTP/token lifecycle controls and expiry handling.  
4. Official uploaded records (MOA/SO/proposal docs/reports) require evidentiary reliability and provenance (RA 8792).

---

## Current Gaps to Close

1. Authorization gaps on member/comment/document-related endpoints.
2. Hard delete still exists on `proposal_members`.
3. Audit logging is not universal; some mutations are not logged.
4. Retention is not policy-driven and not enforceably linked to legal hold.
5. Uploaded official documents lack full integrity/provenance metadata.

---

## Control Scope: Must vs Deferred

## Must Implement (this remediation cycle)

1. Access control closure (role + campus/department scope).
2. Full mutation audit logging in D6.
3. No hard delete for transactional records.
4. Retention schedule + scheduled enforcement.
5. Legal-hold mechanism to block purge.
6. File hash + uploader provenance for official uploaded files.

## Deferred (not required now for this system size)

1. Full enterprise compliance case management suite.
2. Complex retention orchestration UI/workflow.
3. Advanced document digital signatures for all files.

---

## Lean Data Model Changes

## New tables

1. **`retention_policies`** — per record class/table retention windows and legal basis.  
2. **`legal_holds`** — active/inactive legal hold records.  
3. **`legal_hold_targets`** — exact record/file targets under hold.

## Existing table enhancements

1. `proposal_documents`: add `content_hash`, `uploaded_by`, `source_ip`.  
2. `special_orders`: add `content_hash`, `uploaded_by`, `source_ip` (or equivalent audit-linked provenance).  
3. `project_reports`: add `content_hash`, `uploaded_by`, `source_ip` for uploaded report files.  
4. `audit_logs`: populate `old_value`/`new_value` where practical for material updates.

---

## Implementation Phases

## Phase 1 — Access Control Closure (P0)

### Tasks
1. Enforce proposal scope checks on:
   - `GET /proposals/{proposalId}/members`
   - `POST /proposals/{proposalId}/documents/{docId}/comments`
   - `GET /proposals/{proposalId}/documents/{docId}/comments`
2. Standardize role/scope check helper for proposal/document access.
3. Add unauthorized-access regression tests.

### Acceptance Criteria
- Unauthorized access returns `403` consistently.
- No cross-campus/department leakage.

---

## Phase 2 — D6 Audit Trail Completeness (P0/P1)

### Tasks
1. Ensure every successful mutation writes one audit event.
2. Add missing audit calls (e.g., currently uncovered update paths).
3. Extend logger usage to persist `old_value`/`new_value` where update diff is material.
4. Normalize action naming (`Verb Resource {id}`).

### Acceptance Criteria
- 100% mutation route coverage.
- Audit entries include actor, timestamp, IP, resource/table, and action.

---

## Phase 3 — Retention + No-Hard-Delete + Legal Hold (P1)

### Tasks
1. Replace hard delete on `proposal_members` with archival/tombstone strategy.
2. Implement `retention_policies` + scheduled retention enforcement job.
3. Implement `legal_holds` and `legal_hold_targets`.
4. Ensure retention job skips all held targets and writes audit events.

### Acceptance Criteria
- No hard delete remains for transactional personal-data records.
- Purge/archive is policy-driven and hold-aware.

---

## Phase 4 — Electronic Record Integrity (P1/P2)

### Tasks
1. Add hash/provenance fields for official uploaded records.
2. Compute SHA-256 server-side at upload.
3. Harden upload validation (magic-byte/signature check for PDF).
4. Expose integrity metadata in privileged views/APIs.

### Acceptance Criteria
- All official uploads have verifiable hash + uploader provenance.
- Malformed/spoofed uploads are rejected.

---

## Phase 5 — D7 OTP/Token Hygiene + Evidence Pack (P2)

### Tasks
1. Add scheduled cleanup for expired/used reset tokens (D7).
2. Document retention matrix, legal-hold SOP, and access-control matrix.
3. Add test coverage:
   - authz tests,
   - mutation-to-audit tests,
   - hold-aware retention tests,
   - upload-integrity tests.

### Acceptance Criteria
- D7 lifecycle is bounded and cleaned.
- Controls are test-backed and audit-evidence ready.

---

## Execution Sequence (Recommended)

1. **Sprint 1:** Phase 1 + high-priority Phase 2  
2. **Sprint 2:** Phase 3 + remaining Phase 2  
3. **Sprint 3:** Phase 4 + Phase 5

---

## Risks and Mitigations

1. **Migration risk** — use additive schema changes and backfills first.  
2. **Performance overhead from richer auditing** — add indexes on `created_at`, `user_id`, `table_affected`.  
3. **Retention mistakes** — dry-run mode first, then controlled enablement by policy.

---

## Done Definition

The remediation is complete when:
1. access-control gaps are closed on all sensitive routes,
2. all material mutations are captured in D6 audit trail,
3. retention and legal-hold controls are enforceable in code,
4. official electronic records have verifiable integrity/provenance,
5. docs and tests provide repeatable compliance evidence.
