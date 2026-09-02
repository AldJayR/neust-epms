# New DFD Compliance Implementation Plan

**Goal:** Align the NEUST-EPMS backend and frontend implementations with the updated Data Flow Diagrams specification in `docs/dfd - new.md`, closing all identified gaps across proposal evaluation, project activation, report processing, user management, and system notifications.

**Tech Stack:** Hono, Drizzle ORM, PostgreSQL/Supabase, TanStack Router/Query, React, Tailwind CSS, TypeScript, Vitest.

---

### Task 1: Implement Institutional Approval Scan Workflow (Process 6.3 & 6.4)

**DFD Target:** `Process 6.3 (Process Director Approval)`, `Process 6.4 (Record Institutional Approval)`, and `Process 7.1/7.2 (Project Activation Prerequisites)`.

**Files:**
- Modify: `backend/src/db/schema/proposals.ts`
- Modify: `backend/src/lib/types.ts`
- Modify: `backend/src/modules/proposals/proposal-review-policy.ts`
- Modify: `backend/src/modules/proposals/proposals.service.ts`
- Modify: `backend/src/modules/proposals/review.routes.ts`
- Modify: `backend/src/modules/projects/projects.service.ts`
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/features/director/action-center-page.tsx`
- Create / Modify: `frontend/src/features/director/components/institutional-approval-dialog.tsx`
- Test: `backend/src/modules/proposals/review.routes.test.ts`
- Test: `backend/src/modules/projects/projects.service.test.ts`

**Steps:**
1. Update proposal status constants and enum types to include `Institutionally Approved` (`institutionally_approved`).
2. Add column `institutionalApprovalDocPath` (and hash/timestamp) to `proposals` schema if tracking uploaded scan directly on the proposal.
3. Update `POST /proposals/:id/review`:
   - Director approval sets status to `Approved` (pending institutional sign-off), rather than immediately activating or considering the proposal fully institutionally cleared.
4. Add endpoint `POST /proposals/:id/institutional-approval`:
   - Restricted to `Director`.
   - Validates that proposal status is `Approved`.
   - Uploads scanned signed document to Supabase storage with SHA-256 hash.
   - Updates proposal status to `Institutionally Approved`.
   - Dispatches in-app notification to Project Leader.
   - Logs `Record Institutional Approval` event to `D6` (`audit_logs`).
5. Update `activateProject` in `projects.service.ts`:
   - Require proposal status to be `Institutionally Approved` before activation is permitted.
6. In frontend Director UI:
   - Provide "Upload Institutional Approval Scan" action for proposals in `Approved` status.
   - Add status badge and filters for `Institutionally Approved`.

---

### Task 2: Project Overdue Clearance and Late Closure Support (Process 8.2 & 8.3)

**DFD Target:** `Process 8.2 (Process Overdue Report)` and `Process 8.3 (Execute Project Closure)`.

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/src/modules/projects/projects.service.ts`
- Test: `backend/src/modules/reports/reports.service.test.ts`
- Test: `backend/src/cron/report-overdue.test.ts`

**Steps:**
1. In `uploadReportDocument` (`backend/src/modules/reports/reports.service.ts`):
   - When a report is uploaded for an `Overdue` project, check whether any remaining uncompleted reporting milestones have `dueAt < now()`.
   - If all overdue milestones are completed, automatically update `projects.projectStatus` from `Overdue` back to `Ongoing`.
   - Record an audit log entry in `D6` documenting the clearance of the overdue status.
2. In `uploadReportDocument` closure validation:
   - Allow projects with `projectStatus === 'Overdue'` (as well as `'Ongoing'`) to transition to `Pending Closure` when both Terminal and Final Accomplishment reports are uploaded.
3. In `closeProject` (`backend/src/modules/projects/projects.service.ts`):
   - Enforce that Director closure approval targets projects in `Pending Closure` status with valid closure reports.

---

### Task 3: Actor Notifications on Project Activation and Closure (Process 7.2.3 & 7.8)

**DFD Target:** `Process 7.2.3 (Create Active Project Record)` and `Process 7.8 (Approve Project Closure)`.

**Files:**
- Modify: `backend/src/modules/projects/projects.service.ts`
- Test: `backend/src/modules/projects/projects.service.test.ts`

**Steps:**
1. In `activateProject`:
   - Dispatch in-app notifications (`createNotification`) to:
     - Project Leader: `"Project Activated: Your project is now active and ongoing."`
     - Scoped RET Chair: `"Project Activated: Project '{title}' in your college has been activated."`
     - Director: Confirmation of activation.
2. In `closeProject`:
   - Dispatch in-app notifications (`createNotification`) to:
     - Project Leader: `"Project Closed: Your project closure has been approved by the Director."`
     - Scoped RET Chair: `"Project Closed: Project '{title}' has been officially closed."`
     - Director: Confirmation of project closure.

---

### Task 4: Upfront Special Order Collection in Proposal Wizard & Prevent Uploads in Project Details (Process 4.1, 4.2 & Process 7.1)

**DFD Target:** `Process 4.1 (Review Proposal Submission)`, `Process 4.2 (Record Proposal Data)`, and `Process 7.1 (Record Special Orders)`.

**Files:**
- Modify: `frontend/src/features/proposals/components/proposal-form.ts`
- Modify: `frontend/src/features/proposals/components/proposal-step-members.tsx`
- Modify: `frontend/src/features/proposals/hooks/use-proposal-wizard.ts`
- Modify: `frontend/src/features/proposals/components/create-proposal-modal.tsx`
- Modify: `frontend/src/features/projects/components/project-overview-card.tsx`
- Modify: `frontend/src/features/projects/helpers/project-details-helpers.ts`
- Modify: `backend/src/modules/proposals/crud.routes.ts`
- Modify: `backend/src/modules/proposals/proposals.service.ts`
- Test: `backend/src/modules/proposals/crud.routes.test.ts`
- Test: `frontend/src/features/projects/helpers/project-details-helpers.test.ts`

**Steps:**
1. **Migrate SO Upload to Proposal Creation Wizard**:
   - Update `proposal-step-members.tsx` and `use-proposal-wizard.ts` to include Special Order input fields (`soNumber`, `dateIssued`, PDF file) for each team member added to the proposal (copying the input and validation UX previously used on the Project Details page).
   - In `POST /proposals` (or during proposal creation submission transaction in `proposals.service.ts`), commit the uploaded Special Order files directly to `special_orders` table linked to `proposal_members.member_id` in `D2`.
2. **Prevent SO Uploads in Project Details Page Modal**:
   - In `frontend/src/features/projects/helpers/project-details-helpers.ts`, update `canUploadSpecialOrder` to return `false` (disallowing new uploads post-proposal creation).
   - In `ProjectOverviewCard.tsx`, update the Project Team / Manage SO dialog to be **view-only**:
     - Display member name, role, and the Special Order badge (`soNumber` + "View" button) for verified SOs uploaded during the proposal stage.
     - Remove inline file input / upload button; if a member has no SO attached, display a neutral badge (`"No Special Order Attached (Proposal Phase)"`) without upload triggers.

---

### Task 5: Admin Pending User Rejection UI (Process 1.2)

**DFD Target:** `Process 1.2 (Authorize User Profile - Rejection Branch)`.

**Files:**
- Modify: `frontend/src/features/admin/functions.ts`
- Modify: `frontend/src/features/admin/users-page.tsx`
- Modify: `frontend/src/features/admin/bulk-approve-dialog.tsx`
- Create: `frontend/src/features/admin/reject-user-dialog.tsx`
- Test: `frontend/src/features/admin/users-page.test.tsx`

**Steps:**
1. Add `rejectUserFn` in `frontend/src/features/admin/functions.ts` calling existing backend endpoint `PATCH /admin/users/:id/reject`.
2. Add a "Reject" button with a confirmation dialog in `UsersPage` (under Inactive / Pending filter) and in `BulkApproveDialog`.
3. Invalidate admin users query on successful rejection and display confirmation toast.

---

### Task 6: Comprehensive Verification & Regression Testing

**Steps:**
1. Run backend unit and integration tests: `pnpm --filter backend test`.
2. Run frontend unit and component tests: `pnpm --filter frontend test`.
3. Run backend and frontend typechecks (`tsc --noEmit`).
4. Perform end-to-end verification verifying:
   - Proposal creation with member Special Orders -> RET Chair endorsement -> Director approval -> Institutional approval scan upload -> Project activation with MOA -> Progress reporting -> Overdue clearance -> Closure submission -> Director closure approval.
