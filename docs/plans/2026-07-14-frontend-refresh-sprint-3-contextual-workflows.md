# Frontend Refresh Sprint 3: Contextual Workflows Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the existing Reports, MOA, Archives, and RET workflows clearer about scope, deadlines, filters, and recovery without changing the product model, route structure, or backend contracts.

**Architecture:** Continue using the current React, TanStack Router, TanStack Query, DataTablePage, and existing surface primitives. Add only small feature-level context wiring and one optional DataTablePage state extension so loaded, filtered, empty, and failed states are communicated honestly. Remove no-op or misleading controls where the current API does not support the promised behavior.

**Tech Stack:** React 19, TanStack Router, TanStack Query, TanStack Table, Tailwind CSS 4, existing shadcn/Base UI components, Lucide, date-fns.

---

## Sprint Boundary

This sprint is needed because the institutional refresh parent plan's data-heavy workflow task remains incomplete. The current code review found several small but consequential issues:

- Reports exposes an `Export Reports` button without an action.
- Report filters are not represented in active-filter state, and schedule `Submit` links lose project and milestone context.
- MOA expiry metrics are padded with decorative leading zeroes, and MOA creation invalidates a query key the repository does not use.
- Archive tables show search placeholders without search handlers, and Faculty users still trigger the unauthorized archive-MOA query in the background.
- RET Faculty Directory displays a hard-coded `0` and applies rank/load filters only to the currently loaded server page while pagination still reports the unfiltered total.
- RET Project Monitoring does not expose its `My Projects` state as an active filter and has limited workflow context around its table.

### Explicitly Out Of Scope

- No 2.0 redesign, global design-system rewrite, new UI package, or new visual language.
- No changes to existing routes, API response contracts, permissions, or dashboard defaults.
- No new export endpoint or invented export behavior.
- No proposal, authentication, administration, onboarding, or global-search redesign in this sprint.
- No backend filtering expansion for rank/load unless a separate API task is approved.
- No tests or TDD additions, per project direction. Verification is typecheck, build, diff inspection, and manual state review.

## Task 1: Expose Table Scope And Recovery State

**Files:**
- Modify: `frontend/src/components/custom/data-table-page.tsx`
- Modify: `frontend/src/features/reports/reports-page.tsx`
- Modify: `frontend/src/features/moa/moa-repository-page.tsx`
- Modify: `frontend/src/features/archives/components/archived-proposals-table.tsx`
- Modify: `frontend/src/features/archives/components/archived-projects-table.tsx`
- Modify: `frontend/src/features/archives/components/archived-moas-table.tsx`
- Modify: `frontend/src/features/ret/faculty-directory-page.tsx`
- Modify: `frontend/src/features/ret/project-monitoring-page.tsx`

**Step 1: Extend only the custom table wrapper.**

- Add optional `error` and `errorMessage` props to `DataTablePage` and forward them to the existing `DataTable` error handling.
- Add optional `activeFilterLabels` and `onClearFilters` props.
- Render a compact, responsive filter-context row above the table only when labels are supplied. Include a clearly named reset action when `onClearFilters` is available.
- Keep the underlying `frontend/src/components/ui/data-table.tsx` primitive unchanged.

**Step 2: Use the wrapper consistently.**

- Pass query errors from each affected feature instead of treating an error as an empty result.
- Pass labels for only the filters that actually affect the loaded result.
- Ensure reset actions clear local state and route search state together, then return to page one.
- Keep empty messages role- and scope-aware; do not display a generic success-like state for failed queries.

**Step 3: Keep the visual treatment restrained.**

- Use existing muted text, border, button, and semantic status tokens.
- Do not add a new filter-chip component, table toolbar system, or persistent global state.
- Preserve the current table density and pagination layout.

## Task 2: Make Report Submission Milestone-Aware

**Files:**
- Modify: `frontend/src/routes/_authenticated/reports/index.tsx`
- Modify: `frontend/src/features/reports/reports-page.tsx`
- Modify: `frontend/src/features/reports/hooks/use-reports-view.ts`
- Modify: `frontend/src/features/reports/components/submit-report-modal.tsx`
- Modify: `frontend/src/features/projects/reporting-schedule-card.tsx`

**Step 1: Preserve report route state while adding optional context.**

- Add optional validated report search values for `projectId`, report context, and milestone due date.
- Keep the existing `/reports` route and current role access checks unchanged.
- Do not add API parameters that the current reports endpoint does not understand.

**Step 2: Carry schedule context into the existing modal.**

- Update the reporting schedule `Submit` link to include the project ID, the existing milestone report type, and its actual due date.
- Map `Progress` to the existing Progress form and closure milestone types to the existing Project Closure form. Do not invent a new report type.
- Preselect the project and report mode when the modal opens from a schedule action.
- Show a small contextual line identifying the linked milestone and due date. Keep the period start/end fields user-entered because one due date does not define a reporting period.

**Step 3: Make submission validation and refresh behavior accurate.**

- Reject a period whose end precedes its start before creating a report.
- Keep the existing required-document rules: one PDF for Progress and both required PDFs for Project Closure.
- Preserve the current API sequence and avoid claiming atomic submission for the two closure reports.
- Invalidate the existing reports list and project queries after success so the table and schedule reflect the submission.
- Reset route-provided modal context after a completed or cancelled flow without changing navigation.

**Step 4: Remove the misleading export action.**

- Remove `Export Reports` from the page header and the reports pending skeleton because no download action is wired.
- Do not repurpose the existing email-report server function as an export; that is a different workflow.

**Step 5: Make loaded scope visible.**

- Include report tab and type-filter context in the active-filter labels.
- Reset the page when the type filter changes.
- Preserve the current 100-record client-loaded window unless the backend contract is explicitly expanded; avoid presenting client-window counts as a guaranteed global export or report total.

## Task 3: Clarify MOA Risk And Repository State

**Files:**
- Modify: `frontend/src/features/moa/moa-repository-page.tsx`
- Modify: `frontend/src/features/moa/components/create-moa-modal.tsx`

**Step 1: Correct the repository's operational signals.**

- Render the expiring-within-90-days metric as a number without `padStart`.
- Keep the existing Valid, Renewal Needed, and Expired status vocabulary.
- Add the selected status to active-filter context and provide a reset path for both search and status.
- Use the existing `daysToExpiry` value as urgency context without introducing arbitrary color rules or changing the API status enum.

**Step 2: Fix the verified post-create refresh bug.**

- Invalidate the repository query prefix actually used by `moaRepositoryQueryOptions`, `['dashboard', 'moas']`, after a successful create.
- Preserve the existing modal validation, including expiration date after signed-from date and PDF-only upload.
- Keep the current role restrictions and create flow unchanged.

**Step 3: Surface failure state without redesigning the page.**

- Pass the MOA query error into `DataTablePage`.
- Give the error state a concise recovery message; keep technical details in the existing error handling path.

## Task 4: Make Archives Honest And Role-Safe

**Files:**
- Modify: `frontend/src/features/archives/archives-page.tsx`
- Modify: `frontend/src/features/archives/components/archived-proposals-table.tsx`
- Modify: `frontend/src/features/archives/components/archived-projects-table.tsx`
- Modify: `frontend/src/features/archives/components/archived-moas-table.tsx`

**Step 1: Stop presenting unsupported archive search.**

- Remove `searchPlaceholder` from archive tables because `DataTablePage` receives no search handler and the archive API has no search parameter.
- Do not add client-only search over one server page; that would create the same misleading pagination problem found in RET Faculty Directory.
- Retain server pagination and sorting presentation as-is.

**Step 2: Prevent unauthorized background requests.**

- Only enable the archived MOA query for Director and RET Chair users.
- Keep the MOA tab hidden for other roles and avoid making a request merely because the page component renders.
- Preserve existing archive route access and restore permissions.

**Step 3: Add recovery and restore context.**

- Pass each archive query's error state into its table wrapper.
- Keep the existing restore confirmation, but describe the actual impact: the selected archived record will return to the active repository.
- Preserve the existing mutation loading behavior and query invalidation.
- If the restored record empties the current page, allow the existing table/pagination state to recover without inventing a new archive workflow.

## Task 5: Correct RET Directory And Monitoring Context

**Files:**
- Modify: `frontend/src/features/ret/faculty-directory-page.tsx`
- Modify: `frontend/src/features/ret/project-monitoring-page.tsx`

**Step 1: Remove fabricated directory metrics.**

- Replace `Faculty without Extension Projects: 0` with the existing server-backed `averageProjectsPerFaculty` metric, or remove the third metric if the current layout cannot present it clearly.
- Keep `Total Faculty` and `Active Faculty` tied to the existing response values.
- Do not fabricate missing-project counts on the client.

**Step 2: Stop implying global rank/load filtering.**

- Remove the rank and project-load popover controls from this server-paginated view because the backend endpoint does not accept those filters and the current implementation filters only the loaded page.
- Keep the supported Active/Pending server status tabs and search behavior.
- Replace the removed controls with concise scope copy if needed, explaining that the directory is scoped to the RET Chair's department/campus as supplied by the server.
- Leave a future backend-supported rank/load filter as a separate task, not hidden inside this visual refresh.

**Step 3: Improve Project Monitoring's next-action context.**

- Use the existing shared `PageHeader` style with a short subtitle explaining that the page surfaces project status, report recency, and closure exceptions.
- Include `My Projects` in active-filter context when selected, alongside search and status.
- Pass both project and dashboard query errors into their appropriate UI states; do not convert failed metrics into empty-looking values.
- Preserve the current `Department Projects`/`Campus Projects` labels, route search state, and status options.

## Task 6: Verification And Visual Acceptance

**Files:**
- Modify only files required by findings from the implementation review.

**Step 1: Run static verification.**

Run:

```bash
pnpm --filter frontend exec tsc --noEmit
pnpm --filter frontend build
git diff --check
```

Expected: TypeScript, production build, and whitespace checks complete successfully. Do not broaden this sprint into repository-wide formatting cleanup.

**Step 2: Manually inspect the affected states.**

- Reports opened normally, opened from a reporting-schedule Submit action, Progress submission, Closure submission, invalid date range, missing file, and failed request.
- MOA repository with no filter, search, each status, expiring values such as `3` and `12`, create success, invalid date range, and query failure.
- Archives as Faculty, Director, and RET Chair; each archive tab; no search affordance; empty page; query failure; restore confirmation; restore success and failure.
- RET Faculty Directory with active/pending tabs, search, zero results, and one-page results; confirm no fabricated metric and no partial-page rank/load claim.
- RET Project Monitoring with all projects, My Projects, each status, no results, query failure, and narrow mobile width.
- Check 360px, 768px, 1024px, and desktop widths for wrapped actions, table overflow, dialog content, focus visibility, and readable status text.

**Step 3: Review scope before integration.**

- Confirm no route paths, permissions, backend response contracts, dashboard defaults, or shadcn/Base UI primitives changed.
- Confirm no no-op controls, fabricated values, or unsupported global-filter claims remain in the affected screens.
- Keep this plan uncommitted until implementation and verification are complete.

## Acceptance Criteria

- A user can tell what report or milestone action they are taking before submitting.
- Report, MOA, archive, and RET filters communicate their actual scope and can be reset where supported.
- Unsupported search/export/filter controls are removed rather than left visually functional.
- MOA risk counts and RET metrics display real values without decorative padding or hard-coded placeholders.
- Archive queries respect role permissions and restore confirmation explains the resulting repository change.
- Query failures, empty results, loading states, and successful mutations are visually distinct and recoverable.
- The refresh remains compatible with the existing institutional palette, routes, APIs, and component library.
