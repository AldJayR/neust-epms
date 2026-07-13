# Institutional Operational Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modernize the frontend into a calmer, credible institutional operations tool while retaining the existing component library, routing, and NEUST visual identity.

**Architecture:** Keep the existing React, Tailwind, shadcn, and Base UI foundations. Consolidate current visual values into semantic tokens, simplify global surfaces, and use the existing page/card/table primitives to make each workflow lead with its next operational decision. This is a targeted refresh, not a design-system rewrite or framework migration.

**Tech Stack:** React 19, TanStack Router, TanStack Query, TanStack Table, Tailwind CSS 4, Base UI, Lucide, Vitest, Testing Library.

---

## Scope And Principles

- Preserve the current sea/lagoon/palm institutional palette, but make it the source for all semantic colors.
- Remove decorative glass, texture, excessive gradients, fabricated data, and template-style dashboard repetition.
- Preserve the current component inventory unless a focused split reduces unclear component responsibilities.
- Treat responsive layout, keyboard access, accurate state communication, and useful empty/error states as part of the visual refresh.
- Do not add a new design-token framework, UI package, or a second visual system.

## Task 1: Establish The Global Visual Baseline

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/routes/__root.tsx`

**Step 1: Write failing token/theme tests where current test infrastructure permits**

- Add focused tests for the root theme selection behavior if `__root.tsx` is testable in the current route test setup.
- Otherwise record manual visual checks for both theme variants in this plan's verification checklist; do not introduce a test harness solely for CSS tokens.

**Step 2: Remove conflicting global styling**

- Remove the duplicate `tw-animate-css` import.
- Remove the forced-light theme behavior that overwrites a user preference in `__root.tsx`.
- Retain system/user theme support only if all primary surfaces can consume semantic tokens. If dark mode is intentionally deferred, remove inactive dark-mode behavior rather than leaving contradictory support.

**Step 3: Consolidate semantic tokens**

- Make the sea/lagoon/palm palette the source for `primary`, `accent`, `ring`, chart colors, and semantic status values.
- Define semantic success, warning, danger, and information foreground/surface/border values in `styles.css`.
- Preserve existing Tailwind token names so components can migrate incrementally.

**Step 4: Simplify global presentation**

- Replace the multi-layer gradient, fixed texture grid, and decorative page overlays with one restrained neutral/sea-tinted application background.
- Reduce default card shadow depth and remove blur from generic page surfaces.
- Reserve blur/elevation for dialogs, popovers, and menus where depth conveys an actual stacking relationship.

**Step 5: Verify the baseline**

Run:
```bash
pnpm --filter frontend check
```

Expected: Biome completes without errors.

Manually inspect light and dark theme views for login, dashboard, a table, a dialog, and a menu. Confirm contrast and focus rings remain visible.

## Task 2: Refine Shared Layout And Interaction Primitives

**Files:**
- Modify: `frontend/src/components/layout/app-shell.tsx`
- Modify: `frontend/src/components/custom/page-header.tsx`
- Modify: `frontend/src/components/custom/page-card.tsx`
- Modify: `frontend/src/components/custom/data-table-page.tsx`
- Modify: `frontend/src/components/ui/data-table.tsx`
- Modify: `frontend/src/components/ui/button.tsx`
- Modify: `frontend/src/components/ui/status-badge.tsx`
- Modify: `frontend/src/components/custom/metric-card.tsx`
- Test: component tests adjacent to changed components where present; otherwise create focused tests under the relevant component directory.

**Step 1: Write failing accessibility and state tests**

- Add a test proving the skip link targets a focusable main landmark.
- Add tests for interactive table actions being keyboard reachable and named.
- Add tests for status badges rendering textual status alongside semantic styling.

**Step 2: Implement responsive shell behavior**

- Put `id="main-content"` on the actual main landmark or make the skip target focusable.
- Update `PageHeader` to stack title and actions on small screens, with action groups that can wrap and become full width when required.
- Update `DataTablePage` so search and filters wrap and search becomes full width at narrow widths.

**Step 3: Clarify visual primitives**

- Standardize page cards around flatter surfaces, consistent border contrast, and consistent spacing.
- Increase icon-only and compact interactive controls toward 40-44px targets without making dense table rows impractical.
- Replace hard-coded status colors with semantic tokens.
- Make status labels communicate meaning without requiring color interpretation.

**Step 4: Narrow metric-card responsibilities**

- Separate general metric display from faculty/contributor summary presentation, or reduce the existing component API to clear independent variants.
- Remove fixed card heights, fabricated avatars, raw green trend colors, and oversized decorative numeric treatment.
- Retain loading states but make them match the rendered composition.

**Step 5: Verify**

Run:
```bash
pnpm --filter frontend test
pnpm --filter frontend check
```

Expected: tests and static checks pass. Test at 360px, 768px, 1024px, and desktop widths, including keyboard navigation through skip link, tables, filters, dialogs, and icon buttons.

## Task 3: Make Dashboards Decision-Led

**Files:**
- Modify: `frontend/src/features/dashboard/director/director-dashboard-page.tsx`
- Modify: `frontend/src/features/faculty/faculty-dashboard-page.tsx`
- Modify: `frontend/src/features/ret/ret-dashboard-page.tsx`
- Modify: relevant chart components under `frontend/src/features/projects`
- Modify: relevant action-center components under `frontend/src/features/action-center`
- Test: dashboard tests adjacent to affected feature modules.

**Step 1: Write failing behavior tests**

- Add a test that an unscoped director dashboard uses all-campus data by default.
- Add tests that displayed action/metric destinations have usable links when corresponding list routes exist.
- Add a test that activity content is not silently clipped.

**Step 2: Improve information hierarchy**

- Add short, role-specific subtitles explaining each dashboard's operational scope.
- Lead with one prioritized action surface such as review backlog, reporting deadline, MOA expiry, or activation blocker.
- Keep secondary metrics below that action area and link them to filtered underlying work when a route exists.

**Step 3: Correct dashboard data presentation**

- Default campus scope to All campuses unless a documented user-specific scope is required; visibly label any scope filter.
- Replace fixed-height, `overflow-hidden` activity/MOA panels with bounded scroll regions or concise lists paired with a View all route.
- Use priority/due state for emphasis rather than rotating arbitrary dot colors.

**Step 4: Verify**

Run dashboard tests and manually inspect empty, loading, and populated states for each role.

## Task 4: Make Data-Heavy Workflows Contextual

**Files:**
- Modify: `frontend/src/features/reports/reports-page.tsx`
- Modify: `frontend/src/features/reports/components/submit-report-modal.tsx`
- Modify: `frontend/src/features/projects/reporting-schedule-card.tsx`
- Modify: `frontend/src/features/moa/moa-repository-page.tsx`
- Modify: `frontend/src/features/archives/archives-page.tsx`
- Modify: `frontend/src/features/archives/components/archived-*.tsx`
- Modify: `frontend/src/features/ret/faculty-directory-page.tsx`
- Modify: `frontend/src/features/ret/project-monitoring-page.tsx`
- Test: feature tests adjacent to these modules.

**Step 1: Write failing state tests**

- Add tests for active filter display and clear-filter actions.
- Add tests for schedule-led report preselection.
- Add tests for archive restoration context and accurate archive table search visibility.
- Add tests ensuring server-paginated filters are not presented as global when applied only locally.

**Step 2: Make workflow context visible**

- Reports: preselect a scheduled report where the initiating action provides context; show due period and required files.
- MOAs: make expiring agreements and applied status scope explicit; never pad operational counts with decorative leading zeros.
- Archives: show archive actor, reason, date, linked record context, and concise restore impact before confirmation.
- RET: surface monitoring exceptions and workload context instead of only generic metrics and tables.

**Step 3: Remove misleading controls and state**

- Implement exports with scope/progress/error feedback or remove them until supported.
- Pass every active filter to shared table state and provide a visible reset action.
- Move filter/count calculations to the server when pagination is server-side, or label the result scope honestly.
- Replace generic empty states with role- and filter-aware recovery guidance.
- Use responsive metric grids rather than fixed horizontal rows.

**Step 4: Verify**

Run feature tests. Manually test zero results, active filters, reset filters, paginated results, report submission entry points, and archive restore confirmation.

## Task 5: Clarify Proposal Creation And Review

**Files:**
- Modify: `frontend/src/features/proposals/proposal-lifecycle-stepper.tsx`
- Modify: `frontend/src/features/proposals/proposal-review-page.tsx`
- Modify: `frontend/src/features/proposals/components/proposal-wizard-header.tsx`
- Modify: `frontend/src/features/proposals/components/proposal-step-requirements.tsx`
- Modify: `frontend/src/features/proposals/components/create-proposal-modal.tsx`
- Modify: `frontend/src/features/proposals/components/proposal-review-document-pane.tsx`
- Modify: `frontend/src/features/proposals/components/comments-tab.tsx`
- Modify: `frontend/src/features/proposals/components/pdf-viewer/pdf-toolbar.tsx`
- Test: `frontend/src/features/proposals/helpers/proposal-review-helpers.test.ts`
- Test: `frontend/src/features/proposals/helpers/proposal-wizard-helpers.test.ts`

**Step 1: Write failing lifecycle and error-state tests**

- Add tests for returned and rejected proposals never rendering as approved/completed.
- Add a test that a failed proposal review query renders a recoverable error state rather than returning blank content.
- Add tests that comment guidance changes for users without annotation permission.

**Step 2: Implement accurate proposal states**

- Model returned and rejected statuses as terminal exception states, preserving the last valid lifecycle stage.
- Render an error state with Back and Retry actions before handling no-data paths.
- Use a compact accessible stepper with completed/current/error states instead of only “Step X of Y.”

**Step 3: Improve review ergonomics**

- Remove repeated tooltip/checklist descriptions and retain concise action-oriented validation feedback.
- Add unsaved-discard confirmation when proposal creation state would be lost.
- Use viewport-relative review panes. On small screens, move details/comments into tabs or a sheet so the document remains primary.
- Make comment instructions reflect current role and proposal status.

**Step 4: Verify**

Run:
```bash
pnpm --filter frontend test -- proposal-review proposal-wizard
pnpm --filter frontend check
```

Expected: proposal helper tests and checks pass. Manually inspect review flows at laptop and mobile widths.

## Task 6: Polish Authentication And Administration

**Files:**
- Modify: `frontend/src/components/custom/auth-page-layout.tsx`
- Modify: `frontend/src/components/custom/auth-step-indicator.tsx`
- Modify: `frontend/src/components/rhf-auth-fields.tsx`
- Modify: `frontend/src/routes/login.tsx`
- Modify: `frontend/src/routes/register.tsx`
- Modify: `frontend/src/routes/register.account.tsx`
- Modify: `frontend/src/routes/forgot-password.index.tsx`
- Modify: `frontend/src/routes/forgot-password.otp.tsx`
- Modify: `frontend/src/routes/forgot-password.reset.tsx`
- Modify: `frontend/src/features/admin/users-page.tsx`
- Modify: `frontend/src/features/admin/activity-log-page.tsx`
- Modify: `frontend/src/features/admin/settings-page.tsx`
- Test: auth/admin component or route tests adjacent to the affected files.

**Step 1: Write failing accessibility and recovery tests**

- Add tests for persistent password-reset progress and consistent cancel/back navigation.
- Add tests for native registration-step buttons and visible step labels.
- Add tests for password visibility `aria-pressed` state, OTP description association, and named admin filters.
- Add a settings validation test for out-of-range input.

**Step 2: Implement the refresh**

- Keep all auth screens within the shared auth layout, including successful registration.
- Apply the shared restrained surface system to auth pages rather than forcing standalone hard-coded colors.
- Add an accessible reset progress indicator and clear recovery navigation.
- Replace role-button spans with native buttons and explicit “Step 1 of 2” style labels.
- Remove no-op activity-log export or implement it with accurate feedback.
- Use server-backed administration filters if the results are server-paginated.
- Replace implementation jargon in settings with administrator-facing language and inline validation feedback.

**Step 3: Verify**

Run auth/admin tests and test every auth screen at mobile width using keyboard-only interaction.

## Task 7: Remove Prototype Artifacts And Consolidate Feedback

**Files:**
- Modify: `frontend/src/components/layout/app-sidebar.tsx`
- Modify: `frontend/src/components/role-sidebar.tsx`
- Modify: `frontend/src/components/custom/onboarding.tsx`
- Modify: `frontend/src/components/custom/global-search.tsx`
- Modify: `frontend/src/components/custom/notification-dropdown.tsx`
- Modify: `frontend/src/routes/__root.tsx`
- Test: related component tests where available.

**Step 1: Write failing tests for user-facing artifacts**

- Add tests for authenticated loading/anonymous profile states without placeholder identities.
- Add tests that global-search recents navigate to the stored destination and can be cleared.
- Add a test that user-facing error notifications do not render raw technical error messages.

**Step 2: Implement focused cleanup**

- Remove placeholder profile names, initials, faux contributor avatars, and fabricated operational values.
- Replace generic onboarding copy with role-specific first actions, or defer onboarding until those actions are defined.
- Store selected result destinations and titles in search recents, provide clear-recents, and use platform-appropriate keyboard shortcut text.
- Consolidate duplicated online/offline toast markup and accurately describe connectivity state.
- Render safe, actionable error copy while retaining technical details for logging.

**Step 3: Verify**

Run related tests and manually verify signed-in, loading, offline, empty-recent, and failed-request states.

## Task 8: Full Quality Pass

**Files:**
- Modify only files required to resolve findings from the checks below.

**Step 1: Audit for visual drift**

Search for raw hex colors, hard-coded Tailwind semantic colors, text below 11px, fixed content heights, placeholder identities, and no-op actions. Replace only instances that conflict with this plan's semantic baseline or accessibility goals.

**Step 2: Run complete verification**

Run:
```bash
pnpm --filter frontend test
pnpm --filter frontend check
pnpm --filter frontend build
```

Expected: all tests, static checks, and production build complete successfully.

**Step 3: Visual acceptance review**

Review desktop and mobile states for:

- Login, registration, and password reset.
- Director, faculty, and RET dashboards.
- Tables, filters, pagination, dialogs, and empty/error states.
- Proposal creation and PDF review.
- Report submission, archive restoration, and MOA monitoring.
- Keyboard focus, skip navigation, status badges, and icon-only controls.

## Acceptance Criteria

- The app uses one coherent institutional color, surface, elevation, and type hierarchy.
- Decorative glass, texture, excessive gradients, fabricated data, and generic dashboard formulas no longer drive the interface.
- Major workflows show a clear next action, exception, deadline, or recovery path.
- Mobile layouts retain usable page actions, filters, tables, and proposal-review flows.
- Keyboard, focus, status, error, and empty states meet the documented accessibility baseline.
- No inactive controls, misleading lifecycle states, or blank query-error states remain.
