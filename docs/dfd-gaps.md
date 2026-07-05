# DFD Gap Analysis

> Deep dive against revised DFD (9 processes, 35 sub-processes) and use cases (UC-1 through UC-9). Backend: 14 route files, 2 crons, 25 tables. Frontend: 25 route files, 27 feature files, 9 lib files.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| ✅ FULL | Backend endpoint + frontend UI fully aligned with DFD |
| ⚠️ PARTIAL | Implementation exists but has gaps or missing features |
| ❌ MISSING | Not implemented in backend, frontend, or both |
| 👁 Display Only | Frontend displays data; no user action needed |
| 🖥 Backend Only | Temporal/background process; no frontend needed |

---

## Process 1: Manage User Accounts

| # | Sub-process | Backend | Frontend | Status | Gap |
|---|-------------|---------|----------|--------|-----|
| **1.1** | Evaluate Pending Registrations | `GET /admin/users?isActive=false` | `UsersPage` with status filter | ✅ FULL | — |
| **1.2** | Authorize User Profile | `PATCH /admin/users/approve`, `PATCH /admin/users/{id}` | `UsersPage` approve/edit | ⚠️ PARTIAL | No reject endpoint. No duplicate merge endpoint or UI. |
| **1.3** | Finalize Activation | `insertAuditLog()` on approve | `UsersPage` toast on approve | ⚠️ PARTIAL | No `createNotification()` or email sent to activated user. |
| **1.4** | Generate User Roster | `GET /director/faculty`, `GET /auth/users/search` | `FacultyDirectoryPage`, `RetFacultyDirectoryPage` | ✅ FULL | — |
| **1.5** | Provision Account | `POST /admin/users` | `AddUserDialog` + `provisionDirectorFn` | ✅ FULL | Director provisioning via Add User button on UsersPage. |

---

## Process 2: Manage System Access

| # | Sub-process | Backend | Frontend | Status | Gap |
|---|-------------|---------|----------|--------|-----|
| **2.1** | Authenticate User | `POST /auth/login` (audit-logged, isActive check) | `LoginPage` | ✅ FULL | — |
| **2.2** | Process Self-Registration | `POST /auth/register` (rate-limited, duplicate check) | `RegisterPage` (2-step) | ✅ FULL | — |
| **2.3** | Generate Reset Verification Code | ❌ Missing | — | ❌ MISSING | No backend OTP endpoint. `password_reset_tokens` table unused. Supabase SDK used instead. |
| **2.4** | Validate Verification Code | ❌ Missing | `OtpVerificationPage` (uses Supabase SDK) | ⚠️ PARTIAL | Frontend page exists but validates via Supabase client-side, not server-side. |
| **2.5** | Update Password | ❌ Missing | `ResetPasswordPage` (uses Supabase SDK) | ⚠️ PARTIAL | Frontend page exists but updates via Supabase client-side, not server-side. |

---

## Process 3: Monitor Dashboard

| # | Sub-process | Backend | Frontend | Status | Gap |
|---|-------------|---------|----------|--------|-----|
| **3.1** | Generate Standard Dashboard | `GET /director/dashboard`, `GET /proposals/ret/dashboard-stats`, `GET /admin/stats` | `DirectorDashboardPage`, `RetDashboardPage`, `FacultyDashboardPage` | ✅ FULL | Minor: admin stats hardcodes `pendingApproval: 0`. |
| **3.2** | Generate Faculty Overview | `GET /director/faculty` with metrics | `FacultyDirectoryPage` with involvement cards | ✅ FULL | — |

---

## Process 4: Manage Project Proposals

| # | Sub-process | Backend | Frontend | Status | Gap |
|---|-------------|---------|----------|--------|-----|
| **4.1** | Review Proposal Submission | `POST /proposals` | `CreateProposalModal` | ⚠️ PARTIAL | No duplicate title/content check before insert. |
| **4.2** | Record Proposal Data | `POST /proposals` (validates + writes pending record) | `CreateProposalModal` (4-step wizard) | ✅ FULL | — |
| **4.3** | Route Proposal for Review | Status set to `Pending Review` | Toast on submit | ⚠️ PARTIAL | No receipt acknowledgment notification (`createNotification`) sent to project leader. |
| **4.4** | Process Proposal Resubmission | `PATCH /proposals/{id}`, `POST /proposals/{id}/submit` | `CreateProposalModal` edit mode | ✅ FULL | — |
| **4.5** | Process Proposal Withdrawal | `DELETE /proposals/{id}` | ❌ Missing | ⚠️ PARTIAL | Backend endpoint exists; no "Withdraw" button in frontend. |

---

## Process 5: Manage MOA Records

| # | Sub-process | Backend | Frontend | Status | Gap |
|---|-------------|---------|----------|--------|-----|
| **5.1** | Process MOA Registration | `POST /moas`, `POST /moas/upload`, `PATCH /moas/{id}` | `CreateMoaModal`, `EditMoaModal` | ⚠️ PARTIAL | Edit modal missing PDF re-upload field. Partner name field is disabled. |
| **5.2** | Review Linked Projects | `GET /moas/{id}/projects` | MOA Details page (linked projects column) | ✅ FULL | — |

---

## Process 6: Evaluate Project Proposal

| # | Sub-process | Backend | Frontend | Status | Gap |
|---|-------------|---------|----------|--------|-----|
| **6.1** | Retrieve Proposal Details | `GET /proposals/{id}`, `GET /director/projects/{id}` | `ProposalReviewPage`, `ProposalDetailsTab` | ✅ FULL | — |
| **6.2** | Process Chair Endorsement | `POST /proposals/{id}/review` (endorse/return/reject + comments) | Endorse/Return buttons + comment dialog | ✅ FULL | — |
| **6.3** | Process Director Approval | `POST /proposals/{id}/review` (approve/return/reject) | Approve/Return buttons | ⚠️ PARTIAL | Reject button missing in frontend (backend supports `"Rejected"` decision). |

---

## Process 7: Manage Projects

| # | Sub-process | Backend | Frontend | Status | Gap |
|---|-------------|---------|----------|--------|-----|
| **7.1** | Record Special Orders | `POST /special-orders`, `POST /special-orders/upload`, `PATCH /special-orders/{id}` | `ProjectDetailsPage` SO upload | ✅ FULL | — |
| **7.2** | Process Project Activation | `POST /projects/{id}/activate`, `POST /projects/{id}/link-moa`, `POST /projects/{id}/transition` | `ActivateProjectWizard` | ✅ FULL | — |
| **7.3** | Process Project Update | ❌ Missing | ❌ Missing | ❌ MISSING | No endpoint or UI for implementation progress notes on ongoing projects. |
| **7.4** | Monitor MOA Validity | `cron/moa-expiration.ts` (daily 01:00) | Dashboard shows expiring MOAs | ✅ FULL | Flags `Ongoing` projects as `Expired`. Sends notifications + email. Logs audit. |
| **7.5** | Update Linked MOA | `PATCH /moas/{id}` restores `Expired` → `Ongoing` | 🖥 Backend Only | ✅ FULL | Auto-syncs projects when MOA renewed. Clears expired flag. |
| **7.6** | Monitor Report Deadlines | `cron/report-overdue.ts` (daily 02:00) | Dashboard shows overdue count | ✅ FULL | Flags projects as `Overdue`. Notifies leaders + RET Chair. Logs audit. |
| **7.7** | Update Project Metrics | `GET /director/dashboard` (aggregates) | Dashboard read-only | 👁 Display Only | — |

---

## Process 8: Manage Project Reports

| # | Sub-process | Backend | Frontend | Status | Gap |
|---|-------------|---------|----------|--------|-----|
| **8.1** | Process Progress Report | `POST /reports` (validates project + sends email to Director) | `SubmitReportModal` (Progress type) | ✅ FULL | — |
| **8.2** | Process Overdue Report | `POST /reports` | `SubmitReportModal` | ⚠️ PARTIAL | Submitting a report does NOT clear the `Overdue` flag on the project. |
| **8.3** | Execute Project Closure | `POST /projects/{id}/close` (verifies FAR + Terminal) | `SubmitReportModal` (Closure — dual upload) | ✅ FULL | — |
| **8.4** | Update Report Metrics | `GET /reports/stats` | `ReportsPage` stats cards | 👁 Display Only | — |

---

## Process 9: Manage Activity Logs

| # | Sub-process | Backend | Frontend | Status | Gap |
|---|-------------|---------|----------|--------|-----|
| **9.1** | Retrieve Baseline Log | `GET /audit-logs` (paginated, UUID resolution) | `ActivityLogPage` | ✅ FULL | — |
| **9.2** | Generate Audit Trail | `GET /audit-logs` (search/filter) | `ActivityLogPage` filters + search | ⚠️ PARTIAL | (a) Viewing audit trail itself is not logged. (b) CSV export is empty placeholder. |
| **9.3** | Aggregate System Events | `insertAuditLog()` called across all routes + crons | 🖥 Backend Only | ✅ FULL | — |

---

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ FULL | 20 | 57% |
| ⚠️ PARTIAL | 10 | 29% |
| ❌ MISSING | 3 | 9% |
| 👁 Display Only | 2 | 6% |
| **Total** | **35** | **100%** |

---

## All Gaps — Priority Order

### HIGH PRIORITY (core workflow gaps)

| # | Gap | DFD Ref | Backend | Frontend | Effort |
|---|-----|---------|---------|----------|--------|
| 1 | **Project Implementation Updates** — no endpoint or UI for progress notes | 7.3 | New `POST /projects/{id}/updates` endpoint + table | New form/modal in project details | ~5h |
| 2 | **Proposal Withdrawal UI** — backend exists, no button | 4.5 | Endpoint exists | Add "Withdraw" button to proposal detail | ~1h |
| 3 | **Reject Decision Button** — backend supports, frontend omits | 6.3 | Endpoint accepts `"Rejected"` | Add Reject button to proposal review | ~1h |
| 4 | **Activation Notification** — user gets no email on approve | 1.3 | Add `createNotification()` in approve handler | None needed | ~30m |
| 5 | **Proposal Submission Acknowledgment** — no receipt sent | 4.3 | Add `createNotification()` in submit handler | None needed | ~30m |
| 6 | **Overdue Flag Clearance** — submitting report doesn't clear flag | 8.2 | Add `Overdue` → `Ongoing` transition in report handler | None needed | ~1h |

### MEDIUM PRIORITY (workflow completeness)

| # | Gap | DFD Ref | Backend | Frontend | Effort |
|---|-----|---------|---------|----------|--------|
| 7 | **Duplicate Title Check** — no check before proposal insert | 4.1 | Add duplicate check in `POST /proposals` | Warning dialog in create modal | ~2h |
| 8 | **Reject Endpoint** — no explicit reject for pending registrations | 1.2 | New `PATCH /admin/users/{id}/reject` | Reject button in users page | ~2h |
| 9 | **MOA Edit PDF Re-upload** — edit modal missing file upload | 5.1 | Add file upload support to `PATCH /moas/{id}` | Add file input to edit modal | ~2h |
| 10 | **Audit Trail Access Logging** — viewing logs goes unlogged | 9.2 | Add `insertAuditLog()` in `GET /audit-logs` handler | None needed | ~15m |
| 11 | **Admin Stats Pending Count** — hardcoded to 0 | 3.1 | Fix to count `isActive=false` users | None needed | ~15m |

### LOW PRIORITY (edge cases + polish)

| # | Gap | DFD Ref | Backend | Frontend | Effort |
|---|-----|---------|---------|----------|--------|
| 12 | **Duplicate User Merge** — no merge endpoint or UI | 1.2 | New merge endpoint + logic | Merge dialog in users page | ~6h |
| 13 | **Export CSV (Activity Log)** — empty placeholder | 9.2 | None needed | Implement `exportToCsv` | ~1h |
| 14 | **Export Reports Button** — no onClick handler | 8.4 | None needed | Implement CSV/PDF export | ~1h |
| 15 | **Settings Route Guard Mismatch** — sidebar shows for all, route is Super Admin only | — | None needed | Fix route guard or sidebar visibility | ~30m |
| 16 | **Super Admin Leak in Faculty/MOA Routes** — route guard allows, API rejects | — | Add Super Admin to `authorizeSessionUser` | None | ~15m |

---

## Backend-Only Issues

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | `password_reset_tokens` table unused | `schema/password-reset-tokens.ts` | Deprecate or migrate to server-side OTP flow |
| 2 | Password reset uses Supabase SDK directly | `auth.routes.ts` | Consider server-side implementation for DFD compliance |
| 3 | `pendingApproval: 0` hardcoded in admin stats | `admin.routes.ts:108` | Count `isActive=false` users |
| 4 | Audit trail viewing not logged | `audit.routes.ts` | Add `insertAuditLog()` call |
| 5 | Submitting report doesn't clear `Overdue` flag | `reports.routes.ts` | Check project status on report insert, transition if `Overdue` |

---

## Frontend-Only Issues

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | CSV export is empty placeholder | `activity-log-page.tsx:79` | Implement `exportToCsv` function |
| 2 | Export Reports button has no onClick | `reports-page.tsx:328` | Add handler + CSV generation |
| 3 | Settings route guard mismatch | `admin/settings/index.tsx` | Fix guard or sidebar visibility |
| 4 | Super Admin leak in Faculty/MOA routes | `faculty/index.tsx`, `moas/index.tsx` | Add to `authorizeSessionUser` or block in guard |
| 5 | Port inconsistency in ret.functions.ts | `ret.functions.ts` | ✅ Fixed (port 3000 → 3001) |
| 6 | Port inconsistency in faculty.functions.ts | `faculty.functions.ts` | ✅ Fixed (port 3000 → 3001) |
