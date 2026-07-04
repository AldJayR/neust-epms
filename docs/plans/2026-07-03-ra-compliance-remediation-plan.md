# Philippine Law Compliance Plan (Lean, DFD-Aligned)

**Date:** 2026-07-04 (revised)
**Scope:** NEUST-EPMS controls necessary for this system's documented behavior in `docs/dfd.md` (Processes 1–9), proportional to a university extension services project management system.

---

## Law Analysis (What Actually Applies)

### Laws Requiring Code/Controls

| Law | Applies? | What it requires of this system |
|---|---|---|
| **RA 10173** (Data Privacy Act, 2012) | Yes | Security measures (RBAC, audit trails), data retention limitation, no indefinite retention, breach notification readiness. NPC Circular 2023-06 sets specific security standards for government agencies processing personal data. |
| **RA 9470** (National Archives Act, 2007) | Yes | Cannot destroy records without NAP authorization (Sec. 18). Must maintain records disposition schedule (Sec. 16-17). Records 30+ years transfer to NAP (Sec. 20). The `archived_at` pattern satisfies the no-destruction requirement; disposition schedule is administrative, not code. |
| **RA 8792** (E-Commerce Act, 2000) | Yes | Electronic documents have same legal effect as paper (Sec. 6-7). Electronic signatures are equivalent to handwritten signatures if reliable (Sec. 8). File integrity and provenance support evidentiary admissibility under the Rules on Electronic Evidence (A.M. No. 01-7-01-SC). |

### Laws Requiring Policy/Process Alignment (No Additional Code Changes)

| Law | Applies? | What it requires |
|---|---|---|
| **RA 12254** (E-Governance Act, 2025) | Yes — explicitly covers SUCs | Requires Information Systems Strategic Plan (ISSP) compliance, alignment with E-Government Master Plan, and interoperability across agencies. Design implication: API-first architecture, standard data formats. |
| **RA 10844** (DICT Act, 2015) | Yes | Creates DICT as the national ICT policy body. Requires government ICT projects to align with the National ICT Development Agenda. Design implication: same as above — design for interoperability. |
| **RA 11032** (Ease of Doing Business Act, 2018) | Yes | Requires streamlined government services and reduced processing times. If the system exposes citizen-facing services, processing time targets apply. Currently internal-facing — minimal impact. |

### Laws Not Applicable to System Code

| Law | Why Not |
|---|---|
| **RA 10175** (Cybercrime Prevention Act, 2012) | Penal law for criminal acts (hacking, identity theft). Does NOT impose proactive system requirements. Service providers must preserve data for 6 months on law enforcement request — not relevant to this system's operational data. |
| **RA 9184 / RA 12009** (Procurement Reform) | Governs how the system was procured, not the system's code. Procurement documentation must comply. |
| **RA 8293** (Intellectual Property Code) | System is government-funded, so IP ownership and licensing considerations apply to the project deliverable, not to the codebase itself. |

### Design Principles Derived from Applicable Laws

1. **RA 10173 + NPC 2023-06:** RBAC, audit trails, data retention limitation, breach notification readiness
2. **RA 9470:** No hard delete, age-based archival, on-hold mechanism
3. **RA 8792:** File integrity (SHA-256), uploader provenance, magic-byte validation
4. **RA 12254 + RA 10844:** API-first design, standard data formats for interoperability

---

## Decision: Lean Compliance Core

1. Enforce role/scope access for all proposal/project/report/document endpoints
2. Make D6 audit trail complete and reliable for all material changes
3. Enforce no-hard-delete + simple age-based archival
4. Strengthen electronic-record integrity/provenance for official files

**Not in scope:** Enterprise legal-hold infrastructure, per-record-class retention policy engine, digital signatures. These are disproportionate for a university PMS.

---

## Current Gaps

1. **Authorization gaps** — member/comment/document endpoints lack scope checks
2. **Hard delete** — `proposal_members` still uses hard delete
3. **Audit logging** — not all mutations are logged; missing `old_value`/`new_value`
4. **Retention** — no archival mechanism beyond `archived_at` columns
5. **File integrity** — uploaded documents lack content hash and uploader provenance

---

## Must Implement

1. Access control closure (role + campus/department scope)
2. Full mutation audit logging in D6
3. No hard delete for transactional records
4. Simple age-based archival cron for closed projects
5. File hash + uploader provenance for official uploaded files

## Deferred (not required for this system size)

1. Legal-hold infrastructure (`legal_holds`, `legal_hold_targets` tables)
2. Complex retention orchestration UI/workflow
3. Advanced document digital signatures
4. D7 (OTP token) lifecycle management — Supabase-managed, outside backend scope

---

## Data Model Changes

### New column on `projects`

| Column | Type | Default | Purpose |
|---|---|---|---|
| `on_hold` | `boolean` | `false` | Blocks archival of specific projects. Manual Super Admin toggle. Covers RA 9470 Sec. 18 (no destruction without authorization). |

### New table: `retention_settings`

| Column | Type | Purpose |
|---|---|---|
| `setting_key` | `varchar PK` | e.g., `project_retention_years` |
| `setting_value` | `text` | e.g., `10` |

Single row or few rows. Defaults to 10 years after project closure. Configurable by Super Admin.

### Existing table enhancements

| Table | New columns | Purpose |
|---|---|---|
| `proposal_documents` | `content_hash`, `uploaded_by`, `source_ip` | RA 8792 evidentiary integrity |
| `special_orders` | `content_hash`, `uploaded_by`, `source_ip` | RA 8792 evidentiary integrity |
| `project_reports` | `content_hash`, `uploaded_by`, `source_ip` | RA 8792 evidentiary integrity |
| `audit_logs` | Populate `old_value`/`new_value` where practical | RA 10173 audit trail completeness |

---

## Implementation Phases

### Phase 1 — Access Control Closure (P0)

**Goal:** No unauthorized cross-campus/department data access.

**Tasks:**
1. Enforce proposal scope checks on:
   - `GET /proposals/{proposalId}/members`
   - `POST /proposals/{proposalId}/documents/{docId}/comments`
   - `GET /proposals/{proposalId}/documents/{docId}/comments`
2. Standardize role/scope check helper for proposal/document access (reuse existing `requireRole` + campus/department scoping pattern).
3. Add unauthorized-access regression tests.

**Acceptance Criteria:**
- Unauthorized access returns `403` consistently.
- No cross-campus/department data leakage.

---

### Phase 2 — D6 Audit Trail Completeness (P0/P1)

**Goal:** Every successful mutation writes one audit event.

**Tasks:**
1. Audit every mutation route — identify gaps by scanning for `app.openapi()` handlers without a trailing `insertAuditLog` call.
2. Add missing audit calls for uncovered update paths.
3. Extend logger to persist `old_value`/`new_value` for material updates (status changes, role changes, project transitions).
4. Normalize action naming: `Verb Resource {id}` (e.g., `Approve Project abc-123`).

**Acceptance Criteria:**
- 100% mutation route coverage.
- Audit entries include: actor, timestamp, IP, resource/table, action.
- Material updates include old and new values.

---

### Phase 3 — No Hard Delete + Simple Archival (P1)

**Goal:** No transactional records hard-deleted. Closed projects archived after configurable period.

**Tasks:**
1. Replace hard delete on `proposal_members` with archival/tombstone (add `archived_at` column, use soft delete).
2. Audit all tables for remaining hard deletes — apply `archived_at` pattern where missing.
3. Create `retention_settings` table with `project_retention_years` (default: 10).
4. Implement archival cron job:
   - Runs weekly
   - Finds projects with `project_status = 'Closed'` and `actual_end_date` older than `project_retention_years`
   - Skips projects where `on_hold = true`
   - Archives (sets `archived_at`) and logs audit event
   - Admin UI: Super Admin can toggle `on_hold` on individual projects (one checkbox on project details)

**Acceptance Criteria:**
- No hard delete remains for any transactional personal-data record.
- Archival is age-based and hold-aware.
- Archival events are logged in D6.

---

### Phase 4 — Electronic Record Integrity (P1/P2)

**Goal:** Official uploaded files have verifiable integrity and provenance.

**Tasks:**
1. Add `content_hash`, `uploaded_by`, `source_ip` columns to `proposal_documents`, `special_orders`, `project_reports`.
2. Compute SHA-256 server-side at upload time (in existing upload handlers).
3. Harden upload validation: reject non-PDF files by checking magic bytes (`%PDF-` header), not just extension.
4. Expose integrity metadata in privileged views/APIs (project details, report listing).

**Acceptance Criteria:**
- All official uploads have SHA-256 hash + uploader identity + source IP.
- Non-PDF files are rejected at upload.
- Integrity metadata visible in admin/director views.

---

### Phase 5 — Tests + Documentation (P2)

**Goal:** Controls are test-backed and auditable.

**Tasks:**
1. Add test coverage:
   - Authorization tests (unauthorized access → 403)
   - Mutation-to-audit tests (every mutation produces audit entry)
   - Archival tests (hold-aware, age-based)
   - Upload integrity tests (hash computed, magic bytes validated)
2. Document access-control matrix (which role can access which endpoints).
3. Document retention policy (how long records are kept, archival process).

**Acceptance Criteria:**
- Test suite covers all remediation controls.
- Access-control and retention documentation is current.

---

## Execution Sequence

| Sprint | Phases | Effort |
|---|---|---|
| Sprint 1 | Phase 1 (Access Control) + Phase 2 (Audit Trail) | ~3-4 days |
| Sprint 2 | Phase 3 (No Hard Delete + Archival) | ~2-3 days |
| Sprint 3 | Phase 4 (File Integrity) + Phase 5 (Tests + Docs) | ~2-3 days |

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Migration risk from adding columns | Use additive schema changes only; backfill existing records with safe defaults |
| Performance overhead from richer auditing | Add indexes on `created_at`, `user_id`, `table_affected` in `audit_logs` |
| Archival mistakes | Dry-run mode first (log what would be archived without actually archiving); controlled enablement |

---

## Done Definition

The remediation is complete when:
1. Access-control gaps are closed on all sensitive routes
2. All material mutations are captured in D6 audit trail
3. No hard delete remains; archival is age-based and hold-aware
4. Official electronic records have verifiable integrity/provenance
5. Tests and documentation provide repeatable compliance evidence
