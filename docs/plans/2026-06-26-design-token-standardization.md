# Design Token Standardization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 557 hardcoded hex/rgba color values across 40+ files with semantic Tailwind utility classes backed by CSS custom properties.

**Architecture:** Add new semantic tokens to `styles.css` (`@theme inline` block), then systematically replace raw hex values in component files with Tailwind classes like `text-foreground`, `border-border`, `bg-muted`, etc. Batch by token type (text → border → background → brand → shadow).

**Tech Stack:** Tailwind CSS v4, CSS custom properties, `@theme inline` block

---

## Color Token Mapping

| Hex | Count | Tailwind Class | CSS Variable |
|-----|-------|----------------|--------------|
| `#0a0a0a` | 62 | `text-foreground` | `--foreground` ✓ |
| `#666` | 84 | `text-muted-foreground` | `--muted-foreground` ✓ |
| `#737373` | 40 | `text-muted-foreground` | `--muted-foreground` ✓ |
| `#333` | 2 | `text-foreground/80` | `--foreground` ✓ |
| `#555` | 3 | `text-muted-foreground` | `--muted-foreground` ✓ |
| `#999` | 3 | `text-muted-foreground/60` | `--muted-foreground` ✓ |
| `#11215a` | 30 | `text-[#11215a]` | NEW: `--heading` |
| `#14369c` | 15 | `text-brand-primary` | `--brand-primary` ✓ |
| `#1e3b8a` | 4 | `text-brand-primary` | `--brand-primary` ✓ |
| `#ebebeb` | 64 | `border-border` | `--border` ✓ |
| `#e5e5e5` | 40 | `border-border` | `--border` ✓ |
| `#ddd` | 4 | `border-border` | `--border` ✓ |
| `#f5f5f5` | 5 | `border-border/50` | `--border` ✓ |
| `bg-white` | 66 | `bg-background` | `--background` ✓ |
| `#fcfcfc` | 15 | `bg-card` | `--card` ✓ |
| `#f9f9f9` | 6 | `bg-muted` | `--muted` ✓ |
| `#fafafa` | 5 | `bg-muted` | `--muted` ✓ |
| `#f4f7fc` | 2 | `bg-primary/5` | `--primary` ✓ |
| `rgba(0,0,0,0.1)` | 32 | `shadow-card` | NEW: `--shadow-card` |
| `#22c55e` | 2 | `text-green-500` | Tailwind built-in |
| `#10b981` | 2 | `text-emerald-500` | Tailwind built-in |
| `#16a34a` | 2 | `text-green-600` | Tailwind built-in |
| `#ef4444` | 1 | `text-red-500` | Tailwind built-in |
| `#dc2626` | 1 | `text-red-600` | Tailwind built-in |
| `#f59e0b` | 1 | `text-amber-500` | Tailwind built-in |
| `#ab6400` | 1 | `text-amber-700` | Tailwind built-in |

---

## Task 1: Add New CSS Variables to `styles.css`

**Files:**
- Modify: `frontend/src/styles.css:14-70` (`:root` block)
- Modify: `frontend/src/styles.css:72-127` (`.dark` block)
- Modify: `frontend/src/styles.css:129-173` (`@theme inline` block)

**Step 1: Add `--heading` and `--shadow-card` to `:root`**

After `--brand-primary-hover` (line 52), add:

```css
--heading: #11215a;
--shadow-card: rgba(0, 0, 0, 0.1);
```

**Step 2: Add dark mode overrides to `.dark`**

After `--brand-primary-hover` (line 110), add:

```css
--heading: #c8d6f0;
--shadow-card: rgba(0, 0, 0, 0.25);
```

**Step 3: Add to `@theme inline` block**

After `--color-brand-primary-hover` (line 148), add:

```css
--color-heading: var(--heading);
```

**Step 4: Commit**

```bash
git add frontend/src/styles.css
git commit -m "feat(ui): add heading and shadow-card design tokens"
```

---

## Task 2: Replace Text Colors (194 occurrences)

**Files:** All files in `frontend/src/components/` and `frontend/src/features/` that use `#0a0a0a`, `#666`, `#737373`, `#333`, `#555`, `#999`

**Step 1: Replace `#0a0a0a` → `text-foreground` (62 uses)**

Key files:
- `features/director/project-details-page.tsx` (7 occurrences)
- `features/director/faculty-directory-page.tsx` (6 occurrences)
- `features/director/project-hub-page.tsx` (5 occurrences)
- `features/ret/faculty-directory-page.tsx` (2 occurrences)
- `features/ret/project-monitoring-page.tsx` (3 occurrences)
- `features/ret/ret-dashboard-page.tsx` (3 occurrences)
- `features/admin/users-page.tsx` (3 occurrences)
- `features/admin/activity-log-page.tsx` (4 occurrences)
- `features/admin/bulk-approve-dialog.tsx` (5 occurrences)
- `features/director/director-dashboard-page.tsx` (2 occurrences)
- `features/director/moa-repository-page.tsx` (4 occurrences)
- `features/director/projects-chart-card.tsx` (1 occurrence)
- `features/director/reports-page.tsx` (4 occurrences)
- `components/custom/metric-card.tsx` (0 - uses `#11215a` not `#0a0a0a`)
- `components/role-sidebar.tsx` (4 occurrences)
- `components/ui/pagination-bar.tsx` (4 occurrences)
- `features/layout/app-sidebar.tsx` (2 occurrences)

**Replacement pattern:** In Tailwind classes, replace `text-[#0a0a0a]` or `style={{color: '#0a0a0a'}}` with `text-foreground`.

**Step 2: Replace `#666` → `text-muted-foreground` (84 uses)**

Key files:
- `features/admin/activity-log-page.tsx` (6 occurrences)
- `features/admin/bulk-approve-dialog.tsx` (1 occurrence)
- `features/admin/users-page.tsx` (5 occurrences)
- `features/director/director-dashboard-page.tsx` (4 occurrences)
- `features/director/faculty-directory-page.tsx` (9 occurrences)
- `features/director/moa-repository-page.tsx` (4 occurrences)
- `features/director/project-details-page.tsx` (15 occurrences)
- `features/director/project-hub-page.tsx` (6 occurrences)
- `features/director/reports-page.tsx` (5 occurrences)
- `features/ret/faculty-directory-page.tsx` (8 occurrences)
- `features/ret/project-monitoring-page.tsx` (5 occurrences)
- `features/ret/ret-dashboard-page.tsx` (6 occurrences)
- `components/custom/metric-card.tsx` (3 occurrences)
- `components/ui/data-table.tsx` (2 occurrences)
- `components/ui/pagination-bar.tsx` (1 occurrence)
- `features/proposals/components/create-proposal-modal.tsx` (1 occurrence)
- `features/director/projects-chart-card.tsx` (1 occurrence)
- `features/director/components/pdf-toolbar.tsx` (2 occurrences)

**Step 3: Replace `#737373` → `text-muted-foreground` (40 uses)**

Key files:
- `features/director/proposal-review-page.tsx` (15 occurrences)
- `features/director/project-details-page.tsx` (2 occurrences)
- `features/director/project-hub-page.tsx` (3 occurrences)
- `features/director/faculty-directory-page.tsx` (2 occurrences)
- `features/director/moa-repository-page.tsx` (1 occurrence)
- `features/director/projects-chart.tsx` (2 occurrences)
- `features/director/projects-chart-card.tsx` (1 occurrence)
- `features/director/reports-page.tsx` (1 occurrence)
- `features/ret/faculty-directory-page.tsx` (1 occurrence)
- `features/ret/project-monitoring-page.tsx` (2 occurrences)
- `features/ret/ret-dashboard-page.tsx` (2 occurrences)
- `components/ui/search-input.tsx` (1 occurrence)
- `components/ui/status-badge.tsx` (2 occurrences)
- `features/director/pdf-inner.tsx` (1 occurrence)
- `features/admin/activity-log-page.tsx` (1 occurrence)
- `features/admin/bulk-approve-dialog.tsx` (1 occurrence)

**Step 4: Replace `#333`, `#555`, `#999`**

- `#333` (2x in faculty-directory-page.tsx, proposal-review-page.tsx) → `text-foreground/80`
- `#555` (3x in pdf-toolbar.tsx) → `text-muted-foreground`
- `#999` (3x in project-details-page.tsx, proposal-review-page.tsx, project-monitoring-page.tsx) → `text-muted-foreground/60`

**Step 5: Commit**

```bash
git add frontend/src/
git commit -m "refactor(ui): replace hardcoded text colors with semantic tokens"
```

---

## Task 3: Replace Border Colors (112 occurrences)

**Files:** All files using `#ebebeb`, `#e5e5e5`, `#ddd`, `#f5f5f5`

**Step 1: Replace `#ebebeb` → `border-border` (64 uses)**

Key files:
- `features/director/project-details-page.tsx` (16 occurrences)
- `features/director/proposal-review-page.tsx` (6 occurrences)
- `features/director/director-dashboard-page.tsx` (6 occurrences)
- `features/director/faculty-directory-page.tsx` (2 occurrences)
- `features/director/moa-repository-page.tsx` (1 occurrence)
- `features/director/project-hub-page.tsx` (1 occurrence)
- `features/director/projects-chart.tsx` (2 occurrences)
- `features/director/projects-chart-card.tsx` (1 occurrence)
- `features/director/reports-page.tsx` (1 occurrence)
- `features/ret/faculty-directory-page.tsx` (7 occurrences)
- `features/ret/project-monitoring-page.tsx` (2 occurrences)
- `features/ret/ret-dashboard-page.tsx` (1 occurrence)
- `components/custom/metric-card.tsx` (2 occurrences)
- `components/ui/data-table.tsx` (2 occurrences)
- `features/admin/activity-log-page.tsx` (1 occurrence)
- `features/admin/users-page.tsx` (1 occurrence)
- `features/director/components/pdf-annotations.tsx` (1 occurrence)
- `features/director/components/pdf-toolbar.tsx` (3 occurrences)
- `features/proposals/components/create-proposal-modal.tsx` (2 occurrences)

**Step 2: Replace `#e5e5e5` → `border-border` (40 uses)**

Key files:
- `features/director/project-details-page.tsx` (6 occurrences)
- `features/director/proposal-review-page.tsx` (6 occurrences)
- `features/director/project-hub-page.tsx` (2 occurrences)
- `features/director/faculty-directory-page.tsx` (2 occurrences)
- `features/director/moa-repository-page.tsx` (1 occurrence)
- `features/director/reports-page.tsx` (1 occurrence)
- `features/ret/faculty-directory-page.tsx` (2 occurrences)
- `features/ret/project-monitoring-page.tsx` (1 occurrence)
- `features/ret/ret-dashboard-page.tsx` (1 occurrence)
- `components/custom/metric-card.tsx` (1 occurrence)
- `components/ui/data-table.tsx` (1 occurrence)
- `components/ui/pagination-bar.tsx` (1 occurrence)
- `components/ui/search-input.tsx` (1 occurrence)
- `components/ui/status-badge.tsx` (1 occurrence)
- `features/admin/activity-log-page.tsx` (2 occurrences)
- `features/admin/bulk-approve-dialog.tsx` (4 occurrences)
- `features/admin/users-page.tsx` (1 occurrence)
- `features/director/components/pdf-annotations.tsx` (1 occurrence)
- `features/director/components/pdf-toolbar.tsx` (2 occurrences)
- `features/proposals/components/proposal-step-documents.tsx` (2 occurrences)

**Step 3: Replace `#ddd` → `border-border` (4 uses)**

- `features/director/faculty-directory-page.tsx` (2 occurrences)
- `features/ret/faculty-directory-page.tsx` (1 occurrence)
- `components/custom/metric-card.tsx` (1 occurrence)

**Step 4: Replace `#f5f5f5` → `border-border/50` (5 uses)**

- `components/role-sidebar.tsx` (2 occurrences)
- `features/director/components/pdf-canvas.tsx` (2 occurrences)
- `features/director/pdf-inner.tsx` (1 occurrence)

**Step 5: Commit**

```bash
git add frontend/src/
git commit -m "refactor(ui): replace hardcoded border colors with semantic tokens"
```

---

## Task 4: Replace Background Colors (94 occurrences)

**Files:** All files using `bg-white`, `#fcfcfc`, `#f9f9f9`, `#fafafa`, `#f4f7fc`

**Step 1: Replace `bg-white` → `bg-background` (66 uses)**

Pervasive across nearly all files. Focus on:
- `features/director/project-details-page.tsx`
- `features/director/project-hub-page.tsx`
- `features/director/proposal-review-page.tsx`
- `features/admin/users-page.tsx`
- `features/ret/faculty-directory-page.tsx`
- `features/ret/project-monitoring-page.tsx`
- `features/ret/ret-dashboard-page.tsx`
- `components/custom/metric-card.tsx`
- `components/ui/data-table.tsx`

**Step 2: Replace `#fcfcfc` → `bg-card` (15 uses)**

- `features/director/project-details-page.tsx` (10 occurrences)
- `features/director/projects-chart.tsx` (1 occurrence)
- `features/proposals/components/create-proposal-modal.tsx` (1 occurrence)
- `features/proposals/components/proposal-step-documents.tsx` (2 occurrences)
- `components/ui/data-table.tsx` (1 occurrence)

**Step 3: Replace `#f9f9f9` → `bg-muted` (6 uses)**

- `features/admin/users-page.tsx` (1 occurrence)
- `features/director/faculty-directory-page.tsx` (1 occurrence)
- `features/director/moa-repository-page.tsx` (1 occurrence)
- `features/director/proposal-review-page.tsx` (1 occurrence)
- `features/ret/faculty-directory-page.tsx` (1 occurrence)
- `features/ret/project-monitoring-page.tsx` (1 occurrence)

**Step 4: Replace `#fafafa` → `bg-muted` (5 uses)**

- `features/director/faculty-directory-page.tsx` (1 occurrence)
- `features/director/moa-repository-page.tsx` (1 occurrence)
- `features/ret/faculty-directory-page.tsx` (1 occurrence)
- `features/ret/project-monitoring-page.tsx` (1 occurrence)
- `features/ret/ret-dashboard-page.tsx` (1 occurrence)

**Step 5: Replace `#f4f7fc` → `bg-primary/5` (2 uses)**

- `features/director/faculty-directory-page.tsx` (1 occurrence)
- `features/ret/faculty-directory-page.tsx` (1 occurrence)

**Step 6: Commit**

```bash
git add frontend/src/
git commit -m "refactor(ui): replace hardcoded background colors with semantic tokens"
```

---

## Task 5: Replace Brand/Heading Colors (49 occurrences)

**Files:** All files using `#11215a`, `#14369c`, `#1e3b8a`

**Step 1: Replace `#11215a` → `text-heading` (30 uses)**

Key files:
- `features/director/project-details-page.tsx` (6 occurrences)
- `features/director/director-dashboard-page.tsx` (3 occurrences)
- `features/director/faculty-directory-page.tsx` (3 occurrences)
- `features/director/proposal-review-page.tsx` (3 occurrences)
- `features/ret/faculty-directory-page.tsx` (2 occurrences)
- `features/ret/project-monitoring-page.tsx` (1 occurrence)
- `features/ret/ret-dashboard-page.tsx` (1 occurrence)
- `components/custom/metric-card.tsx` (3 occurrences)
- `features/admin/activity-log-page.tsx` (1 occurrence)
- `features/admin/users-page.tsx` (1 occurrence)
- `features/director/components/pdf-toolbar.tsx` (2 occurrences)
- `features/director/moa-repository-page.tsx` (1 occurrence)
- `features/director/project-hub-page.tsx` (1 occurrence)
- `features/director/reports-page.tsx` (1 occurrence)
- `features/proposals/components/create-proposal-modal.tsx` (1 occurrence)

**Step 2: Replace `#14369c` → `text-brand-primary` (15 uses)**

Key files:
- `features/director/proposal-review-page.tsx` (12 occurrences)
- `features/ret/faculty-directory-page.tsx` (1 occurrence)
- `features/ret/ret-dashboard-page.tsx` (1 occurrence)

**Step 3: Replace `#1e3b8a` → `text-brand-primary` (4 uses)**

- `features/director/reports-page.tsx` (2 occurrences)
- `features/ret/ret-dashboard-page.tsx` (2 occurrences)

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "refactor(ui): replace hardcoded brand colors with semantic tokens"
```

---

## Task 6: Replace Box Shadows (32 occurrences)

**Files:** All files using `rgba(0,0,0,0.1)`

**Step 1: Replace `rgba(0,0,0,0.1)` → `shadow-card` (32 uses)**

The shadow is typically used in patterns like:
```
shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]
shadow-[0px_4px_12px_0px_rgba(0,0,0,0.1)]
shadow-[0px_2px_4px_0px_rgba(0,0,0,0.1)]
```

Since these are all part of `shadow-[...]` patterns, replace the rgba value with `var(--shadow-card)` in the inline style, OR extract the common shadow patterns into utility classes.

Key files:
- `components/custom/metric-card.tsx` (2 occurrences)
- `features/admin/activity-log-page.tsx` (2 occurrences)
- `features/admin/bulk-approve-dialog.tsx` (5 occurrences)
- `features/admin/users-page.tsx` (2 occurrences)
- `features/director/director-dashboard-page.tsx` (2 occurrences)
- `features/director/faculty-directory-page.tsx` (1 occurrence)
- `features/director/moa-repository-page.tsx` (1 occurrence)
- `features/director/project-details-page.tsx` (7 occurrences)
- `features/director/projects-chart-card.tsx` (2 occurrences)
- `features/director/proposal-review-page.tsx` (2 occurrences)
- `features/director/reports-page.tsx` (1 occurrence)
- `features/ret/faculty-directory-page.tsx` (1 occurrence)
- `features/ret/project-monitoring-page.tsx` (1 occurrence)
- `features/ret/ret-dashboard-page.tsx` (3 occurrences)

**Step 2: Commit**

```bash
git add frontend/src/
git commit -m "refactor(ui): replace hardcoded box shadows with shadow-card token"
```

---

## Task 7: Replace Status Colors (11 occurrences)

**Files:** All files using `#22c55e`, `#10b981`, `#16a34a`, `#ef4444`, `#dc2626`, `#f59e0b`, `#ab6400`

**Step 1: Replace status colors**

- `#22c55e` (2x in metric-card.tsx) → `text-green-500`
- `#10b981` (1x in status-badge.tsx, 1x in pdf-canvas.tsx) → `text-emerald-500`
- `#16a34a` (1x in director-dashboard-page.tsx) → `text-green-600`
- `#ef4444` (1x in status-badge.tsx) → `text-red-500`
- `#dc2626` (1x in director-dashboard-page.tsx) → `text-red-600`
- `#f59e0b` (1x in director-dashboard-page.tsx) → `text-amber-500`
- `#ab6400` (1x in reports-page.tsx) → `text-amber-700`

**Step 2: Commit**

```bash
git add frontend/src/
git commit -m "refactor(ui): replace hardcoded status colors with Tailwind color utilities"
```

---

## Task 8: Replace Remaining Inline Style Colors

**Files:** All files using `style={{color: '#xxx'}}` or `style={{backgroundColor: '#xxx'}}`

**Step 1: Convert inline hex colors to Tailwind classes**

This covers cases where hex values are in `style` attributes rather than Tailwind classes. Convert to Tailwind utility classes where possible.

**Step 2: Commit**

```bash
git add frontend/src/
git commit -m "refactor(ui): convert remaining inline style colors to Tailwind classes"
```

---

## Verification

**Step 1: Search for remaining hardcoded hex values**

```bash
rg '#[0-9a-fA-F]{3,8}' frontend/src/components/ frontend/src/features/ --include='*.tsx' --include='*.ts' | grep -v 'node_modules' | grep -v '//' | head -50
```

Expected: Only intentional brand-specific hex values that shouldn't be tokenized (e.g., in PDF rendering, chart configs).

**Step 2: Run typecheck**

```bash
pnpm --filter frontend typecheck
```

Expected: PASS

**Step 3: Visual spot-check**

Open the app and verify no visual regressions on:
- Dashboard pages (director, ret, admin)
- Project hub / details pages
- Faculty directory pages
- Proposal wizard
- Status badges
- Data tables
