# DFD Gap Analysis — Implementation Plan

**Date:** June 10, 2026
**Branch:** `feat/ret-chair-frontend-pages`
**Status:** Ready for execution

---

## Executive Summary

Deep dive analysis of the Level 1 DFD against actual implementation reveals **6 critical gaps**, **3 high gaps**, and **4 medium gaps**. Critical gaps are entirely missing sub-processes where the backend endpoint exists but no frontend form drives it, or both backend + frontend are missing. This plan addresses all gaps organized by priority.

---

## Priority Definitions

| Priority | Criteria |
|----------|----------|
| **P0** | End-to-end data flow completely broken — DFD process has no implementation |
| **P1** | Backend exists but frontend missing, or significant UX gap for users |
| **P2** | Missing audit trail, notifications, or secondary feedback loops |
| **P3** | Unused schema/tables that represent feature debt |

---

## P0 — Critical Gaps (End-to-End Flow Broken)

### GAP 01: Password Reset Flow (DFD 2.4–2.6)

**DFD spec:** User submits email → system generates OTP → sends via email → user submits OTP → system validates → user sets new password → system updates password hash + invalidates OTP

**Current state:**
- `password_reset_tokens` table schema exists (columns: id, userId, tokenHash, expiresAt, usedAt, createdAt)
- `InputOTP` UI component exists (`components/ui/input-otp.tsx`) but unused
- Login page has "Forgot password?" link that goes to `/login` (placeholder)
- No backend routes, no OTP logic, no email sending

**Tasks:**

#### Backend (auth.routes.ts or new password-reset.routes.ts)
- [ ] **B-01** Create `POST /auth/forgot-password` endpoint
  - Accept `{ email }` input
  - Look up user in `users` table by email
  - If user not found: return generic "If account exists, reset email sent" (do not reveal whether email exists)
  - Generate 6-digit OTP, hash it with SHA-256, store in `password_reset_tokens` with `expiresAt = now + 10 minutes`
  - Send OTP via Resend (existing `sendEmail` helper) or fallback to console log in dev
  - Return 200 with `{ message: "OTP sent" }`

- [ ] **B-02** Create `POST /auth/verify-otp` endpoint
  - Accept `{ email, otp }` input
  - Look up user by email, find matching `password_reset_tokens` record (not expired, not used)
  - Hash submitted OTP, compare to stored `tokenHash`
  - On success: return a short-lived verification token (valid 15 min) that authorizes password reset
  - On failure: return 400 `{ error: "Invalid or expired OTP" }`

- [ ] **B-03** Create `POST /auth/reset-password` endpoint
  - Accept `{ resetToken, newPassword }` input (resetToken is the verification token from B-02)
  - Verify resetToken is valid and not expired
  - Hash new password, update `users.password` via Supabase Admin client
  - Mark `password_reset_tokens.usedAt = now` (invalidate OTP)
  - Return 200 `{ message: "Password updated" }`

- [ ] **B-04** Add audit logging for password reset events
  - Log `forgot_password_request` event in `audit_logs`
  - Log `password_reset_success` event
  - Do NOT log the OTP or password hash

#### Frontend
- [ ] **F-01** Create `/forgot-password` route + `ForgotPasswordPage`
  - Email input form → calls `POST /auth/forgot-password`
  - On success: show "OTP sent" message, navigate to `/verify-otp`

- [ ] **F-02** Create `/verify-otp` route + `VerifyOTPPage`
  - 6-digit OTP input (use existing `InputOTP` component)
  - Accepts `email` from search params or session
  - On success: store verification token, navigate to `/reset-password`

- [ ] **F-03** Create `/reset-password` route + `ResetPasswordPage`
  - New password + confirm password form
  - Uses verification token from F-02 session
  - On success: show "Password updated" message, redirect to `/login`

- [ ] **F-04** Update `routes/login.tsx` — change "Forgot password?" link from `to="/login"` to `to="/forgot-password"`

- [ ] **F-05** Add route config in `main.tsx` or router for `/forgot-password`, `/verify-otp`, `/reset-password`

**Files affected:**
- `backend/src/routes/auth.routes.ts` (or new `password-reset.routes.ts`)
- `frontend/src/routes/login.tsx`
- `frontend/src/routes/forgot-password.tsx` (new)
- `frontend/src/routes/verify-otp.tsx` (new)
- `frontend/src/routes/reset-password.tsx` (new)
- `frontend/src/routeTree.gen.ts` (auto-generated)

---

### GAP 02: Reporting Schedule Management (DFD 7.3)

**DFD spec:** Director sets reporting frequency and dates for active projects; stored in `project_reporting_schedules` and `project_reporting_dates` tables

**Current state:**
- Tables exist with schema but **no endpoints** consume them
- `POST /projects` creates a project without a schedule
- No UI to set or view reporting schedules

**Tasks:**

#### Backend
- [ ] **B-05** Create `POST /projects/{id}/reporting-schedule` endpoint
  - Accept `{ frequency: "Monthly" | "Quarterly" | "Semestral" | "Annual", startDate, endDate }` (or similar)
  - Validate project exists and user has access (project leader or Director)
  - Insert into `project_reporting_schedules` table
  - Auto-generate `project_reporting_dates` rows based on frequency + date range
  - Return created schedule with all generated dates

- [ ] **B-06** Create `GET /projects/{id}/reporting-schedule` endpoint
  - Return existing schedule + dates for a project

- [ ] **B-07** Create `PATCH /projects/{id}/reporting-schedule` endpoint
  - Allow updating frequency, regenerating dates
  - Mark existing dates as superseded, generate new ones

- [ ] **B-08** Add `reportingSchedule` to project details response in `GET /director/projects/{proposalId}` and `GET /projects`

- [ ] **B-09** Add audit logging for schedule creation/update events

#### Frontend
- [ ] **F-06** Add "Set Reporting Schedule" button/action to `ProjectDetailsPage`
  - Visible to Director, RET Chair, and project leader
  - Opens a dialog or dedicated section

- [ ] **F-07** Create `ReportingScheduleDialog` component
  - Frequency selector (Monthly/Quarterly/Semestral/Annual)
  - Date range picker
  - Shows generated reporting dates preview before saving
  - Calls `POST /projects/{id}/reporting-schedule`

- [ ] **F-08** Display existing reporting schedule in `ProjectDetailsPage`
  - Show current frequency, next due date, overdue dates
  - Visual indicators for past due reports

- [ ] **F-09** Add server functions in `dashboard.functions.ts` or `projects.functions.ts`
  - `createReportingScheduleFn`, `getReportingScheduleFn`, `updateReportingScheduleFn`

**Files affected:**
- `backend/src/routes/projects.routes.ts` (or new `reporting-schedule.routes.ts`)
- `backend/src/db/schema/project-reporting-schedules.ts` (already exists)
- `backend/src/db/schema/project-reporting-dates.ts` (already exists)
- `frontend/src/features/director/project-details-page.tsx`
- `frontend/src/features/director/reporting-schedule-dialog.tsx` (new)
- `frontend/src/lib/dashboard.functions.ts` (or `projects.functions.ts`)

---

### GAP 03: Proposal Creation Form (DFD 4.1)

**DFD spec:** Faculty/RET Chair submit project documents, validate payload, record in D2, route for review

**Current state:**
- `POST /proposals` backend exists with full validation
- Frontend has "Start New Project Proposal" button in `RETDashboardPage` but it's a non-functional UI element (`href="#"` or onClick with no route)

**Tasks:**

#### Frontend
- [ ] **F-10** Create `/proposals/new` route + `ProposalCreatePage`
  - Multi-step form wizard:
    - Step 1: Project title, description, target beneficiaries
    - Step 2: Team members (add/remove proposal members)
    - Step 3: Partner organizations
    - Step 4: Target departments
    - Step 5: SDG alignment
    - Step 6: Upload proposal documents
    - Step 7: Review and submit
  - Uses existing form patterns (`react-hook-form` + `zod` validation)

- [ ] **F-11** Create `ProposalFormProvider` context
  - Form state management across multi-step wizard
  - Persist draft to localStorage on step changes
  - Resume from draft on page reload

- [ ] **F-12** Create `ProposalMemberPicker` component
  - Search users by name/email
  - Assign roles (Project Leader, Co-Leader, Member)
  - Remove members

- [ ] **F-13** Create `ProposalDocumentUpload` component
  - Reuse storage upload patterns from existing upload components
  - Support multiple file upload
  - Preview attached files

- [ ] **F-14** Create `ProposalSDGSelector` component
  - Display SDGs grid
  - Multi-select SDGs for the proposal

- [ ] **F-15** Create `ProposalBeneficiaryPicker` component
  - Select beneficiary sectors
  - Add custom beneficiary data

- [ ] **F-16** Add server functions in new `proposals.functions.ts`
  - `createProposalFn` → `POST /proposals`
  - `submitProposalFn` → `POST /proposals/{id}/submit`
  - `getProposalDraftFn` (local draft management)

- [ ] **F-17** Update `RETDashboardPage` — change "Start New Project Proposal" button to link to `/proposals/new`

- [ ] **F-18** Update `FacultyDashboard` (when created in GAP 06) — add "Start New Project Proposal" button for Faculty

**Files affected:**
- `frontend/src/routes/_authenticated/proposals/new.tsx` (new)
- `frontend/src/features/ret/proposal-create-page.tsx` (new)
- `frontend/src/features/ret/proposal-form-provider.tsx` (new)
- `frontend/src/features/ret/proposal-member-picker.tsx` (new)
- `frontend/src/features/ret/proposal-document-upload.tsx` (new)
- `frontend/src/features/ret/proposal-sdg-selector.tsx` (new)
- `frontend/src/features/ret/proposal-beneficiary-picker.tsx` (new)
- `frontend/src/lib/proposals.functions.ts` (new)
- `frontend/src/features/ret/ret-dashboard-page.tsx` (update button)
- `frontend/src/routeTree.gen.ts` (auto-generated)

---

### GAP 04: Report Submission Form (DFD 8.2)

**DFD spec:** Faculty/RET Chair verify active project, submit progress/terminal report documents, record in D5, receive acknowledgment

**Current state:**
- `POST /reports` backend exists with `{ projectId, reportType, remarks, storagePath, periodStart, periodEnd }`
- `ReportsPage` is **read-only** — lists reports but has no submission capability

**Tasks:**

#### Frontend
- [ ] **F-19** Create `/reports/new` route + `ReportSubmitPage`
  - Form fields:
    - Project selector (dropdown of projects user is a member of)
    - Report type (Progress / Final Accomplishment / Terminal)
    - Period start + end date pickers
    - Remarks textarea
    - File upload for report document
  - On submit: upload file to Supabase Storage, then call `POST /reports` with `storagePath`

- [ ] **F-20** Create `ReportUploadForm` component
  - File upload zone (drag-and-drop or click)
  - File preview for PDFs
  - File size + type validation (PDF, DOCX, XLSX, max 10MB)

- [ ] **F-21** Update `ReportsPage` — add "Submit Report" button (visible to Faculty and RET Chair)
  - Button links to `/reports/new`

- [ ] **F-22** Add server functions in `dashboard.functions.ts` or new `reports.functions.ts`
  - `submitReportFn` → upload file + `POST /reports`
  - `uploadReportDocumentFn` → Supabase Storage upload

**Files affected:**
- `frontend/src/routes/_authenticated/reports/new.tsx` (new)
- `frontend/src/features/director/report-submit-page.tsx` (new)
- `frontend/src/features/director/report-upload-form.tsx` (new)
- `frontend/src/features/director/reports-page.tsx` (update button)
- `frontend/src/lib/reports.functions.ts` (new)
- `frontend/src/routeTree.gen.ts` (auto-generated)

---

## P1 — High Gaps (Missing Frontend or Significant UX Gap)

### GAP 05: Faculty Dashboard Metrics (DFD 3.3)

**DFD spec:** `3.3 → Faculty — Project Metrics` — Faculty should see role-specific dashboard

**Current state:**
- `DashboardPage` (role-switched) shows a placeholder message for Faculty: "Faculty Dashboard — View Projects"
- No dedicated Faculty dashboard metrics

**Tasks:**

- [ ] **F-23** Create `FacultyDashboardPage` component
  - Metric cards: My Proposals (total, pending, approved), My Reports (submitted, pending)
  - Recent activity list (proposals status changes)
  - Quick actions: "Start New Proposal", "View My Reports"

- [ ] **B-10** Create `GET /faculty/dashboard` endpoint (or reuse existing endpoints)
  - Aggregate: my proposal count by status, my reports count, pending reviews
  - Return metrics object

- [ ] **F-24** Add server function `getFacultyDashboardFn` in `dashboard.functions.ts`

- [ ] **F-25** Update `DashboardPage` role-switch logic to render `FacultyDashboardPage` instead of placeholder

**Files affected:**
- `frontend/src/features/faculty/faculty-dashboard-page.tsx` (new)
- `backend/src/routes/director.routes.ts` (new endpoint or extend existing)
- `frontend/src/lib/dashboard.functions.ts`
- `frontend/src/routes/_authenticated/dashboard.tsx`

---

### GAP 06: Access Event Audit Logging (DFD 2.3)

**DFD spec:** `2.3 → D6 — Authentication Event Log` — login, logout, failed login, password reset events should be recorded

**Current state:**
- No login/logout events are written to `audit_logs`
- `insertAuditLog()` is called for state changes but never for authentication events

**Tasks:**

- [ ] **B-11** Add login event logging in `authMiddleware` or Supabase webhook
  - Log `login_success` with userId, ip, userAgent
  - Log `login_failed` with email (not userId), ip, userAgent, reason

- [ ] **B-12** Add logout event logging
  - Log `logout` with userId, ip, userAgent

- [ ] **B-13** Include `tableAffected` as `"auth"` or `"users"` for auth events
  - Use `actionType` values: `login_success`, `login_failed`, `logout`, `password_reset`

- [ ] **B-14** Add login/logout event display in `ActivityLogPage`
  - Show auth events in the audit log table with appropriate icons/badges

**Files affected:**
- `backend/src/middleware/auth.ts`
- `backend/src/lib/audit.ts` (or new `audit-auth.ts`)
- `frontend/src/features/admin/activity-log-page.tsx`

---

### GAP 07: Proposal Status Notifications (DFD 6.2→Faculty, 6.4→Faculty)

**DFD spec:** After RET Chair or Director makes evaluation decision, Faculty receives "Proposal Status & Feedback"

**Current state:**
- Status is stored in `proposals.status` column
- Faculty must manually check proposal status — no notification

**Tasks:**

- [ ] **F-26** Create `NotificationsBell` component in `AppShell` header
  - Show unread notification count badge
  - Click to open notification dropdown/panel

- [ ] **F-27** Create `notifications` table or use in-memory approach
  - Schema: `{ id, userId, type, title, message, read, createdAt, metadata }`
  - Types: `proposal_endorsed`, `proposal_approved`, `proposal_rejected`, `proposal_returned`, `report_submitted`

- [ ] **B-15** Create notification generation in evaluation handlers
  - After `POST /proposals/{id}/review`: create notification for proposal author
  - After `POST /proposals/{id}/submit`: create notification for RET Chair

- [ ] **B-16** Create `GET /notifications` and `PATCH /notifications/{id}/read` endpoints

- [ ] **F-28** Add server functions `getNotificationsFn`, `markNotificationReadFn`

- [ ] **F-29** Create `NotificationDropdown` component showing recent notifications
  - Mark as read on click
  - Link to relevant proposal/project detail page

**Files affected:**
- `backend/src/db/schema/notifications.ts` (new)
- `backend/src/routes/notifications.routes.ts` (new)
- `backend/src/routes/proposals.routes.ts` (add notification generation)
- `frontend/src/components/notifications-bell.tsx` (new)
- `frontend/src/components/notification-dropdown.tsx` (new)
- `frontend/src/features/layout/app-shell.tsx`
- `frontend/src/lib/notifications.functions.ts` (new)

---

## P2 — Medium Gaps (Audit, Notifications, Secondary Flows)

### GAP 08: Submission Acknowledgments (DFD 4.3, 8.2)

**DFD spec:** After proposal/report submission, system sends acknowledgment to Faculty/RET Chair

**Tasks:**

- [ ] **F-30** Show success toast/message after proposal submission (in-app acknowledgment)
- [ ] **F-31** Show success toast/message after report submission (in-app acknowledgment)
- [ ] **B-17** Send confirmation email after proposal submission (optional, uses Resend)
- [ ] **B-18** Send confirmation email after report submission (optional, uses Resend)

**Files affected:**
- `frontend/src/features/ret/proposal-create-page.tsx` (toast on success)
- `frontend/src/features/director/report-submit-page.tsx` (toast on success)
- `backend/src/routes/proposals.routes.ts` (email in submit handler)
- `backend/src/routes/reports.routes.ts` (email in create handler)

---

### GAP 09: Auto-Close on Terminal Report (DFD 8.3)

**DFD spec:** Terminal report submission evaluates if it triggers project closure and updates D4

**Current state:**
- `POST /projects/{id}/close` checks for required reports but must be called manually
- No link between terminal report submission and project status

**Tasks:**

- [ ] **B-19** In `POST /reports` handler: after recording terminal report, check if project now has both Final Accomplishment and Terminal reports
  - If yes: auto-update project status to `"Completed"` and set `completedAt`
  - If no: leave status unchanged
- [ ] **B-20** Add audit log for auto-closure event
- [ ] **B-21** Add `completedAt` field to projects schema (if not already present)

**Files affected:**
- `backend/src/routes/reports.routes.ts`
- `backend/src/db/schema/projects.ts` (if `completedAt` missing)

---

### GAP 10: Account Approval Notification (DFD 1.1→Faculty/RET Chair)

**DFD spec:** After Super Admin approves pending account, Faculty/RET Chair receives account status notification

**Tasks:**

- [ ] **B-22** In `PATCH /admin/users/approve` handler: send email to approved user
  - Email: "Your account has been approved. You can now log in."
  - Use Resend helper
- [ ] **F-32** Show success/error feedback in `BulkApproveDialog` (if not already shown)

**Files affected:**
- `backend/src/routes/admin.routes.ts`
- `frontend/src/features/admin/bulk-approve-dialog.tsx`

---

### GAP 11: Event Aggregation (DFD 9.1)

**DFD spec:** `9.1 → D6 — Aggregated Event Log` — consolidate raw events into structured log

**Current state:**
- Raw `audit_logs` are queried directly — no aggregation layer

**Tasks:**

- [ ] **B-23** Create `audit_log_aggregates` materialized view or summary table
  - Daily rollup: events by type, by user, by table
  - Refreshed on schedule (daily cron) or on-demand
- [ ] **B-24** Create `GET /audit-logs/summary` endpoint
  - Return aggregated data for dashboard charts
- [ ] **F-33** Update `ActivityLogPage` to show summary charts (daily trend, top actions)

**Files affected:**
- `backend/src/db/schema/audit-log-aggregates.ts` (new or materialized view)
- `backend/src/routes/audit.routes.ts`
- `frontend/src/features/admin/activity-log-page.tsx`

---

## P3 — Low (Feature Debt, Unused Schema)

### GAP 12: Proposal Comments (DFD 6.2, 6.4 feedback)

**DFD spec:** During evaluation, feedback/comments can be left on proposals

**Current state:**
- `proposal_comments` table exists with schema but no routes use it

**Tasks:**

- [ ] **B-25** Create `GET /proposals/{id}/comments` endpoint
- [ ] **B-26** Create `POST /proposals/{id}/comments` endpoint (RET Chair, Director only)
- [ ] **F-34** Add comments section to `ProposalReviewPage`

**Files affected:**
- `backend/src/routes/proposals.routes.ts` (or new `comments.routes.ts`)
- `frontend/src/features/director/proposal-review-page.tsx`

---

### GAP 13: InputOTP Component Usage

**Current state:**
- `InputOTP` component exists at `components/ui/input-otp.tsx` but is unused

**Tasks:**
- [ ] **F-35** Integrate `InputOTP` into `VerifyOTPPage` (part of GAP 01)

**Files affected:**
- `frontend/src/routes/verify-otp.tsx` (created in GAP 01)

---

## Implementation Sequencing

### Phase 1 — P0 Critical (Sprint Priority)
```
Week 1: GAP 01 (Password Reset) — backend + frontend
Week 1: GAP 03 (Proposal Creation Form) — frontend only (backend exists)
Week 2: GAP 04 (Report Submission Form) — frontend only (backend exists)
Week 2: GAP 02 (Reporting Schedule) — backend + frontend
```

### Phase 2 — P1 High (Next Sprint)
```
Week 3: GAP 05 (Faculty Dashboard)
Week 3: GAP 06 (Access Event Audit Logging)
Week 4: GAP 07 (Proposal Status Notifications)
```

### Phase 3 — P2 Medium (Backlog)
```
GAP 08: Submission Acknowledgments
GAP 09: Auto-Close on Terminal Report
GAP 10: Account Approval Notification
GAP 11: Event Aggregation
```

### Phase 4 — P3 Low (Future)
```
GAP 12: Proposal Comments
GAP 13: InputOTP Integration
```

---

## DFD Data Flow Coverage Matrix

| DFD Process | Sub-process | Backend | Frontend | Status |
|---|---|---|---|---|
| 1.0 | 1.1 Process User Approval | ✅ | ✅ | Covered |
| 1.0 | 1.2 Assign User Role | ✅ | ✅ | Covered |
| 1.0 | 1.3 Provision Director/Admin Profile | ✅ | ✅ | Covered |
| 1.0 | 1.4 Activate Approved User Profile | ✅ | ✅ | Covered |
| 1.0 | 1.5 Generate User Roster | ✅ | ✅ | Covered |
| 1.0 | 1.6 Record User Event | ✅ | — | Covered |
| 2.0 | 2.1 Process Account Registration | ✅ | ✅ | Covered |
| 2.0 | 2.2 Validate Login Credentials | ✅ | ✅ | Covered |
| 2.0 | 2.3 Record Access Event | ❌ | ❌ | **GAP 06** |
| 2.0 | 2.4 Process Password Reset | ❌ | ❌ | **GAP 01** |
| 2.0 | 2.5 Validate OTP | ❌ | ❌ | **GAP 01** |
| 2.0 | 2.6 Update Password | ❌ | ❌ | **GAP 01** |
| 3.0 | 3.1 Process Dashboard Query | ✅ | ✅ | Covered |
| 3.0 | 3.2 Compile Dashboard Data | ✅ | — | Covered |
| 3.0 | 3.3 Render Dashboard Metrics | ⚠️ | ⚠️ | **GAP 05** (Faculty missing) |
| 4.0 | 4.1 Validate Proposal Payload | ✅ | ❌ | **GAP 03** |
| 4.0 | 4.2 Record Proposal Data | ✅ | — | Covered |
| 4.0 | 4.3 Route Pending Proposal | ✅ | ⚠️ | Acknowledgment missing (**GAP 08**) |
| 4.0 | 4.4 Record Proposal Event | ✅ | — | Covered |
| 5.0 | 5.1 Validate MOA Details | ✅ | — | Covered |
| 5.0 | 5.2 Record MOA Data | ✅ | ✅ | Covered |
| 5.0 | 5.3 Route Verified MOA | ✅ | ⚠️ | No notification |
| 5.0 | 5.4 Record MOA Event | ✅ | — | Covered |
| 6.0 | 6.1 Retrieve Proposal Details | ✅ | ✅ | Covered |
| 6.0 | 6.2 Process RET Chair Decision | ✅ | ✅ | Covered |
| 6.0 | 6.3 Route Endorsed Proposal | ✅ | — | Covered |
| 6.0 | 6.4 Process Director Decision | ✅ | ✅ | Covered |
| 6.0 | 6.5 Record Evaluation Event | ✅ | — | Covered |
| 7.0 | 7.1 Validate Project Data | ✅ | — | Covered |
| 7.0 | 7.2 Initialize Active Project | ✅ | ✅ | Covered |
| 7.0 | 7.3 Store Reporting Schedule | ❌ | ❌ | **GAP 02** |
| 7.0 | 7.4 Route Project Context | ✅ | ✅ | Covered |
| 7.0 | 7.5 Record Project Event | ✅ | — | Covered |
| 8.0 | 8.1 Verify Active Project | ✅ | — | Covered |
| 8.0 | 8.2 Record Project Report | ✅ | ❌ | **GAP 04** |
| 8.0 | 8.3 Evaluate Project Closure | ⚠️ | — | Auto-close missing (**GAP 09**) |
| 8.0 | 8.4 Route Report Metrics | ✅ | — | Covered |
| 8.0 | 8.5 Record Report Event | ✅ | — | Covered |
| 9.0 | 9.1 Aggregate System Events | ❌ | ❌ | **GAP 11** |
| 9.0 | 9.2 Process Log Request | ✅ | ✅ | Covered |
| 9.0 | 9.3 Generate Audit Trail | ✅ | ✅ | Covered |

**Coverage:** 24/31 fully covered, 7 with gaps (2 critical, 3 high, 2 medium)

---

## Related Files Reference

### Existing Schema (already defined, some unused)
- `backend/src/db/schema/password-reset-tokens.ts` — D7, used in GAP 01
- `backend/src/db/schema/project-reporting-schedules.ts` — D4 extension, used in GAP 02
- `backend/src/db/schema/project-reporting-dates.ts` — D4 extension, used in GAP 02
- `backend/src/db/schema/proposal-comments.ts` — D2 extension, used in GAP 12
- `backend/src/db/schema/audit-logs.ts` — D6, used in GAP 06

### Existing Components (to reuse)
- `frontend/src/components/ui/input-otp.tsx` — reusable OTP input, used in GAP 01
- `frontend/src/components/ui/button.tsx` — standard button patterns
- `frontend/src/components/ui/dialog.tsx` — modal dialogs
- `frontend/src/features/admin/bulk-approve-dialog.tsx` — pattern for approval flows

### Existing Helpers (to reuse)
- `backend/src/lib/audit.ts` — `insertAuditLog()` for all audit events
- `backend/src/lib/email.ts` (or Resend integration) — for sending OTP, notifications
- `frontend/src/lib/supabase.server.ts` — Supabase admin client for password updates
