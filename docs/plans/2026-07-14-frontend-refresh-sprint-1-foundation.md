# Frontend Institutional Refresh Sprint 1: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish the shared visual, responsive, and accessibility foundation for the institutional frontend refresh without changing product workflows or introducing a design-system rewrite.

**Architecture:** Sprint 1 changes only global tokens and high-reuse primitives. `styles.css` becomes the single semantic source for the NEUST sea/lagoon/palm visual language, while the application shell, page headers, table controls, status badges, buttons, page cards, and metrics consume that baseline. Feature pages retain their current data contracts and behavior; dashboard- and workflow-specific composition moves to later sprints after the shared primitives are stable.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Base UI, TanStack Table, Vitest, Testing Library, Biome, pnpm.

---

## Context For The Implementer

The repository root is `C:\Users\ASUS\Downloads\scool\neust-epms`. Run frontend commands from the repository root:

```bash
pnpm --filter frontend test
pnpm --filter frontend check
pnpm --filter frontend build
```

The parent refresh plan is `docs/plans/2026-07-14-institutional-operational-refresh.md`. This sprint implements its first two tasks only: establish the global visual baseline and refine shared layout/interaction primitives.

The existing frontend has sound structural foundations: React 19, Tailwind 4, Base UI controls, a shared application shell, `PageHeader`, `PageCard`, `DataTablePage`, `DataTable`, `StatusBadge`, and `MetricCard`. The current visual drift comes from multiple overlapping systems:

- `frontend/src/styles.css` mixes sea/lagoon/palm variables with unrelated blue/neutral shadcn tokens, includes duplicate `tw-animate-css` imports, and layers multiple gradients, a fixed overlay, and a grid texture behind all content.
- `frontend/src/routes/__root.tsx` forces light mode and overwrites `localStorage` even though `styles.css` defines a dark token set.
- `frontend/src/components/custom/page-header.tsx` and `data-table-page.tsx` use non-wrapping desktop layouts that compress page actions and filters at narrow widths.
- `frontend/src/components/layout/app-shell.tsx` points the skip link at an inner `div` instead of the actual `main` landmark produced by `SidebarInset`.
- `frontend/src/components/ui/data-table.tsx` gives rows pointer behavior without keyboard semantics when `onRowClick` is present.
- `frontend/src/components/ui/status-badge.tsx` relies on raw Tailwind green/amber/orange/blue/red classes.
- `frontend/src/components/custom/metric-card.tsx` combines generic metrics, faculty summary data, fake avatars, raw green trends, fixed heights, and multiple unrelated visual variants.

## Sprint Boundary

### In Scope

- Consolidating existing color values into semantic tokens while retaining the NEUST palette.
- Simplifying the global page background, shadows, and blur treatments.
- Resolving theme behavior so implementation matches the supported user experience.
- Improving responsive layout and keyboard access in shared shell/table/header controls.
- Making shared status, card, button, and metric primitives consistent and semantically styled.
- Adding focused tests only for interaction boundaries that can be tested without a live backend.

### Explicitly Deferred

- Dashboard information architecture and role-specific priority queues.
- Reports, MOAs, archives, RET, proposal, auth, admin, search, onboarding, and notification workflow changes.
- Backend contracts, endpoint behavior, query keys, role/permission rules, route paths, and table data semantics.
- A new component library, a new token framework, a global state manager, or a typography replacement.
- Page-level visual redesign beyond changes inherited automatically from shared primitives.

## Acceptance Criteria

- Shared UI renders with one coherent NEUST-derived semantic color language in the supported theme modes.
- Global background decoration does not compete with operational data or reduce surface readability.
- Keyboard users can use the skip link and reach row actions through actual controls.
- Page headers, table search, filters, and actions remain usable at 360px, 768px, 1024px, and desktop widths.
- Status colors are semantic rather than raw per-status utility classes.
- Metric cards no longer fabricate contributors/avatars or use fixed heights that clip real content.
- Existing feature routes, backend contracts, and business workflows remain unchanged.

---

## Task 1: Consolidate Theme Behavior And Global Semantic Tokens

**Files:**

- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/routes/__root.tsx`
- Test: `frontend/src/routes/__root.test.tsx` only if the existing router test setup can render the root document without introducing a new test harness.

**Step 1: Decide and document supported theme behavior.**

The code currently defines both light and dark tokens but runs this script in `__root.tsx`:

```ts
root.classList.remove('light','dark');
root.classList.add('light');
root.setAttribute('data-theme','light');
root.style.colorScheme='light';
window.localStorage.setItem('theme','light');
```

Keep dark mode only if the shared components changed in this sprint consume semantic tokens in both modes. Otherwise remove the inactive dark behavior and present a deliberately light-only product. Do not keep a forced-light script alongside an apparent dark theme.

**Step 2: Write a failing theme behavior test where feasible.**

If root-document rendering is already feasible in Vitest, assert that the initial script does not overwrite an existing user theme preference. If it is not feasible, do not add an isolated router test setup just for this script; record a manual light/dark verification instead.

**Step 3: Make the NEUST palette semantic.**

In `styles.css`:

- Retain the existing sea/lagoon/palm values as source palette values.
- Set `--primary`, `--primary-foreground`, `--accent`, `--ring`, sidebar tokens, and chart values from the institutional palette rather than unrelated blue OKLCH values.
- Add semantic success, warning, danger, and information foreground/surface/border tokens for shared status UI.
- Expose needed semantic values through `@theme inline` so Tailwind utilities can consume them.
- Retain the current generic token names (`background`, `foreground`, `card`, `border`, `muted`, and so on) to avoid a wholesale component migration.

**Step 4: Simplify global decoration.**

- Remove the duplicate `tw-animate-css` import.
- Replace the three radial gradients, `body::before`, and `body::after` grid treatment with one restrained background appropriate for an operational application.
- Remove generic `.island-shell` and `.feature-card` blur/elevation styling from shared page surfaces, or reduce it to a flat surface/border treatment where existing consumers require the classes.
- Preserve the reduced-motion override and PDF text-layer styles.

**Step 5: Make global error copy safe.**

Update `RootError` so it presents a generic recovery message rather than raw `error.message`. Preserve the existing Try again and Go home actions.

**Step 6: Verify.**

Run:

```bash
pnpm --filter frontend check
pnpm --filter frontend build
```

Expected: both commands exit successfully.

Manual verification:

- Load the app in the supported light/dark modes and refresh after setting a preference.
- Inspect a dashboard, table, dialog, popover, and auth page for readable surfaces and visible focus rings.
- Trigger the root error boundary in development and confirm no implementation error is exposed.

## Task 2: Fix Shared Shell And Responsive Page Controls

**Files:**

- Modify: `frontend/src/components/layout/app-shell.tsx`
- Modify: `frontend/src/components/custom/page-header.tsx`
- Modify: `frontend/src/components/custom/data-table-page.tsx`
- Modify: `frontend/src/components/ui/sidebar.tsx` only if `SidebarInset` needs a small compatible change.
- Test: `frontend/src/components/layout/app-shell.test.tsx`
- Test: `frontend/src/components/custom/page-header.test.tsx`
- Test: `frontend/src/components/custom/data-table-page.test.tsx`

**Step 1: Write failing accessibility tests.**

- Render `AppShell` with minimal stubs for the sidebar/header dependencies and assert the skip link targets `main#main-content`.
- Render `PageHeader` with a long title and actions; assert the action wrapper has the responsive layout classes selected for this sprint.
- Render `DataTablePage` with search and filter controls; assert the controls remain grouped and the search has the responsive full-width class at the mobile breakpoint.

**Step 2: Correct the skip-link target.**

`SidebarInset` renders the actual `<main>` element. Pass `id="main-content"` to `SidebarInset` in `app-shell.tsx` and remove the duplicate ID from the inner content `div`. Keep the visible focus treatment on the skip link.

Do not make the inner content container focusable unless a browser-specific test proves the main landmark cannot receive skip-link focus. Prefer landmark navigation over introducing an extra tab stop.

**Step 3: Make page headers responsive.**

Update `PageHeader` from its current single-line `flex items-start justify-between` layout to a mobile-first stacked layout. Use a row layout only from a suitable breakpoint onward. Ensure the action wrapper can wrap and aligns with the title at larger widths.

Keep the current `title`, `actions`, and `className` API. Do not introduce variants until a concrete caller requires a distinct header composition.

**Step 4: Make table controls responsive.**

Update `DataTablePage` so:

- title/action content stacks on small screens;
- search/filter content stacks on small screens and aligns in a row at larger widths;
- the search input has `w-full` at small widths and retains a bounded desktop width;
- filter containers can wrap instead of forcing overflow.

Keep server pagination, sorting, selection, filter props, and table API behavior unchanged.

**Step 5: Verify.**

Run:

```bash
pnpm --filter frontend test -- app-shell page-header data-table-page
pnpm --filter frontend check
```

Expected: focused tests and Biome checks pass.

Manual verification: inspect a page with multiple header actions and a table with search plus filters at 360px, 768px, 1024px, and desktop widths. Ensure nothing overlaps or becomes inaccessible.

## Task 3: Make Table Navigation And Buttons Accessible

**Files:**

- Modify: `frontend/src/components/ui/data-table.tsx`
- Modify: `frontend/src/components/ui/button.tsx`
- Modify: call sites passing `onRowClick` only where needed to replace row clicks with explicit links/actions.
- Test: `frontend/src/components/ui/data-table.test.tsx`
- Test: `frontend/src/components/ui/button.test.tsx` if current test conventions support it.

**Step 1: Write failing table interaction tests.**

- Render a table with a row-level destination/action and assert a keyboard-reachable, named control is present.
- Assert pressing Enter/Space does not depend on a click handler attached to a non-focusable table row.
- Render tables without row actions and assert their row markup remains non-interactive.

**Step 2: Replace implicit row interaction.**

The current `DataTable` adds only `cursor-pointer` and `onClick` to `<tr>`. Do not add a button role to table rows. Instead:

- Prefer a real link or named action button in a dedicated cell for navigational tables.
- Extend column definitions only if a narrowly-scoped action-cell pattern is needed by multiple existing callers.
- Remove `onRowClick` from individual callers as their explicit action/link is introduced.

Avoid a generic row-link abstraction that obscures column semantics or breaks embedded controls. Preserve table selection behavior independently.

**Step 3: Normalize shared button sizing.**

- Make the default and icon button sizes meet a practical touch target baseline where they are used outside dense data tables.
- Preserve compact `xs`/`sm` variants for dense table action cells.
- Keep the current Base UI primitive, variant API, focus behavior, disabled state, and icon sizing contract.

**Step 4: Verify.**

Run:

```bash
pnpm --filter frontend test -- data-table button
pnpm --filter frontend check
```

Expected: focused interaction tests and Biome checks pass.

Manual verification: navigate an action table with keyboard only, including a row with an embedded menu/button, and confirm no click propagation opens an unintended record.

## Task 4: Consolidate Status, Card, And Metric Primitives

**Files:**

- Modify: `frontend/src/components/ui/status-badge.tsx`
- Modify: `frontend/src/components/custom/page-card.tsx`
- Modify: `frontend/src/components/custom/metric-card.tsx`
- Modify: feature callers of `MetricCard` only where the narrowed props require it.
- Test: `frontend/src/components/ui/status-badge.test.tsx`
- Test: `frontend/src/components/custom/metric-card.test.tsx`

**Step 1: Write failing semantic rendering tests.**

- Assert known statuses render their visible label and an explanatory accessible name.
- Assert status classes use semantic token utilities rather than raw green/amber/orange/blue/red utility classes.
- Assert a numeric metric does not render fabricated contributor avatars.
- Assert metric layouts do not depend on a fixed height that clips labels, values, or trends.

**Step 2: Map status presentation to semantics.**

Replace `text-green-500`, `text-amber-500`, `text-orange-500`, `text-blue-500`, `text-red-500`, and `text-emerald-500` from `STATUS_MAP` with token-backed semantic classes.

Retain the existing labels, status-description tooltips, icon choices, `role="status"`, and unknown-status fallback. Do not change business status names or mapping behavior during this sprint.

**Step 3: Flatten shared card surfaces.**

Update `PageCard` to consume the Sprint 1 card/background/border/elevation baseline. Keep its `noOverflow` API and do not change caller layout ownership.

**Step 4: Narrow `MetricCard`.**

Split the current mixed component into the smallest clear API that supports current users. Prefer either:

- a focused `MetricCard` for label, value, loading, optional trend, and action affordance; plus a separate nearby faculty-summary component; or
- explicit `metric` and `faculty-summary` variants with no props that silently switch composition based on `college`.

Remove fake avatar rendering. Replace raw green trend styling with a semantic positive/neutral/negative treatment, or omit trend color when the data does not encode trend direction. Remove fixed heights and use content-driven spacing.

Do not change metric data queries or invent trend data that the backend does not return.

**Step 5: Verify.**

Run:

```bash
pnpm --filter frontend test -- status-badge metric-card
pnpm --filter frontend check
pnpm --filter frontend build
```

Expected: tests, checks, and production build pass.

Manual verification: inspect status badges, dashboard metrics, faculty summaries, loading states, long labels, and large values in both supported theme modes.

## Task 5: Sprint Regression And Visual Review

**Files:**

- Modify only files necessary to correct verified regressions from Tasks 1-4.

**Step 1: Run the full frontend suite.**

```bash
pnpm --filter frontend test
pnpm --filter frontend check
pnpm --filter frontend build
```

Expected: all commands exit successfully.

**Step 2: Conduct the shared-primitive visual review.**

Review each state at 360px, 768px, 1024px, and desktop widths:

- authenticated shell with open and collapsed sidebar;
- header with no action, one action, and multiple actions;
- table with search, filters, action cells, loading rows, error state, and empty state;
- status badge default and outline variants;
- metric loading, long-label, and large-number states;
- dialog/popover/menu surface elevation and focus rings;
- root error boundary and reduced-motion preference.

**Step 3: Confirm sprint boundary.**

Do not include dashboard content hierarchy, workflow-specific copy, proposal lifecycle, archive/report/MOA behavior, auth journey changes, or backend/API work in this sprint. Record those findings for Sprint 2+ rather than expanding the shared-foundation pull request.

## Completion Checklist

- [ ] Supported theme behavior is deliberate and no script silently overwrites user preference.
- [ ] Semantic tokens drive primary, focus, chart, and status colors.
- [ ] Generic page decoration and excess surface blur are removed or restrained.
- [ ] Skip navigation targets the actual main landmark.
- [ ] Page headers and table controls respond cleanly across target widths.
- [ ] Table navigation uses explicit keyboard-accessible controls.
- [ ] Shared buttons retain density variants while improving common touch targets.
- [ ] Status badges use semantic colors and retain text labels/tooltips.
- [ ] Metric cards no longer fabricate people/data or impose fixed content heights.
- [ ] Frontend tests, checks, and production build complete successfully.
