# DFD Gap Analysis

> Generated from deep dive analysis of backend (71 endpoints, 2 crons, 25 tables) and frontend (46 feature files, 39 server functions).

---

## Status Legend

| Status | Meaning |
|--------|---------|
| ✅ Done | Fully implemented (backend + frontend) |
| ⚠️ Partial | Backend exists but frontend missing, or incomplete implementation |
| ❌ Missing | Not implemented in either backend or frontend |
| 🔒 Out of Scope | DFD references but not required for current release |

---

## Process 1: Manage User Accounts

| Sub-process | Backend | Frontend | Status | Gap |
|---|---|---|---|---|
| **1.1 Process Pending Account** — approve/reject, assign roles, activate | `PATCH /admin/users/status`, `PATCH /admin/users/approve` | `UsersPage`, `BulkApproveDialog` | ✅ Done | — |
| **1.2 Provision Director/Admin Profile** — admin-provision new users | `POST /auth/users` | Not exposed in UI (backend-only) | ⚠️ Partial | No UI for Super Admin to directly provision a Director/Admin account. Currently done via backend only. |
| **1.3 Update Existing Role** — change a user's role | `PATCH /admin/users/approve` (combined with activation) | No standalone UI | ⚠️ Partial | No dedicated "Change Role" endpoint or UI. Role changes are coupled with activation in bulk approve. |
| **1.4 Generate Faculty Roster** — scope-filtered faculty list for RET Chair | `GET /director/faculty`, `GET /auth/users/search` | `FacultyDirectoryPage` (Director), `RetFacultyDirectoryPage` (RET Chair) | ✅ Done | — |
| **1.5 Duplicate user detection/merge** | ❌ Missing | ❌ Missing | ❌ Missing | DFD shows "Duplicate Alert" + "Merge Decision" flows. No detection or merge mechanism exists. |

---

## Process 2: Manage System Access

| Sub-process | Backend | Frontend | Status | Gap |
|---|---|---|---|---|
| **2.1 Validate Login Credentials** — login, session management | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | `LoginPage` | ✅ Done | — |
| **2.2 Process Self-Registration** — pending activation | `POST /auth/register` | `RegisterPage` (2-step) | ✅ Done | — |
| **2.3 Process Password Reset** — OTP flow | Supabase client-side (`resetPasswordForEmail`, `verifyOtp`, `updateUser`) | `ForgotPasswordPage`, `OtpVerificationPage`, `ResetPasswordPage` | ✅ Done | Uses Supabase SDK directly instead of custom backend endpoints. `password_reset_tokens` table exists but is unused. Functional but deviates from DFD's server-side OTP model. |

---

## Process 3: Monitor Dashboard

| Sub-process | Backend | Frontend | Status | Gap |
|---|---|---|---|---|
| **3.1 Compile Dashboard Metrics** — role-specific project/proposal metrics | `GET /director/dashboard`, `GET /proposals/ret/dashboard-stats` | `DirectorDashboardPage`, `RetDashboardPage`, `FacultyDashboardPage` | ✅ Done | — |
| **3.2 Generate Faculty Overview** — faculty activity ranking for Director | `GET /director/faculty`, `POST /director/email-report` | `FacultyDirectoryPage` | ✅ Done | — |

---

## Process 4: Manage Project Proposals

| Sub-process | Backend | Frontend | Status | Gap |
|---|---|---|---|---|
| **4.1 Submit New Proposal** — create with members, SDGs, sectors, documents | `POST /proposals`, `POST /proposals/{id}/documents/upload`, `POST /proposals/{id}/members` | `CreateProposalModal` (4-step wizard) | ✅ Done | — |
| **4.2 Process Proposal Resubmission** — revise returned proposals | `PATCH /proposals/{id}`, `POST /proposals/{id}/submit` | `CreateProposalModal` (edit mode) | ✅ Done | — |

---

## Process 5: Manage MOA Records

| Sub-process | Backend | Frontend | Status | Gap |
|---|---|---|---|---|
| **5.1 Record New MOA** — upload with validity dates | `POST /moas`, `POST /moas/upload` | `CreateMoaModal` | ✅ Done | — |
| **5.2 Update Existing MOA** — modify validity dates | `PATCH /moas/{id}` | ❌ Missing | ⚠️ Partial | Backend endpoint exists but no edit UI. Director cannot update MOA validity dates from the frontend. |
| **5.3 Review Linked Projects** — view projects per MOA | ❌ Missing | ❌ Missing | ❌ Missing | No endpoint returns which projects are linked to a specific MOA. No frontend view for this. DFD explicitly requires "Linked Project List" output. |

---

## Process 6: Evaluate Project Proposal

| Sub-process | Backend | Frontend | Status | Gap |
|---|---|---|---|---|
| **6.1 Process Chair Endorsement** — endorse/return with comments | `POST /proposals/{id}/review` | `ProposalReviewPage`, `ProposalDetailsTab` | ✅ Done | — |
| **6.2 Process Director Approval** — approve/return with comments | `POST /proposals/{id}/review` | `ProposalReviewPage`, `ProposalDetailsTab` | ✅ Done | — |
| **Notify project leader on decision** | ❌ Missing | ❌ Missing | ❌ Missing | No in-app notification or email sent to project leaders when their proposal is endorsed, approved, returned, or rejected. The review route does not call `createNotification()`. |

---

## Process 7: Manage Projects

| Sub-process | Backend | Frontend | Status | Gap |
|---|---|---|---|---|
| **7.1 Record Special Orders** — upload per member | `POST /special-orders`, `POST /special-orders/upload` | `ProjectDetailsPage` (SO upload) | ✅ Done | — |
| **7.2 Activate Project** — link MOA + reporting schedule | `POST /projects/{id}/activate`, `POST /projects/{id}/transition` | `ActivateProjectWizard` | ✅ Done | — |
| **7.3 Record Project Updates** — implementation updates | ❌ Missing | ❌ Missing | ❌ Missing | No endpoint or UI for recording general progress notes/milestones on ongoing projects. Only status transitions exist. |
| **7.4 Monitor MOA Validity** — temporal: expiry alerts | `cron/moa-expiration.ts` (daily 01:00) | Dashboard shows expiring MOAs | ⚠️ Partial | Cron sends notifications but does NOT: (a) flag the project record in `projects` table, (b) write audit log entry. Frontend shows a list but no "View All" navigation works. |
| **7.5 Update Linked MOA** — sync on renewal | ❌ Missing | ❌ Missing | ❌ Missing | When an MOA is updated/renewed, linked projects don't get the new MOA reference. No auto-sync mechanism exists. |
| **7.6 Monitor Report Deadlines** — temporal: overdue alerts | `cron/report-overdue.ts` (daily 02:00) | Project monitoring shows overdue count | ⚠️ Partial | Cron sends notifications but does NOT: (a) flag the project record in `projects` table, (b) write audit log entry. |

---

## Process 8: Manage Project Reports

| Sub-process | Backend | Frontend | Status | Gap |
|---|---|---|---|---|
| **8.1 Process Progress Report** — submit interim reports | `POST /reports` | `SubmitReportModal` (Progress type) | ✅ Done | — |
| **8.2 Execute Project Closure** — Terminal + FAR | `POST /reports`, `POST /projects/{id}/close` | `SubmitReportModal` (Closure type — dual upload) | ✅ Done | — |
| **8.3 Update Report Metrics** — aggregation | `GET /reports`, `GET /reports/stats` | `ReportsPage` (stats + table) | ✅ Done | — |

---

## Process 9: Manage Activity Logs

| Sub-process | Backend | Frontend | Status | Gap |
|---|---|---|---|---|
| **9.1 Aggregate System Events** — immutable audit records | `insertAuditLog()` called across all routes | N/A (backend-only) | ✅ Done | — |
| **9.2 Generate Audit Trail** — filtering + search | `GET /audit-logs`, `GET /audit-logs/stats` | `ActivityLogPage` | ✅ Done | Export CSV is placeholder (empty function body). |

---

## Summary

| Status | Count | Items |
|---|---|---|
| ✅ Done | 18 | P1.1, P1.4, P2.1, P2.2, P2.3, P3.1, P3.2, P4.1, P4.2, P5.1, P6.1, P6.2, P7.1, P7.2, P8.1, P8.2, P8.3, P9.1, P9.2 |
| ⚠️ Partial | 5 | P1.2, P1.3, P5.2, P7.4, P7.6 |
| ❌ Missing | 6 | P1.5, P5.3, P6 notify, P7.3, P7.5, P9.2 export |

---

## Missing Items — Priority Order

### High Priority (core workflow gaps)

| # | Gap | DFD Ref | Backend | Frontend | Effort |
|---|---|---|---|---|---|
| 1 | **Evaluation notifications to project leaders** | P6.1/6.2 | Add `createNotification()` call in review route | None needed (existing notification dropdown) | ~1h |
| 2 | **MOA Edit UI** | P5.2 | Endpoint exists (`PATCH /moas/{id}`) | Add edit modal to MOA repository page | ~2h |
| 3 | **MOA Linked Projects view** | P5.3 | Add `GET /moas/{id}/projects` endpoint | Add linked projects tab/card to MOA detail | ~3h |

### Medium Priority (temporal process gaps)

| # | Gap | DFD Ref | Backend | Frontend | Effort |
|---|---|---|---|---|---|
| 4 | **Cron audit logging** | P7.4/7.6 | Add `insertAuditLog()` calls in both crons | None needed | ~30m |
| 5 | **Cron project flagging** | P7.4/7.6 | Update `projects.project_status` in both crons | None needed | ~1h |
| 6 | **Project Implementation Updates** | P7.3 | Add `POST /projects/{id}/updates` endpoint + table | Add updates form/tab to project details | ~4h |

### Low Priority (edge cases)

| # | Gap | DFD Ref | Backend | Frontend | Effort |
|---|---|---|---|---|---|
| 7 | **Auto-sync on MOA renewal** | P7.5 | Add hook on `PATCH /moas/{id}` to update linked projects | None needed | ~2h |
| 8 | **Duplicate user detection/merge** | P1.5 | Add detection endpoint + merge logic | Add merge UI to user management | ~4h |
| 9 | **Export CSV (Activity Log)** | P9.2 | None needed | Implement `exportToCsv` function | ~1h |
| 10 | **Export Reports button** | P8.3 | None needed | Add onClick handler + CSV/PDF generation | ~1h |

---

## Frontend-Only Issues

| # | Issue | File | Fix |
|---|---|---|---|
| 1 | **Settings route guard mismatch** | `admin/settings/index.tsx` | Route is Super Admin only but sidebar shows for all roles. Either restrict sidebar or open route to all roles. |
| 2 | **Super Admin leak in Faculty/MOA routes** | `faculty/index.tsx`, `moas/index.tsx` | Route guards allow Super Admin but API rejects them. Add Super Admin to `authorizeSessionUser` or block in route guard. |
| 3 | **Port inconsistency** | `ret.functions.ts`, `faculty.functions.ts` | ✅ Fixed — changed port 3000 to 3001. |
| 4 | **Placeholder buttons** | Various | `exportToCsv` (activity-log), Export Reports (reports-page), View Details/Edit User (users-page), View All (dashboard) — all need implementations. |

---

## Backend-Only Issues

| # | Issue | File | Fix |
|---|---|---|---|
| 1 | **`password_reset_tokens` table unused** | `schema/password-reset-tokens.ts` | Table exists but password reset uses Supabase SDK directly. Consider deprecating or migrating to server-side OTP. |
| 2 | **Process 1.3 no standalone role-change endpoint** | `admin.routes.ts` | Role changes coupled with activation. Add dedicated `PATCH /admin/users/{id}/role` endpoint. |
