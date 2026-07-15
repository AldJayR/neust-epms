# Project Reporting Milestones Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace anonymous reporting schedules with direct, typed project milestones so each required report is submitted once against its exact due date.

**Architecture:** This v1-only change resets reporting data rather than migrating it. A milestone belongs directly to a project and contains its report type, due date, and completion metadata. Report creation references a pending milestone; document upload atomically makes the report available and completes that milestone. There is no reporting frequency, report period, replacement upload, or schedule-header record.

**Tech Stack:** PostgreSQL, Drizzle ORM, Hono, Zod, React 19, TanStack Query/Start, Vitest.

---

### Task 1: Replace The Reporting Persistence Model

**Files:**
- Modify: `backend/src/db/schema/project-reporting-dates.ts`
- Delete: `backend/src/db/schema/project-reporting-schedules.ts`
- Modify: `backend/src/db/schema/project-reports.ts`
- Modify: `backend/src/db/schema/index.ts`
- Modify: `backend/src/db/relations.ts`
- Create: generated Drizzle migration under `backend/drizzle/`
- Test: `backend/src/modules/projects/projects.routes.test.ts`

**Step 1: Write failing schema/service tests.**

Cover creating an Ongoing project with typed milestones and rejecting a duplicate `(projectId, reportType, dueAt)` milestone.

**Step 2: Verify red.**

Run: `pnpm --dir backend test src/modules/projects/projects.routes.test.ts`

Expected: FAIL because activation still accepts frequency/due-date records without types.

**Step 3: Implement the smallest model.**

- Rename the effective table to `project_reporting_milestones`.
- Store `projectId`, `reportType`, `dueAt`, `reportId`, `completedAt`, and timestamps.
- Add a unique constraint for one report type/due-date obligation per project.
- Add nullable `milestoneId` to `project_reports` with a unique constraint so one milestone receives one report.
- Remove `periodStart`, `periodEnd`, and the schedule-header table.
- Generate a destructive v1 migration; do not retain old reporting data.

**Step 4: Verify green and commit.**

Run: `pnpm --dir backend test src/modules/projects/projects.routes.test.ts`

```bash
git add backend/src/db backend/drizzle backend/src/modules/projects/projects.routes.test.ts
git commit -m "feat: model project reporting milestones"
```

### Task 2: Activate Projects With Manual Milestones

**Files:**
- Modify: `backend/src/modules/projects/projects.schema.ts`
- Modify: `backend/src/modules/projects/projects.service.ts`
- Modify: `backend/src/modules/projects/activate.routes.ts`
- Modify: `backend/src/modules/projects/reporting.routes.ts`
- Test: `backend/src/modules/projects/projects.routes.test.ts`

**Step 1: Write failing route tests.**

Cover a Director activating an approved project with one or more typed milestones, rejection of an empty list, and rejection of duplicate milestones.

**Step 2: Verify red.**

Run: `pnpm --dir backend test src/modules/projects/projects.routes.test.ts`

Expected: FAIL because the API still requires `reportingFrequency` and persists anonymous dates.

**Step 3: Implement activation and schedule reads.**

- Replace `reportingFrequency` and `dueDates` with a non-empty `milestones` array of `{ reportType, dueAt }`.
- Permit only Progress, Terminal, and Final Accomplishment report types.
- Insert project milestones in the existing activation transaction.
- Return milestones with report linkage from `GET /projects/:id/reporting-schedule` while retaining the endpoint path for the frontend.

**Step 4: Verify green and commit.**

```bash
pnpm --dir backend test src/modules/projects/projects.routes.test.ts
git add backend/src/modules/projects backend/src/modules/projects/projects.routes.test.ts
git commit -m "feat: activate projects with reporting milestones"
```

### Task 3: Submit Exactly One Report Per Milestone

**Files:**
- Modify: `backend/src/modules/reports/reports.schema.ts`
- Modify: `backend/src/modules/reports/reports.service.ts`
- Modify: `backend/src/modules/reports/reports.routes.ts`
- Test: `backend/src/modules/reports/reports.routes.test.ts`

**Step 1: Write failing tests.**

Cover rejection for a foreign/missing/completed milestone, a report-type mismatch, a non-Ongoing project, and a second submission. Cover successful upload marking the selected milestone complete.

**Step 2: Verify red.**

Run: `pnpm --dir backend test src/modules/reports/reports.routes.test.ts`

Expected: FAIL because reports currently accept a project/type independently and create an empty record before upload.

**Step 3: Implement atomic report submission.**

- Accept `milestoneId`, not project ID/type/period, when starting submission.
- Derive project and report type from the selected milestone.
- Require membership, Ongoing status, and pending milestone state.
- Move report creation, file upload, and milestone completion into one server operation or retain a short-lived draft state that cannot count as submitted. Do not let an empty report close a project.
- Keep submitted milestones immutable: reject replacement uploads and repeat submission.
- Transition to Pending Closure only after both distinct closure milestones have completed reports.

**Step 4: Verify green and commit.**

```bash
pnpm --dir backend test src/modules/reports/reports.routes.test.ts
git add backend/src/modules/reports backend/src/modules/reports/reports.routes.test.ts
git commit -m "feat: link reports to required milestones"
```

### Task 4: Replace Activation And Submission UI

**Files:**
- Modify: `frontend/src/features/projects/components/activate-project-wizard.tsx`
- Modify: `frontend/src/features/projects/functions.ts`
- Modify: `frontend/src/features/projects/reporting-schedule.functions.ts`
- Modify: `frontend/src/features/projects/reporting-schedule-card.tsx`
- Modify: `frontend/src/features/reports/components/submit-report-modal.tsx`
- Modify: `frontend/src/features/reports/functions.ts`
- Modify: `frontend/src/features/reports/components/report-columns.tsx`
- Test: focused frontend tests alongside the modified components

**Step 1: Write failing UI tests.**

Cover activation payloads containing only MOA and typed milestones, no frequency selection, and opening report submission with a preselected milestone.

**Step 2: Verify red.**

Run the focused frontend Vitest files.

Expected: FAIL because the UI requires frequency and permits free-form project/type/period selection.

**Step 3: Implement minimal workflow UI.**

- Remove reporting-frequency controls and all period fields.
- Rename due dates to Reporting Milestones.
- Add Progress, Terminal, and Final Accomplishment milestone rows; make closure create the two separate rows with the same initial due date.
- Wire a milestone card Submit action to the report modal with `projectId` and `milestoneId` context.
- Display project, required report type, and due date as fixed context in the modal; retain only remarks and the required single PDF upload.
- Remove the project and report-type selectors and all period serialization.

**Step 4: Verify green and commit.**

```bash
pnpm --dir frontend test
git add frontend/src/features/projects frontend/src/features/reports
git commit -m "feat: submit reports from project milestones"
```

### Task 5: Verify The V1 Reset And End-to-End Invariants

**Files:**
- Modify: relevant tests only

**Step 1: Apply the generated migration to the v1 database.**

Run: `pnpm --dir backend db:migrate`

Expected: old reporting schedule/date/report period structures are replaced with milestones. No legacy data migration is attempted.

**Step 2: Run automated verification.**

```bash
pnpm --dir backend test
pnpm --dir backend typecheck
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend build
```

**Step 3: Manually verify the business flow.**

- Activate an approved project with Progress and both closure milestones.
- Submit the selected Progress milestone exactly once with a PDF.
- Confirm the right milestone completes and no other due date changes.
- Confirm duplicate/replacement/foreign milestone submissions fail.
- Confirm both closure milestones, each with a PDF, are required before Pending Closure.

**Step 4: Commit.**

```bash
git add backend frontend docs/plans/2026-07-15-project-reporting-milestones.md
git commit -m "test: verify project reporting milestone flow"
```
