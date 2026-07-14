# Frontend Institutional Refresh Sprint 2: Dashboard Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give the existing role dashboards a modern contemporary visual treatment and fix clearly identified dashboard bugs without turning the product into a new 2.0 design system.

**Architecture:** Preserve the current routes, API contracts, Action Center backend, dashboard data, and component inventory. Sprint 2 changes feature-owned dashboard composition, spacing, hierarchy, states, and responsive presentation. The only intentional data-loading improvement is prefetching the existing Action Center query from the authenticated dashboard route.

**Tech Stack:** React 19, TypeScript, TanStack Router, TanStack Query, Tailwind CSS 4, existing project UI components, pnpm.

---

## Scope And Constraints

### In Scope

- Contemporary visual polish for Director, Faculty, and RET Chair dashboards.
- Action Center visual hierarchy and presentation using its existing response data.
- Dashboard loading, error, empty, clipping, and state bugs.
- Director chart filtering bug fix while preserving the current campus default.
- Prefetching the existing Action Center query with dashboard loaders.
- Responsive review at mobile, tablet, and desktop widths.

### Explicitly Out Of Scope

- No new backend endpoints, action-center data model, MOA query, or API response redesign.
- No Reports, MOA Repository, Archives, Proposal Review, Auth, Admin, Search, or Onboarding redesign.
- No new design system, dashboard framework, state manager, chart library, or typography system.
- No modification to shadcn/Base UI primitive implementations.
- No tests, TDD, or test commands for this sprint. Validate with type checks, builds, and manual UI review.

## Current Problems This Sprint Addresses

- `director-dashboard-page.tsx` defaults to `Sumacab Campus`, which can make a campus-specific chart look institution-wide.
- The Director page filters chart data before passing it to `ProjectsChartCard`, while `ProjectsChartCard` filters it again.
- Recent activities and expiring MOAs use fixed heights with `overflow-hidden`, which can silently hide records.
- Action Center errors return `null`, causing the primary dashboard surface to disappear without recovery guidance.
- Action Center has `ACT` and `WATCH` tabs even though existing items can carry `WAIT` derived states.
- Action Center arrow controls do not expose item-specific accessible names.
- Faculty and RET dashboards rely on generic dashboard formulas without enough role-specific context.

## Acceptance Criteria

- The dashboards feel calmer, more contemporary, and more operational without introducing a new visual language.
- Existing data remains the source of truth; no fabricated metrics or new workflow concepts are introduced.
- Action Center clearly presents existing action, waiting, and monitoring states.
- Dashboard failures and empty states remain visible and recoverable.
- Director chart scope is explicit and preserves the current Sumacab Campus default.
- Activity and expiry content is inspectable without silent clipping.
- Existing Faculty and dashboard destinations remain unchanged.
- Action Center data is prefetched through the existing dashboard loader path.
- No shadcn/Base UI primitive files are modified.

---

## Task 1: Refresh The Existing Action Center Surface

**Files:**

- Modify: `frontend/src/features/action-center/action-center-card.tsx`
- Create: `frontend/src/features/action-center/helpers/action-center-helpers.ts`
- Modify: `frontend/src/features/action-center/index.ts` only if the helper needs feature-local exports.
- Modify: `frontend/src/hooks/use-action-center.ts` only if the component needs a typed retry wrapper.

**Step 1: Keep the existing API contract.**

Do not modify the backend Action Center route or response shape. Use the existing `actItems`, `watchItems`, `derivedState`, `urgency`, `owner`, and `actionRequired` fields.

**Step 2: Partition existing items for presentation.**

Create a small feature helper that:

- keeps `ACT` items in Needs Action;
- separates `WAIT` items from `watchItems` into Waiting;
- keeps `WATCH` items in Monitoring;
- sorts items by `urgent`, `soon`, `routine`, then newest `createdAt`.

This is a frontend view transformation only. Do not add a new API model.

**Step 3: Establish a contemporary panel hierarchy.**

Update `ActionCenterCard` to use:

- a restrained heading row with a short description;
- compact count summaries for action, waiting, and monitoring items;
- existing tabs or segmented controls for the three sections;
- semantic urgency treatments with text labels rather than decorative color-only indicators;
- compact rows with category icon, title, action/owner context, and a direct arrow destination.

Avoid adding oversized hero cards, gradients, glass effects, animated counters, or excessive pill styling.

**Step 4: Fix interaction and recovery bugs.**

- Add item-specific accessible labels to arrow destinations, for example `Open proposal action: {title}`.
- Preserve every existing Action Center destination and route mapping.
- Replace `return null` on query errors with a compact `Action Center unavailable` state and a retry action using the existing query refetch.
- Keep the current all-caught-up state, but distinguish no actions from no monitored items.
- Keep long lists bounded and visibly scrollable instead of silently clipping them.

**Step 5: Manual review.**

Review the card with action-only, waiting-only, monitoring-only, mixed, empty, loading, error, and long-list data. Confirm the card remains usable at 360px and does not require changes to UI primitives.

## Task 2: Correct And Polish The Director Dashboard

**Files:**

- Modify: `frontend/src/features/dashboard/director/director-dashboard-page.tsx`
- Modify: `frontend/src/features/projects/components/projects-chart-card.tsx`
- Modify: `frontend/src/features/projects/components/projects-chart.tsx` only if the chart empty state or labels need adjustment.

**Step 1: Fix chart filtering without changing the current scope.**

- Keep the initial `selectedCampus` as `"Sumacab Campus"`.
- Pass the complete `allChartData` collection to `ProjectsChartCard`.
- Keep campus filtering in exactly one place, preferably inside `ProjectsChartCard`.
- Preserve the existing campus options and current selector behavior.
- Ensure the selector trigger visibly communicates the current Sumacab Campus scope.

**Step 2: Add restrained page context.**

Keep the personalized welcome title and add a concise supporting line such as `Institution-wide extension project operations`. Do not add a new hero section or a second dashboard header.

**Step 3: Preserve the existing hierarchy.**

Keep Action Center before metrics. Keep metrics as supporting summary cards, then chart/activity content. Use spacing, typography, borders, and semantic emphasis to establish hierarchy instead of adding decorative card variants.

**Step 4: Fix recent activity clipping.**

Update `RecentActivitiesCard` so:

- the panel is content-safe and responsive;
- longer lists use an intentional scroll region;
- empty content stays vertically readable;
- arbitrary rotating green/amber/blue dots are removed or replaced with a single restrained activity marker;
- no activity is hidden by `overflow-hidden` without a visible scroll affordance.

**Step 5: Fix expiring-MOA presentation.**

Update `ExpiringMoasCard` so:

- its existing View All route remains;
- expiry wording uses the Sprint 1 semantic danger/warning tokens;
- the list is not clipped by a fixed height;
- the empty state is concise and useful;
- the panel remains readable on mobile.

Do not add a new MOA data query in this sprint.

**Step 6: Polish chart responsiveness.**

Keep the existing lazy-loaded chart. Adjust only the chart card’s layout so the campus selector stacks or expands on narrow widths and empty filtered data explains what is happening. Do not replace Recharts or change the dashboard response contract.

## Task 3: Refine Faculty And RET Dashboard Composition

**Files:**

- Modify: `frontend/src/features/faculty/faculty-dashboard-page.tsx`
- Modify: `frontend/src/features/ret/ret-dashboard-page.tsx`
- Modify: `frontend/src/features/ret/project-monitoring-page.tsx` only where shared dashboard copy needs alignment.

**Step 1: Keep role-specific content, improve context.**

Faculty dashboard:

- Keep the existing greeting, Action Center, metrics, and merged project/proposal list.
- Add one short subtitle explaining that the dashboard covers the faculty member’s submissions, projects, and deadlines.
- Keep the existing create-proposal action as the primary CTA.
- Replace generic empty copy with a concise next step while preserving the current workflow.

RET Chair dashboard:

- Keep the existing greeting, college/department context, Action Center, metrics, and proposal table.
- Add a short subtitle describing review, endorsement, and project monitoring responsibilities.
- Preserve the current create-proposal action and table filters.
- Use spacing and hierarchy to make pending review/attention more prominent without adding new data cards.

**Step 2: Preserve existing Faculty destinations.**

Do not change Faculty proposal/project links, route destinations, route parameters, or navigation behavior. Any visual copy or spacing adjustment must leave the current links intact.

**Step 3: Harmonize loading and empty states.**

Use the existing `PageCard`, `MetricCard`, and `StatusBadge` components. Remove only dashboard-specific fixed-height loading layouts or awkward spacing that conflicts with the Sprint 1 foundation. Do not edit the underlying UI primitives.

**Step 4: Manual review.**

Inspect Faculty and RET dashboards with no records, loading records, returned/overdue records, and normal records. Confirm the Action Center remains the primary decision surface rather than duplicating it in every list.

## Task 4: Prefetch Action Center Data

**Files:**

- Modify: `frontend/src/routes/_authenticated/dashboard.tsx`
- Use: `frontend/src/features/action-center/functions.ts`

**Step 1: Add the existing query option to dashboard loaders.**

In each role branch that renders a dashboard, call:

```ts
context.queryClient.prefetchQuery(actionCenterQueryOptions());
```

Keep the current role-specific prefetches and access decisions unchanged.

**Step 2: Avoid a duplicate request.**

Use the exact existing query key from `actionCenterQueryOptions()` and do not add a second hook or alternate key. The mounted `ActionCenterCard` must reuse the prefetched result.

**Step 3: Handle prefetch failure safely.**

Prefetch failure must not block dashboard navigation. The mounted Action Center handles its own loading/error/retry state.

## Task 5: Dashboard Visual And Responsive Review

**Files:**

- Modify only files touched in Tasks 1-4 if a verified dashboard regression is found.

Review the following at 360px, 768px, 1024px, and desktop widths:

- Action Center tabs, counts, urgency labels, links, and retry state;
- Director Sumacab Campus selector and chart empty state;
- Director activity and expiry lists;
- Faculty greeting, CTA, metrics, Action Center, and mixed list;
- RET greeting, CTA, metrics, Action Center, filters, and table entry points;
- keyboard focus through every dashboard action and Action Center destination;
- reduced-motion behavior and existing light/dark semantic tokens.

Avoid visual changes that spread into unrelated pages. This sprint should improve dashboard composition through existing primitives, not introduce global design-system changes.

## Task 6: Non-Test Verification

No test files, TDD cycle, or test commands are part of this sprint.

Run:

```bash
pnpm --filter frontend exec tsc --noEmit
pnpm --filter frontend build
```

Expected: both commands complete successfully. Do not reformat unrelated files to resolve existing repository-wide formatting noise.

## Sprint Completion Checklist

- [ ] Action Center has contemporary hierarchy without a new component system.
- [ ] Existing action items are split into Needs Action, Waiting, and Monitoring.
- [ ] Action Center error/empty/loading states remain visible and recoverable.
- [ ] Action links preserve existing routes and have accessible names.
- [ ] Director dashboard preserves the Sumacab Campus default and filters chart data once.
- [ ] Activity and MOA expiry panels no longer silently clip content.
- [ ] Existing Faculty proposal/project destinations remain unchanged.
- [ ] Faculty and RET dashboards have concise role-specific context.
- [ ] Existing Action Center query is prefetched by authenticated dashboard loaders.
- [ ] No new backend data model or endpoint was introduced.
- [ ] No shadcn/Base UI primitive files were modified.
- [ ] Reports, MOAs repository, Archives, proposals, auth, and admin redesigns remain deferred.
