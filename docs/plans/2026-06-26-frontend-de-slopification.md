# Frontend De-Slopification Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate repeated patterns, extract shared components, and standardize styling across the frontend to improve DRY, maintainability, and consistency.

**Architecture:** Extract reusable components and utilities from repeated patterns. Standardize text sizes. Split oversized files. Enhance existing DataTable to handle boilerplate internally.

**Tech Stack:** React 19, TanStack Start, Tailwind CSS v4, @tanstack/react-table

---

## Execution Order

Tasks are ordered by dependency — earlier tasks produce components/utilities consumed by later tasks.

| Phase | Tasks | Rationale |
|-------|-------|-----------|
| 1 | H, K, M, P | No dependencies, quick wins |
| 2 | B | Mechanical text-size replacements, unblocks component work |
| 3 | A, C, E | Extract shared components/factories |
| 4 | N, F | DataTable enhancements (filter popover + auto header) |
| 5 | D | Depends on E (uses brand button variant) |
| 6 | G, I | Independent deep work |
| 7 | J | Depends on A, C, F, N — composite DataTablePage layout |

---

## Task H: Console.log/error Cleanup

**Files:**
- Modify: `frontend/src/features/admin/activity-log-page.tsx:74`
- Modify: `frontend/src/routes/login.tsx:79`
- Modify: `frontend/src/routes/register.tsx:123`
- Modify: `frontend/src/routes/register.account.tsx:78`
- Modify: `frontend/src/components/role-sidebar.tsx:95`

**Step 1: Remove placeholder console.log**

`activity-log-page.tsx:74` — remove `console.log("Exporting to CSV...");`. The CSV export is not implemented; this is a development leftover.

**Step 2: Replace console.error with toast**

- `login.tsx:79` — replace `console.error(err)` with `toast.error("Login failed. Please try again.")`
- `register.tsx:123` — replace `console.error(...)` with `toast.error("Failed to restore registration data.")`
- `register.account.tsx:78` — replace `console.error(...)` with `toast.error("Failed to check password safety.")`
- `role-sidebar.tsx:95` — replace `console.error(...)` with `toast.error("Logout failed.")`

Ensure `toast` from `sonner` is imported in each file.

**Step 3: Commit**

```bash
git commit -m "chore: replace console.log/error with proper toast notifications"
```

---

## Task K: Extract Inline onClick Handler

**Files:**
- Modify: `frontend/src/features/proposals/components/proposal-step-members.tsx:63-74`

**Step 1: Extract the 9-line onClick to a named function**

Move lines 63-74 to a `handleAddMember` function defined inside the component body, then reference it in the `onClick` prop.

**Step 2: Commit**

```bash
git commit -m "refactor(proposals): extract inline onClick handler to named function"
```

---

## Task M: Simplify 142-Line Skeleton

**Files:**
- Modify: `frontend/src/features/director/project-details-page.tsx:31-173`

**Step 1: Extract ProjectDetailsSkeleton to a separate file**

Move `ProjectDetailsSkeleton` (lines 31-173) to `frontend/src/features/director/project-details-skeleton.tsx`.

**Step 2: Replace inline card classes with PageCard (after Task A)**

Wait until Task A creates `PageCard`, then replace the repeated `rounded-[12px] border border-border bg-background shadow-[...]` in the skeleton with `<PageCard>`.

**Step 3: Commit**

```bash
git commit -m "refactor(director): extract ProjectDetailsSkeleton to separate file"
```

---

## Task P: Convert pdf-annotations Inline Styles

**Files:**
- Modify: `frontend/src/features/director/components/pdf-annotations.tsx:29-37`

**Step 1: Convert 7-property inline style to Tailwind**

The current inline style:
```tsx
style={{
  position: "absolute",
  left: `${annot.x}%`,
  top: `${annot.y}%`,
  width: `${annot.width}%`,
  height: `${annot.height}%`,
  zIndex: 20,
  pointerEvents: "auto",
}}
```

Keep `left`, `top`, `width`, `height` as inline styles (they're dynamic values from annotation data). Replace the static properties with Tailwind:
- `position: "absolute"` → remove (add `absolute` className)
- `zIndex: 20` → remove (add `z-20` className)
- `pointerEvents: "auto"` → remove (add `pointer-events-auto` className)

**Step 2: Commit**

```bash
git commit -m "refactor(director): convert static inline styles to Tailwind classes"
```

---

## Task B: Text Size Standardization

**Files:** All files in `frontend/src/features/` and `frontend/src/components/` that use `text-[14px]` or `text-[12px]`

**Replacement mapping:**

| Pattern | Tailwind Class | Notes |
|---------|----------------|-------|
| `text-[14px]` | `text-sm` | `text-sm` = 14px in Tailwind |
| `text-[12px]` | `text-xs` | `text-xs` = 12px in Tailwind |
| `text-[16px]` | `text-base` | `text-base` = 16px |
| `text-[24px]` | `text-xl` | `text-xl` = 24px |
| `text-[10px]` | Keep as-is | No Tailwind equivalent below `text-xs` |
| `text-[11px]` | Keep as-is | No Tailwind equivalent below `text-xs` |
| `text-[13px]` | Keep as-is | No exact Tailwind match |

**Key files (by occurrence count):**

- `features/director/project-details-page.tsx` (~30 occurrences)
- `features/director/proposal-review-page.tsx` (~15 occurrences)
- `features/director/project-hub-page.tsx` (~10 occurrences)
- `features/director/faculty-directory-page.tsx` (~10 occurrences)
- `features/director/moa-repository-page.tsx` (~8 occurrences)
- `features/director/reports-page.tsx` (~8 occurrences)
- `features/ret/faculty-directory-page.tsx` (~10 occurrences)
- `features/ret/project-monitoring-page.tsx` (~8 occurrences)
- `features/ret/ret-dashboard-page.tsx` (~5 occurrences)
- `features/admin/users-page.tsx` (~5 occurrences)
- `features/admin/activity-log-page.tsx` (~3 occurrences)
- `components/custom/metric-card.tsx` (~5 occurrences)

**IGNORE shadcn/diceui UI component files.**

**Important:** Do NOT change `text-[10px]`, `text-[11px]`, `text-[13px]` — no exact Tailwind match exists. Only replace `text-[14px]` → `text-sm`, `text-[12px]` → `text-xs`, `text-[16px]` → `text-base`, `text-[24px]` → `text-xl`.

**Step 1: Global search and replace**

Process each file, replacing all `text-[14px]` with `text-sm` and `text-[12px]` with `text-xs`.

**Step 2: Verify with grep**

```bash
grep -r 'text-\[14px\]' frontend/src/features/ frontend/src/components/
grep -r 'text-\[12px\]' frontend/src/features/ frontend/src/components/
```

Expected: Only stragglers in files not in scope (routes, shadcn).

**Step 3: Commit**

```bash
git commit -m "refactor(ui): replace hardcoded text-[14px]/[12px] with text-sm/text-xs"
```

---

## Task A: Extract PageCard Component

**Files:**
- Create: `frontend/src/components/custom/page-card.tsx`
- Modify: All files using the repeated card pattern (~10 files)

**Step 1: Create PageCard component**

Create `frontend/src/components/custom/page-card.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

interface PageCardProps {
  children: ReactNode;
  className?: string;
  /** Remove default overflow-hidden (e.g., for scrollable content) */
  noOverflow?: boolean;
}

export function PageCard({ children, className, noOverflow }: PageCardProps) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-border bg-background shadow-[0px_1px_3px_0px_var(--shadow-card)]",
        !noOverflow && "overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

**Step 2: Replace inline card classes in feature files**

Replace the repeated pattern in all files:
```tsx
// Before
<div className="rounded-[12px] border border-border bg-background shadow-[0px_1px_3px_0px_var(--shadow-card)] overflow-hidden">

// After
<PageCard>
```

Files to update (from exploration):
- `features/director/project-details-page.tsx` (6 occurrences)
- `features/director/director-dashboard-page.tsx` (2 occurrences)
- `features/director/reports-page.tsx` (1 occurrence)
- `features/director/proposal-review-page.tsx` (1 occurrence)
- `features/director/moa-repository-page.tsx` (1 occurrence)
- `features/ret/ret-dashboard-page.tsx` (1 occurrence)
- `features/ret/project-monitoring-page.tsx` (1 occurrence)
- `features/ret/faculty-directory-page.tsx` (1 occurrence)
- `features/admin/users-page.tsx` (1 occurrence)
- `features/admin/activity-log-page.tsx` (1 occurrence)

**Step 3: Commit**

```bash
git commit -m "refactor(ui): extract PageCard component for repeated card layout"
```

---

## Task C: Extract Actions Column Factory

**Files:**
- Create: `frontend/src/components/custom/data-table-columns.tsx`
- Modify: All 8 files with identical actions column definitions

**Step 1: Create actions column factory**

Create `frontend/src/components/custom/data-table-columns.tsx`:

```tsx
import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";

interface CreateActionsColumnOptions<TData> {
  /** Accessor for the row data (used for aria-label) */
  labelAccessor?: (row: TData) => string;
  /** Custom cell renderer for the actions */
  cell?: DataTableColumnDef<TData>["cell"];
}

export function createActionsColumn<TData>(
  options?: CreateActionsColumnOptions<TData>,
): DataTableColumnDef<TData> {
  return {
    id: "actions",
    header: "",
    headerClassName: "w-[50px]",
    cellClassName: "px-4 py-3 text-right",
    cell: options?.cell ?? (() => (
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground"
        aria-label="More actions"
      >
        <EllipsisVertical className="size-4" />
      </Button>
    )),
  };
}
```

**Step 2: Replace inline actions columns in each file**

Replace the identical actions column definition with `createActionsColumn()`.

Files: `project-hub-page.tsx`, `faculty-directory-page.tsx` (director), `moa-repository-page.tsx`, `reports-page.tsx`, `project-monitoring-page.tsx`, `faculty-directory-page.tsx` (ret), `users-page.tsx`, `activity-log-page.tsx`.

For `ret-dashboard-page.tsx` which has a custom DropdownMenu actions column, pass a custom `cell` option.

**Step 3: Commit**

```bash
git commit -m "refactor(ui): extract actions column factory for DataTable"
```

---

## Task E: Create Brand Button Variant

**Files:**
- Create: `frontend/src/components/custom/brand-button.tsx`
- Modify: All 8 files using the repeated brand button style

**Step 1: Create BrandButton component**

Create `frontend/src/components/custom/brand-button.tsx`:

```tsx
import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "#/lib/utils";

export const BrandButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => (
    <Button
      ref={ref}
      className={cn(
        "bg-brand-primary text-white hover:bg-brand-primary/90 rounded-[10px] gap-2",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  ),
);
BrandButton.displayName = "BrandButton";
```

**Step 2: Replace inline brand button classes**

Replace in all files that use the `bg-brand-primary text-white hover:bg-brand-primary/90 rounded-[10px]` pattern.

**Step 3: Commit**

```bash
git commit -m "refactor(ui): extract BrandButton component"
```

---

## Task N: Standardize Filter Popover as DataTableFilter

**Files:**
- Create: `frontend/src/components/custom/data-table-filter.tsx`
- Modify: Feature pages using filter popovers

**Step 1: Analyze current filter patterns**

Current filter patterns are either:
- `Select` components (project-hub, ret-dashboard) — simple dropdown
- Custom `Popover` + button (faculty-directory, project-monitoring) — more complex

**Step 2: Create DataTableFilter wrapper**

Create `frontend/src/components/custom/data-table-filter.tsx` that wraps the common filter pattern (icon + label + select/popover). This is a thin wrapper, not an abstraction — it just standardizes the visual pattern.

```tsx
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "#/lib/utils";

interface DataTableFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  className?: string;
}

export function DataTableFilter({
  value,
  onValueChange,
  placeholder = "All",
  options,
  className,
}: DataTableFilterProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "h-9 w-[180px] rounded-lg border-border bg-background shadow-sm",
          className,
        )}
      >
        <Filter className="mr-2 size-4 text-muted-foreground" />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Step 3: Replace inline filter patterns in feature files**

Replace the repeated `Select` + `Filter` icon pattern with `<DataTableFilter>`.

**Step 4: Commit**

```bash
git commit -m "refactor(ui): standardize filter dropdown as DataTableFilter component"
```

---

## Task F: Move showTableHeader Logic into DataTable

**Files:**
- Modify: `frontend/src/components/ui/data-table.tsx`
- Modify: All 9 feature pages computing `showTableHeader`

**Step 1: Update DataTable to compute showHeader internally**

The DataTable already receives `data` and can receive optional `filters`:

```tsx
interface DataTableProps<TData, TValue> {
  // ...existing props...
  /** Active filters — used to auto-determine if header should show */
  activeFilters?: Record<string, unknown>;
}
```

Inside DataTable, compute:
```tsx
const showHeader = showHeaderProp ?? (
  data.length > 0 ||
  Object.values(activeFilters ?? {}).some(v => v && String(v).trim().length > 0)
);
```

Accept `showHeader` as an optional override (backward compatible). If not provided, compute it from `data.length` + `activeFilters`.

**Step 2: Update feature pages to pass activeFilters**

Replace the manual `showTableHeader` computation in each page with passing `activeFilters` to DataTable:

```tsx
// Before
const showTableHeader = items.length > 0 || (search ?? "").trim().length > 0;

// After — remove the manual computation, pass filters to DataTable
<DataTable
  activeFilters={{ search, status, college }}
  ...
/>
```

**Step 3: Commit**

```bash
git commit -m "refactor(ui): move showTableHeader logic into DataTable component"
```

---

## Task G: Remove data?.items ?? [] Boilerplate

**Files:**
- Modify: Feature pages with the pattern (7 files)

**Step 1: Ensure query options return defaults**

This is a data-layer fix. The query functions should return `{ items: [], total: 0 }` even when the backend returns null/undefined. Check each query function in `lib/*.functions.ts` and add defaults.

**Step 2: Simplify feature pages**

Replace:
```tsx
const items = data?.items ?? [];
const total = data?.total ?? 0;
```

With:
```tsx
const { items, total } = data;
```

**Step 3: Commit**

```bash
git commit -m "refactor: remove data?.items boilerplate by defaulting query returns"
```

---

## Task I: Split proposal-review-page.tsx

**Files:**
- Create: `frontend/src/features/director/components/proposal-details-tab.tsx`
- Create: `frontend/src/features/director/components/comments-tab.tsx`
- Modify: `frontend/src/features/director/proposal-review-page.tsx`

**Step 1: Extract ProposalDetailsTab**

Move the `ProposalDetailsTab` component to `components/proposal-details-tab.tsx`. It receives props for proposal data.

**Step 2: Extract CommentsTab**

Move the `CommentsTab` component to `components/comments-tab.tsx`. It receives props for comments data.

**Step 3: Update imports in proposal-review-page.tsx**

Import the extracted components. The file should drop from ~684 lines to ~400 lines.

**Step 4: Commit**

```bash
git commit -m "refactor(director): split proposal-review-page into separate tab components"
```

---

## Task J: Create DataTablePage Layout Component

**Files:**
- Create: `frontend/src/components/custom/data-table-page.tsx`
- Modify: All 9 feature pages with the DataTable + Search + Filter + PaginationBar pattern

**Step 1: Create DataTablePage component**

Create `frontend/src/components/custom/data-table-page.tsx`:

```tsx
import type { ReactNode } from "react";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchInput } from "@/components/ui/search-input";
import { PageCard } from "./page-card";

interface DataTablePageProps<TData> {
  // Data
  data: TData[];
  total: number;
  isLoading: boolean;
  // Table config
  columns: DataTableColumnDef<TData>[];
  emptyMessage?: string;
  ariaLabel?: string;
  onRowClick?: (item: TData) => void;
  // Pagination
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  // Search
  search?: string;
  onSearch?: (search: string) => void;
  searchPlaceholder?: string;
  // Filters (slot)
  filters?: ReactNode;
  // Header
  title?: ReactNode;
  actions?: ReactNode;
  // Active filters (for auto showHeader)
  activeFilters?: Record<string, unknown>;
}

export function DataTablePage<TData>({
  data,
  total,
  isLoading,
  columns,
  emptyMessage,
  ariaLabel,
  onRowClick,
  page,
  pageSize,
  onPageChange,
  search,
  onSearch,
  searchPlaceholder,
  filters,
  title,
  actions,
  activeFilters,
}: DataTablePageProps<TData>) {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      {(title || actions) && (
        <div className="flex items-start justify-between">
          {title && <div>{title}</div>}
          {actions && <div>{actions}</div>}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex items-center justify-between gap-4">
        {onSearch && (
          <SearchInput
            value={search ?? ""}
            onChange={onSearch}
            placeholder={searchPlaceholder}
            ariaLabel={searchPlaceholder}
            className="max-w-[352px]"
          />
        )}
        {filters && <div className="flex items-center gap-2">{filters}</div>}
      </div>

      {/* Table */}
      <PageCard>
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          ariaLabel={ariaLabel}
          onRowClick={onRowClick}
          activeFilters={activeFilters}
        />
      </PageCard>

      {/* Pagination */}
      <PaginationBar
        page={page}
        totalPages={Math.ceil(total / pageSize)}
        onPageChange={onPageChange}
        total={total}
        limit={pageSize}
        isLoading={isLoading}
      />
    </div>
  );
}
```

**Step 2: Replace DataTable + SearchInput + PaginationBar pattern in each page**

Refactor each feature page to use `<DataTablePage>` instead of the manual layout. This will significantly reduce boilerplate in:
- `features/director/project-hub-page.tsx` (230 → ~120 lines)
- `features/director/moa-repository-page.tsx`
- `features/director/reports-page.tsx`
- `features/director/faculty-directory-page.tsx`
- `features/ret/ret-dashboard-page.tsx`
- `features/ret/project-monitoring-page.tsx`
- `features/ret/faculty-directory-page.tsx`
- `features/admin/users-page.tsx`
- `features/admin/activity-log-page.tsx`

Each page keeps its own columns definition and query logic, but the layout shell is shared.

**Step 3: Commit**

```bash
git commit -m "refactor(ui): extract DataTablePage layout component from repeated pattern"
```

---

## Verification

After all tasks:

**Step 1: Run typecheck**

```bash
pnpm --filter frontend typecheck
```

Expected: PASS

**Step 2: Grep for remaining hardcoded text sizes**

```bash
grep -r 'text-\[14px\]' frontend/src/features/ frontend/src/components/
grep -r 'text-\[12px\]' frontend/src/features/ frontend/src/components/
```

Expected: Only stragglers in files intentionally left as-is.

**Step 3: Grep for remaining repeated card pattern**

```bash
grep -r 'rounded-\[12px\] border border-border bg-background shadow-' frontend/src/features/
```

Expected: Only remaining in files not yet migrated (if any).

**Step 4: Visual spot-check**

Open the app and verify:
- Dashboard pages render correctly
- Tables display properly with pagination
- Filters work
- Card styling is consistent
- No visual regressions
