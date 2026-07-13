# Frontend Sprint 3 UI Decomposition Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decompose the frontend's largest page and workflow components into cohesive feature-owned components and view-model hooks without changing runtime behavior.

**Architecture:** Sprint 1 established feature folders, shared types, API utilities, and public barrels. Sprint 2 moved domain server functions out of `src/lib` and completed the import migration. Sprint 3 keeps data fetching and route composition at the page boundary while moving presentation, workflow state, table definitions, and pure transformations into feature-owned files. Cross-feature server APIs use dedicated public barrels to avoid importing a page-bearing root barrel from another feature.

**Tech Stack:** React 19, TanStack Router, TanStack Query, TanStack Table, React Hook Form, TypeScript, Zod, Vitest, Testing Library, Biome, pnpm

---

## Context For The Implementer

The repository root is `C:\Users\ASUS\Downloads\scool\neust-epms`. Frontend source lives under `frontend/src`, and frontend commands run from the repository root using the workspace filter:

```bash
pnpm --filter frontend lint
pnpm --filter frontend exec tsc --noEmit
pnpm --filter frontend test
pnpm --filter frontend build
```

The current branch already contains the completed Sprint 2 migration in commit `20a9181`. Do not repeat the Sprint 1 or Sprint 2 server-function moves.

Relevant completed plans:

- `docs/frontend-refactoring-plan.md` describes the original frontend architecture work and is marked complete.
- `docs/sprint-1-frontend-refactoring.md` records the completed frontend foundation and feature-folder migration.
- `docs/plans/2026-07-12-frontend-sprint-2-domain-migration.md` records the completed domain-function migration.
- `docs/plans/2026-07-09-sprint-3-small-modules.md` is a backend plan, not a frontend plan. It is already marked complete and must not be used as the frontend implementation plan.

The key Sprint 2 rule was to defer large page-component decomposition to a later sprint. The current frontend confirms that work remains:

| File | Approximate size | Main responsibilities currently mixed together |
|---|---:|---|
| `frontend/src/features/projects/project-details-page.tsx` | 846 lines | Query orchestration, permission rules, special-order upload state, header actions, overview, history, attachments, dialogs, and layout |
| `frontend/src/features/reports/reports-page.tsx` | 532 lines | Role-aware queries, filtering, pagination, progress sequencing, two column sets, table layout, and submit modal state |
| `frontend/src/features/archives/archives-page.tsx` | 524 lines | Three queries, three mutation flows, restore confirmation state, three column sets, and three tables |
| `frontend/src/features/proposals/components/create-proposal-modal.tsx` | 468 lines | Form schema, wizard state, validation, create/update/upload/submit mutations, upload progress, and dialog layout |
| `frontend/src/features/proposals/proposal-review-page.tsx` | 402 lines | Proposal query, review mutations, comments query/mutation, review permissions, context provider, PDF layout, sidebar tabs, and theater mode |

The frontend currently has server-function tests but no page or component tests. New tests should focus on pure view-model logic and the extracted interaction boundaries rather than snapshotting large pages.

## Non-Negotiable Rules

- Preserve API endpoints, authorization roles, validators, React Query keys, stale times, route paths, returned values, and existing user-visible behavior.
- Do not change backend contracts or server functions in this sprint.
- Do not redesign the visual system or replace the existing `DataTablePage`, `Dialog`, `PageHeader`, or UI primitives.
- Do not introduce a generic page framework, generic table framework, or cross-feature state manager.
- Keep same-feature imports relative when that makes ownership clear.
- Use a dedicated feature public barrel for cross-feature server-function and type imports. Do not import a page-bearing root barrel from another feature merely to access a server function.
- Keep route loaders and role-based access decisions at the route/page boundary unless extracting a pure helper removes duplication without changing behavior.
- Keep PDF viewer internals out of this sprint except for import changes required by proposal-review decomposition.
- Do not combine this work with new product behavior, endpoint changes, or page redesigns.

## Target Shape

After this sprint, each decomposed page should have this shape:

```text
features/<feature>/
├── <page>.tsx                 # query/state orchestration and composition
├── components/                # feature-owned presentational pieces
├── hooks/                     # feature-specific state/workflow hooks only
├── helpers/                   # pure transformations and permission decisions
├── functions.ts               # server functions and query options
├── public.ts                  # cross-feature API/type exports, when needed
└── index.ts                   # feature UI barrel for routes and composition
```

The page file does not need to be artificially tiny. It should own data loading, page-level state, and composition while individual components own one clear visual or workflow responsibility.

---

## Task 1: Stabilize Cross-Feature Public APIs

Before moving JSX, remove the current page-bearing barrel coupling. Sprint 2 added function exports to feature `index.ts` barrels, but several features now import one another's root barrels. For example, the projects page imports proposal UI and functions, proposal review imports project functions, faculty directory imports report functions, and reports imports faculty functions. This can create circular module evaluation as the root barrels export page components as well as APIs.

**Files:**

- Create: `frontend/src/features/projects/public.ts`
- Create: `frontend/src/features/proposals/public.ts`
- Create: `frontend/src/features/faculty/public.ts`
- Create: `frontend/src/features/reports/public.ts`
- Create: `frontend/src/features/moa/public.ts`
- Modify: `frontend/src/features/projects/index.ts`
- Modify: `frontend/src/features/proposals/index.ts`
- Modify: `frontend/src/features/faculty/index.ts`
- Modify: `frontend/src/features/reports/index.ts`
- Modify: `frontend/src/features/moa/index.ts`
- Modify: current cross-feature imports under `frontend/src/features/**/*.{ts,tsx}`, `frontend/src/routes/**/*.{ts,tsx}`, and `frontend/src/hooks/**/*.{ts,tsx}`

**Public barrel contents:**

- `projects/public.ts`: project query options, readiness/reporting/derived-state query options, project transition functions, special-order functions, and project response types needed outside projects.
- `proposals/public.ts`: `reviewProposalFn`, `getProposalByIdFn`, proposal create/update/submit functions, proposal query options, comments functions/types, derived-state query options, and proposal response types needed outside proposals.
- `faculty/public.ts`: faculty directory, faculty proposal, and faculty project query options and their consumer-facing types.
- `reports/public.ts`: report query options, report mutations, and report response types needed outside reports.
- `moa/public.ts`: active-MOA and upload functions needed by project workflows.

**Step 1: Add the public barrels.**

Re-export only functions, query options, and types. Do not re-export page components from these files.

**Step 2: Update cross-feature server API imports.**

Use `@/features/<feature>/public` for cross-feature functions and types. Keep UI composition imports such as `CreateProposalModal` coming from the owning feature's normal `index.ts` barrel.

**Step 3: Verify the import boundary.**

Run:

```bash
pnpm --filter frontend exec tsc --noEmit
```

Expected: no TypeScript errors and no unresolved exports.

---

## Task 2: Decompose Project Details

`project-details-page.tsx` is the largest frontend file. It already contains local `ProjectOverviewCard`, `ActivityHistoryCard`, and `AttachmentsCard` functions, so the first step is to move those responsibilities into feature-owned files without changing their props or rendering behavior.

**Files:**

- Create: `frontend/src/features/projects/components/project-overview-card.tsx`
- Create: `frontend/src/features/projects/components/activity-history-card.tsx`
- Create: `frontend/src/features/projects/components/attachments-card.tsx`
- Create: `frontend/src/features/projects/components/project-details-header.tsx`
- Create: `frontend/src/features/projects/hooks/use-project-special-orders.ts`
- Create: `frontend/src/features/projects/helpers/project-details-helpers.ts`
- Create: `frontend/src/features/projects/helpers/project-details-helpers.test.ts`
- Modify: `frontend/src/features/projects/project-details-page.tsx`
- Modify: `frontend/src/features/projects/index.ts`

**Step 1: Extract pure permission helpers.**

Move the special-order permission decisions into pure functions with explicit inputs:

- `canManageSpecialOrders(currentUserId, currentUserRole, members)`
- `canUploadSpecialOrder(status, currentUserId, currentUserRole, members)`
- `canReadProject(currentUserId, currentUserRole, members)`
- `isProjectLeader(currentUserId, members)`

Keep the exact current role and status conditions. Add unit tests for Director, RET Chair, project leader, ordinary member, and non-approved project cases.

**Step 2: Extract special-order workflow state.**

Create `useProjectSpecialOrders` to own upload state, SO-number state, selected files, upload errors, upload mutation calls, signed-URL viewing, and the existing project-details cache invalidation. Preserve the query key `["dashboard", "proposals", proposalId]` exactly.

**Step 3: Move the three local cards.**

Move each local card into its own file. `ProjectOverviewCard` may render a separate `ProjectMembersDialog` within its file or a nearby component file, but it must not regain page-level query loading or route logic.

**Step 4: Extract page header actions.**

Move breadcrumb/header/action rendering into `ProjectDetailsHeader`. Pass already-computed permissions, status description, readiness state, and callbacks as props. Keep mutation ownership in the page or the dedicated hook; do not make the header fetch data.

**Step 5: Reduce the page to orchestration.**

`ProjectDetailsPage` should load project data, derive page permissions, compose the header/cards/wizards/dialogs, and own page-level invalidation. Do not alter the existing edit, activate, close, or proposal-review navigation behavior.

**Step 6: Verify.**

Run:

```bash
pnpm --filter frontend exec tsc --noEmit
```

Expected: no TypeScript errors.

---

## Task 3: Decompose Proposal Review

`proposal-review-page.tsx` currently owns server queries, review actions, comments, attachment selection, theater mode, context creation, and the entire two-column layout. `proposal-details-tab.tsx` imports the context directly from the page, so the context is a separate ownership boundary that must move first.

**Files:**

- Create: `frontend/src/features/proposals/components/proposal-review-context.tsx`
- Create: `frontend/src/features/proposals/components/proposal-review-header.tsx`
- Create: `frontend/src/features/proposals/components/proposal-review-document-pane.tsx`
- Create: `frontend/src/features/proposals/components/proposal-review-sidebar.tsx`
- Create: `frontend/src/features/proposals/helpers/proposal-review-helpers.ts`
- Create: `frontend/src/features/proposals/helpers/proposal-review-helpers.test.ts`
- Modify: `frontend/src/features/proposals/proposal-review-page.tsx`
- Modify: `frontend/src/features/proposals/components/proposal-details-tab.tsx`
- Modify: `frontend/src/features/proposals/components/comments-tab.tsx`
- Modify: `frontend/src/features/proposals/index.ts`

**Step 1: Move the context and hook.**

Move `ProposalReviewContextValue`, the context instance, and `useProposalReview` into `proposal-review-context.tsx`. Update `proposal-details-tab.tsx` and any other consumers to import the hook from that file, not from the page component.

**Step 2: Extract review permission/decision helpers.**

Create pure helpers for:

- whether a RET Chair or Director can review the current proposal;
- whether a proposal is bypassed or already endorsed;
- the default decision and default comment for approve/endorse;
- the invalid-action guard used by approve, return, and reject.

Preserve the existing role/status rules exactly. Test the Pending Review, Endorsed, Approved, bypassed, RET Chair, and Director combinations.

**Step 3: Keep mutations in a review workflow boundary.**

The page or a feature hook may own the review and comment mutations, but the extracted visual components must receive callbacks and state through props/context. Preserve all existing invalidation keys: `dashboard`, `proposals`, `ret`, `projects`, and `proposal-comments`.

The current invalid-action guard is intentionally narrow: the RET Chair handlers return early only when the proposal is bypassed or already has an endorsement. Preserve that guard exactly; do not replace it with a new generic `isReviewable` mutation guard or change Director behavior.

**Step 4: Extract layout components.**

- `ProposalReviewHeader` owns breadcrumbs, title, status, and download action.
- `ProposalReviewDocumentPane` owns theater mode, selected document, PDF viewer, and comment callback wiring.
- `ProposalReviewSidebar` owns details/comments tabs and their layout.

Keep `ProposalDetailsTab` and `CommentsTab` as the tab content owners. Do not move PDF internals or change annotation behavior.

**Step 5: Verify.**

Run:

```bash
pnpm --filter frontend exec tsc --noEmit
```

Expected: no TypeScript errors.

---

## Task 4: Decompose the Proposal Wizard

`create-proposal-modal.tsx` has already been split into five step components, but the modal still owns the form schema, form type, wizard navigation, mutation pipeline, upload progress, reset behavior, and footer layout.

**Files:**

- Create: `frontend/src/features/proposals/components/proposal-form.ts`
- Create: `frontend/src/features/proposals/hooks/use-proposal-wizard.ts`
- Create: `frontend/src/features/proposals/components/proposal-wizard-header.tsx`
- Create: `frontend/src/features/proposals/components/proposal-wizard-footer.tsx`
- Create: `frontend/src/features/proposals/helpers/proposal-wizard-helpers.ts`
- Create: `frontend/src/features/proposals/helpers/proposal-wizard-helpers.test.ts`
- Modify: `frontend/src/features/proposals/components/create-proposal-modal.tsx`
- Modify: `frontend/src/features/proposals/components/proposal-step-info.tsx`
- Modify: `frontend/src/features/proposals/components/proposal-step-details.tsx`
- Modify: `frontend/src/features/proposals/components/proposal-step-members.tsx`
- Modify: `frontend/src/features/proposals/index.ts`

**Step 1: Move schema and shared form types.**

Move `formSchema`, `FormValues`, and any form-only types into `proposal-form.ts`. Update all step components to import `FormValues` from that file rather than from the modal.

**Step 2: Extract wizard helpers.**

Create pure helpers for:

- fields validated at each wizard step;
- step titles and labels;
- whether a draft or submission requires a document;
- whether an editing proposal may be submitted for its current status.

Preserve the current step ordering and validation fields exactly.

**Step 3: Extract workflow state.**

Create `useProposalWizard` to own reducer state, form initialization, mutation instances, save/submit sequencing, upload-progress timer behavior, reset behavior, and cache invalidation. Preserve the existing create -> upload -> submit order and all existing invalidation keys.

Do not change the backend payload shapes. Do not add a new form abstraction.

**Step 4: Extract header and footer.**

Move title/step-label rendering into `ProposalWizardHeader` and navigation/save/submit controls into `ProposalWizardFooter`. These components receive state and callbacks from the hook.

**Step 5: Verify.**

Run:

```bash
pnpm --filter frontend exec tsc --noEmit
```

Expected: no TypeScript errors.

---

## Task 5: Decompose Reports

`reports-page.tsx` mixes role-aware data loading, client-side filtering, progress-report sequencing, two different column configurations, table controls, and modal state.

**Files:**

- Create: `frontend/src/features/reports/components/report-columns.tsx`
- Create: `frontend/src/features/reports/components/reports-filter-tabs.tsx`
- Create: `frontend/src/features/reports/hooks/use-reports-view.ts`
- Create: `frontend/src/features/reports/helpers/reports-helpers.ts`
- Create: `frontend/src/features/reports/helpers/reports-helpers.test.ts`
- Modify: `frontend/src/features/reports/reports-page.tsx`
- Modify: `frontend/src/features/reports/index.ts`

**Step 1: Extract pure report transformations.**

Move the following into tested helpers:

- role-aware "My Reports" filtering;
- report-type filtering;
- progress-report sequence numbering by project and submitted date;
- pagination slicing.

Preserve RET Chair leader filtering, Faculty leader/member filtering, and the current progress sequence ordering.

**Step 2: Extract columns.**

Create named column factories for the director/college view and faculty view. The director/college factory must accept the current RET flag so the existing RET-specific leader avatar/rank cell remains unchanged. Keep all existing cell content, status badges, report links, and action menus unchanged.

**Step 3: Extract filter state.**

Create `ReportsFilterTabs` for the My Reports/College-wide Reports tabs. Keep page number reset behavior when tabs or search change.

**Step 4: Extract the view hook.**

Create `useReportsView` for role-derived flags, query results, filtered data, counts, pagination, and column selection. The page should compose `PageHeader`, metric cards, `DataTablePage`, and `SubmitReportModal`.

**Step 5: Verify.**

Run:

```bash
pnpm --filter frontend exec tsc --noEmit
```

Expected: no TypeScript errors.

---

## Task 6: Decompose Archives

`archives-page.tsx` repeats the same table/action pattern for proposals, projects, and MOAs while also owning all three queries and restore mutations.

**Files:**

- Create: `frontend/src/features/archives/components/archived-proposals-table.tsx`
- Create: `frontend/src/features/archives/components/archived-projects-table.tsx`
- Create: `frontend/src/features/archives/components/archived-moas-table.tsx`
- Create: `frontend/src/features/archives/hooks/use-archive-restore.ts`
- Create: `frontend/src/features/archives/helpers/archive-helpers.ts`
- Create: `frontend/src/features/archives/helpers/archive-helpers.test.ts`
- Modify: `frontend/src/features/archives/archives-page.tsx`
- Modify: `frontend/src/features/archives/index.ts`

**Step 1: Extract restore workflow.**

Create `useArchiveRestore` for the three restore mutations, confirmation item state, success/error messages, and existing invalidation keys. Preserve the existing role restriction for MOA restoration.

**Step 2: Extract each table.**

Move the proposal, project, and MOA columns and table rendering into their named components. Preserve sorting, pagination, `ClientOnly` date rendering, action labels, and empty/loading behavior.

**Step 3: Keep page-level tab composition.**

`ArchivesPage` should retain active-tab state, the three query calls, role-based MOA-tab visibility, page header, and tab composition. It should not own the detailed column definitions.

**Step 4: Verify.**

Run:

```bash
pnpm --filter frontend exec tsc --noEmit
```

Expected: no TypeScript errors.

---

## Task 7: Add Component-Level Guardrails

The current frontend test suite has no page/component coverage. Add focused tests for the extracted pure helpers and the highest-risk interaction boundaries. Do not snapshot entire pages.

**Files:**

- Create or extend tests beside each helper from Tasks 2-6.
- Create: `frontend/src/features/proposals/components/proposal-review-context.test.tsx` if context behavior needs direct coverage.
- Create: `frontend/src/features/projects/components/project-details-actions.test.tsx` only if the extracted header/action boundary contains non-trivial interaction logic.

Cover:

- project permission outcomes and special-order eligibility;
- proposal review permission and decision outcomes;
- proposal wizard step validation and submit eligibility;
- report role filtering and sequence numbering;
- archive restore selection and tab-specific mapping.

Use Testing Library only for component interaction that cannot be tested as a pure function. Mock server functions and TanStack Query at the boundary; do not require a live backend or session cookie.

---

## Task 8: Final Import, Boundary, and Regression Sweep

**Files:**

- Modify any remaining page/component imports discovered by the sweep.
- Modify feature public barrels and feature indexes as needed.
- Do not modify server functions unless typechecking exposes a relocation error.

**Step 1: Search for page-to-page coupling.**

Search `frontend/src/features`, `frontend/src/routes`, and `frontend/src/hooks` for imports from another feature's page-bearing `index.ts` used only for a server function or type. Replace them with that feature's `public.ts` barrel. This includes `use-derived-state.ts`, `use-project-readiness.ts`, and `use-project-reporting-schedule.ts`.

**Step 2: Search for oversized page responsibilities.**

Review the four target page files and the proposal modal, and confirm they no longer contain moved column definitions, large repeated table markup, or workflow-specific mutation plumbing.

**Step 3: Run final verification.**

```bash
pnpm --filter frontend lint
pnpm --filter frontend exec tsc --noEmit
pnpm --filter frontend test
pnpm --filter frontend build
```

Expected result:

- all commands pass;
- all existing query keys, endpoint behavior, and route behavior remain unchanged;
- the five target pages are orchestration-focused;
- cross-feature API imports use dedicated public barrels;
- extracted helper/component tests cover the new boundaries;
- no new generic abstraction layer was introduced.

## Explicitly Deferred

Do not include these in Sprint 3 unless a separate task is approved:

- `frontend/src/features/reports/components/submit-report-modal.tsx` decomposition;
- `frontend/src/features/projects/components/activate-project-wizard.tsx` decomposition;
- `frontend/src/features/admin/bulk-approve-dialog.tsx` decomposition;
- `frontend/src/features/faculty/faculty-project-hub-page.tsx` decomposition;
- `frontend/src/features/ret/ret-dashboard-page.tsx` decomposition;
- visual redesign, responsive-layout changes, or new product behavior;
- backend module refactoring covered by `docs/plans/2026-07-09-sprint-3-small-modules.md`.

## Suggested Commit Sequence

Keep commits reviewable and behavior-focused:

```text
refactor(frontend): stabilize feature public API boundaries
refactor(frontend): decompose project details page
refactor(frontend): decompose proposal review and wizard
refactor(frontend): decompose reports and archives pages
test(frontend): cover sprint 3 view-model boundaries
```
