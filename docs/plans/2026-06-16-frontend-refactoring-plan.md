# Frontend Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate pervasive duplication, standardize inconsistent patterns, and simplify over-engineered code across the frontend.

**Architecture:** Five sequential phases: (1) create reusable shared components, (2) adopt them across all list pages, (3) fix structural inconsistencies (AppShell, tokens, permissions), (4) simplify over-engineered state management, (5) split overly large components. Each phase is independent of later phases.

**Tech Stack:** TanStack Start (SSR) + TanStack Router + TanStack Query + React Hook Form + shadcn/ui + Supabase auth

---

### Task 0: Verify project builds and tests pass before refactoring

**Files:**
- Root: `package.json`

**Step 1: Run the existing build to establish a baseline**

Run:
```bash
npm run build
```
Expected: Build succeeds with no errors.

**Step 2: Run any existing linter**

Run:
```bash
npm run lint
```
Expected: No errors (pre-existing warnings are OK — note them).

**Step 3: Run type checking**

Run:
```bash
npm run typecheck
```
Expected: No type errors.

**Step 4: Record baseline**

```
Everything must pass before any changes.
```

---

### Task 1: Extract `<SearchInput>` shared component

**Files:**
- Create: `frontend/src/components/ui/search-input.tsx`

**Description:** A reusable search input that standardizes on the debounced pattern. All 7 list pages currently duplicate the `Search` icon + `Input` + positioning CSS. This component consolidates that.

**Props:**
```tsx
interface SearchInputProps {
  value: string
  onChange: (value: string) => void    // called after debounce
  placeholder?: string
  ariaLabel?: string
  debounceMs?: number                   // default 300; 0 = immediate
  className?: string
}
```

**Implementation:**
- Uses `useRef<ReturnType<typeof setTimeout>>` for debounce
- Immediately updates local input state, debounces the `onChange` callback
- Renders `<div>` wrapper (not `<form>`) with absolutely-positioned `Search` icon
- Uses `Input` from `@/components/ui/input`
- Default styling: `h-9 rounded-lg border-[#e5e5e5] bg-white pl-9 shadow-none placeholder:text-[#737373]`

**No tests needed** — pure presentational with one effect.

**Commit:** `git commit -m "feat: add reusable SearchInput component with debounce"`

---

### Task 2: Extract `<PaginationBar>` shared component

**Files:**
- Create: `frontend/src/components/ui/pagination-bar.tsx`

**Description:** A reusable pagination bar with sliding window + smart ellipsis (the project-hub pattern), used across all 7 list pages.

**Props:**
```tsx
interface PaginationBarProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  total: number
  limit: number
  isLoading?: boolean
  className?: string
}
```

**Implementation:**
- Always shows page 1 and last page
- Shows `page-1`, `page`, `page+1` when within range
- Inserts `PaginationEllipsis` at gaps
- Shows "Showing X to Y of Z results" on the left using range calculation
- Uses shadcn `<Pagination>` wrapper components
- Prev/Next use `<Button>` with ChevronLeft/ChevronRight icons
- Page number buttons use active-state outline styling
- All pages hidden when `totalPages <= 1`

**No tests needed** — pure presentational. Ensure it matches the project-hub sliding window exactly.

**Commit:** `git commit -m "feat: add reusable PaginationBar component with sliding window"`

---

### Task 3: Extract `<DataTable>` wrapper component

**Files:**
- Create: `frontend/src/components/ui/data-table.tsx`

**Description:** A wrapper around `<Table>` that handles loading, empty, and error states consistently across all list pages.

**Props:**
```tsx
interface DataTableProps<T> {
  columns: { key: string; label: string; className?: string }[]
  data: T[]
  renderRow: (item: T) => React.ReactNode
  isLoading?: boolean
  isEmpty?: boolean
  error?: string | null
  emptyMessage?: string
  loadingMessage?: string
  errorMessage?: string
  colSpan: number
  showHeader?: boolean
  className?: string
  'aria-label'?: string
}
```

**Implementation:**
- Loading state: full-width `Loader2` spinner in a `<TableRow>`
- Empty state: "No records found" text in a centered `<TableCell>`
- Error state: error message in a centered `<TableCell>`
- Data state: maps `data` through `renderRow`
- When `isLoading` is true but data exists (background refetch), only the loading row shows (data is preserved underneath — actually no, we want to match existing behavior which is either overlay OR spinner-in-table)
  - `showHeader` controls whether `<TableHeader>` renders
- Uses shadcn `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>` from `@/components/ui/table`

**No tests needed** — pure presentational.

**Commit:** `git commit -m "feat: add reusable DataTable wrapper with loading/empty/error states"`

---

### Task 4: Adopt `<SearchInput>` across all list pages + bulk-approve-dialog

**Files:**
- Modify: `features/admin/users-page.tsx` (lines 97–163)
- Modify: `features/admin/activity-log-page.tsx` (lines 96–152)
- Modify: `features/director/moa-repository-page.tsx` (lines 107–165)
- Modify: `features/director/faculty-directory-page.tsx` (lines 64–138)
- Modify: `features/director/project-hub-page.tsx` (lines 116–154)
- Modify: `features/director/reports-page.tsx` (lines 44, 88–98)
- Modify: `features/ret/ret-dashboard-page.tsx` (lines 65, 76–79, 135–148)
- Modify: `features/admin/bulk-approve-dialog.tsx` (lines 244–255)

**Changes per file:**

For each file:
1. Remove the local `Search` icon + `Input` JSX + wrapper div/form
2. Import `SearchInput` from `@/components/ui/search-input`
3. Replace with `<SearchInput value={searchVar} onChange={handler} placeholder="..." ariaLabel="..." />`
4. Remove the local `debounceRef` and `debouncedSearch` function if present
5. Remove the `handleSearchSubmit` and `<form>` wrapper if present (for form-submit pages)
6. Rename state variables for consistency where needed (e.g., `localSearch` → `search`)

**Key details:**
- For form-submit pages (`users-page`, `activity-log-page`, `ret-dashboard-page`): the `onSearch` prop callback becomes the `onChange` prop. The search fires after 300ms debounce instead of on Enter.
- For `reports-page`: the local `search` state stays (passed to the route query), but now gets debounced via the component instead of firing on every keystroke. The `setSearch` call in `onChange` is replaced.
- For bulk-approve-dialog: replace the dispatch-based search with the debounced component.

**Commit:** `git commit -m "refactor: adopt SearchInput across all list pages"`

---

### Task 5: Adopt `<PaginationBar>` across all list pages

**Files:**
- Modify: `features/admin/users-page.tsx` (lines 295–330)
- Modify: `features/admin/activity-log-page.tsx` (lines 272–319)
- Modify: `features/director/moa-repository-page.tsx` (lines 257–346)
- Modify: `features/director/faculty-directory-page.tsx` (lines 264–324)
- Modify: `features/director/project-hub-page.tsx` (lines 300–375)
- Modify: `features/director/reports-page.tsx` (lines 214–249)
- Modify: `features/ret/ret-dashboard-page.tsx` (lines 286–321)
- Modify: `features/admin/bulk-approve-dialog.tsx` (lines 371–410)

**Changes per file:**

For each file:
1. Remove the entire pagination JSX block
2. Import `PaginationBar` from `@/components/ui/pagination-bar`
3. Replace with `<PaginationBar page={page} totalPages={totalPages} onPageChange={onPageChange} total={total} limit={limit} isLoading={isLoading} />`
4. Compute `totalPages = Math.ceil(total / limit)` if not already present
5. For `reports-page`: since it manages its own page state locally, keep the `useState(1)` and `limit = 20`, just replace the JSX

**Commit:** `git commit -m "refactor: adopt PaginationBar across all list pages"`

---

### Task 6: Adopt `<DataTable>` across all list pages

**Files:**
- Modify: `features/admin/users-page.tsx`
- Modify: `features/director/moa-repository-page.tsx`
- Modify: `features/director/faculty-directory-page.tsx`
- Modify: `features/director/project-hub-page.tsx`
- Modify: `features/director/reports-page.tsx`

**Changes per file:**

For each file:
1. Remove the `<Table>`, `<TableHeader>`, `<TableBody>` loading/empty/error conditional rendering
2. Keep the existing `renderRow` logic (the `<TableRow>` for each data item)
3. Import `DataTable` from `@/components/ui/data-table`
4. Define columns config array
5. Replace with `<DataTable columns={columns} data={items} renderRow={renderRow} isLoading={isLoading} isEmpty={items.length === 0} error={error} colSpan={N} showHeader={showTableHeader} />`

**Special cases:**
- `users-page.tsx` uses a richer `<Empty>` component for the empty state — keep this by providing `emptyMessage` as `<Empty>` JSX or keep the existing inline empty rendering as the `emptyContent` slot
- `users-page.tsx` has a background refetch overlay — the DataTable should match this behavior when `isFetching` is true but data exists

**Commit:** `git commit -m "refactor: adopt DataTable across all list pages"`

---

### Task 7: Move `AppShell` into `_authenticated.tsx` layout

**Files:**
- Modify: `routes/_authenticated.tsx` (add AppShell wrapper)
- Modify: `routes/_authenticated/dashboard.tsx` (remove AppShell from 3 branches)
- Modify: `routes/_authenticated/admin.tsx` (remove AppShell wrapper around Outlet)
- Modify: `features/director/project-details-page.tsx` (remove AppShell)
- Modify: `features/director/proposal-review-page.tsx` (remove AppShell)
- Modify: `features/director/project-hub-page.tsx` (remove AppShell)
- Modify: `features/director/faculty-directory-page.tsx` (remove AppShell)
- Modify: `features/director/moa-repository-page.tsx` (remove AppShell)
- Modify: `features/director/reports-page.tsx` (remove AppShell)
- Modify: `features/ret/faculty-directory-page.tsx` (remove AppShell)

**Changes:**

1. In `routes/_authenticated.tsx`:
```tsx
import { AppShell } from "@/features/layout/app-shell";

// In the component:
component: () => (
  <AppShell>
    <Outlet />
  </AppShell>
),
```

2. In `routes/_authenticated/dashboard.tsx`:
- Remove the 3 `<AppShell>` wrappers around each role dashboard
- The component just renders the role-based page directly

3. In `routes/_authenticated/admin.tsx`:
- Remove `<AppShell>` from `AdminLayout`
- Just render `<Outlet />`

4. In all 7 feature-level pages:
- Remove the `import { AppShell } from ...` line
- Remove the `<AppShell>` wrapping JSX
- The inner content becomes the direct return value

**Commit:** `git commit -m "refactor: move AppShell into _authenticated layout route"`

---

### Task 8: Standardize server function token retrieval on `getValidAccessToken()`

**Files:**
- Modify: `lib/dashboard.functions.ts` (8 call sites)
- Modify: `lib/admin.functions.ts` (7 call sites)
- Modify: `lib/comments.functions.ts` (2 call sites)
- Modify: `lib/auth.functions.ts` (3 call sites — already has both patterns)

**Changes per file:**

For each call site where `getAppSession()` is used to get tokens:
1. Change import from `getAppSession` to `getValidAccessToken` (or add it alongside)
2. Replace:
```ts
const session = await getAppSession();
const token = session.data.accessToken;
```
with:
```ts
const token = await getValidAccessToken();
```

3. Remove the `session.data.refreshToken` usage if that was being read separately

**Commit:** `git commit -m "refactor: standardize all server functions on getValidAccessToken"`

---

### Task 9: Create permission abstraction for role checks

**Files:**
- Create: `frontend/src/lib/permissions.ts`
- Modify: `routes/_authenticated.tsx` (add user context passing if needed)
- Modify: `routes/_authenticated/dashboard.tsx` (replace magic strings)
- Modify: `routes/_authenticated/admin.tsx` (replace magic strings)
- Modify: `routes/_authenticated/admin/users/index.tsx` (replace magic strings)
- Modify: `routes/_authenticated/admin/activity-log/index.tsx` (replace magic strings)
- Modify: `routes/_authenticated/admin/settings/index.tsx` (replace magic strings)
- Modify: `routes/_authenticated/projects/index.tsx` (replace magic strings)
- Modify: `routes/_authenticated/faculty/index.tsx` (replace magic strings)
- Modify: `routes/_authenticated/moas/index.tsx` (replace magic strings)
- Modify: `features/layout/app-sidebar.tsx` (replace magic strings)
- Modify: `features/director/moa-repository-page.tsx` (replace magic strings)
- Modify: `routes/login.tsx` (replace magic strings)

**Implementation:**

Create `lib/permissions.ts`:
```ts
export type RoleName = "Super Admin" | "Director" | "RET Chair"

export const ROLES = {
  SUPER_ADMIN: "Super Admin" as RoleName,
  DIRECTOR: "Director" as RoleName,
  RET_CHAIR: "RET Chair" as RoleName,
} as const

export function hasRole(user: { roleName?: string } | null | undefined, ...roles: RoleName[]): boolean {
  if (!user) return false
  return roles.includes(user.roleName as RoleName)
}

export function isSuperAdmin(user: { roleName?: string } | null | undefined): boolean {
  return hasRole(user, ROLES.SUPER_ADMIN)
}

export function isDirector(user: { roleName?: string } | null | undefined): boolean {
  return hasRole(user, ROLES.DIRECTOR)
}

export function isRETChair(user: { roleName?: string } | null | undefined): boolean {
  return hasRole(user, ROLES.RET_CHAIR)
}

export function isAdminOrDirector(user: { roleName?: string } | null | undefined): boolean {
  return hasRole(user, ROLES.SUPER_ADMIN, ROLES.DIRECTOR)
}

// Convenience for route guards: returns a redirect condition
export function requireRole(user: { roleName?: string } | null | undefined, ...roles: RoleName[]): boolean {
  return !hasRole(user, ...roles)
}
```

Then in route files, replace:
```ts
context.auth.user?.roleName !== "Super Admin"
```
with:
```ts
requireRole(context.auth.user, 'Super Admin')
```

And in components, replace:
```ts
user?.roleName === "Director" || user?.roleName === "Super Admin"
```
with:
```ts
hasRole(user, 'Director', 'Super Admin')
```

**Commit:** `git commit -m "feat: add permission abstraction, replace magic string role checks"`

---

### Task 10: Replace `useReducer` with `useState` in bulk-approve-dialog

**Files:**
- Modify: `features/admin/bulk-approve-dialog.tsx`

**Changes:**

Replace the reducer + action types + initial state with three separate `useState` calls:

```tsx
const [open, setOpen] = React.useState(false)
const [page, setPage] = React.useState(1)
const [search, setSearch] = React.useState("")
const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set())
const [userRoles, setUserRoles] = React.useState<Record<string, string>>({})
```

Replace dispatch calls:
- `dispatch({ type: "SET_OPEN", payload: true })` → `setOpen(true)`
- `dispatch({ type: "SET_PAGE", payload: n })` → `setPage(n)`
- `dispatch({ type: "SET_SEARCH", payload: s })` → `setSearch(s)`
- `dispatch({ type: "TOGGLE_USER", ... })` → inline set/delete on the Set
- `dispatch({ type: "SELECT_ALL", ... })` → inline add/delete loop
- `dispatch({ type: "SET_USER_ROLE", ... })` → `setUserRoles(prev => ({ ...prev, [userId]: roleName }))`
- `dispatch({ type: "RESET" })` → call all setters with initial values

Remove: the `State` type, `Action` union type, `initialState`, and `reducer` function.

**Important:** The `selectedUsers` Set needs careful handling since React requires referential equality for re-renders. Use `new Set(prev)` to create new instances:
```tsx
const handleSelectRow = (userId: string, checked: boolean) => {
  setSelectedUsers(prev => {
    const next = new Set(prev)
    if (checked) next.add(userId)
    else next.delete(userId)
    return next
  })
}
```

**Commit:** `git commit -m "refactor: replace useReducer with useState in BulkApproveDialog"`

---

### Task 11: Extract inline sub-components

**Files:**
- Create (or find appropriate homes): various `features/**/components/` directories
- Modify: source files to use the extracted components

**Target components to extract:**

| Component | Current file | New location |
|---|---|---|
| `StatusBadge` | `features/admin/users-page.tsx:335` | `features/admin/components/status-badge.tsx` |
| `MoaStatusBadge` | `features/director/moa-repository-page.tsx:40` | `features/director/components/moa-status-badge.tsx` |
| `ProjectStatusBadge` | `features/director/project-hub-page.tsx:44` | `features/director/components/project-status-badge.tsx` |
| `ProposalStatusBadge` | `features/ret/ret-dashboard-page.tsx:331` | `features/ret/components/proposal-status-badge.tsx` |
| `RecentActivitiesCard` | `features/director/director-dashboard-page.tsx:17` | `features/director/components/recent-activities-card.tsx` |
| `ExpiringMoasCard` | `features/director/director-dashboard-page.tsx:73` | `features/director/components/expiring-moas-card.tsx` |

**For each extraction:**
1. Create the new file with the component definition
2. Export it as a named export
3. Import it in the original file
4. Verify the import path is correct

**Note:** If a status badge is a single-line render function (e.g., `<Badge>{status}</Badge>`), YAGNI applies — only extract if it has meaningful styling or logic beyond a simple Badge wrapper.

**Commit:** `git commit -m "refactor: extract inline sub-components to dedicated files"`

---

### Task 12: Split `pdf-inner.tsx` into focused modules

**Files:**
- Create: `features/director/components/pdf-canvas.tsx`
- Create: `features/director/components/pdf-annotations.tsx`
- Create: `features/director/components/pdf-toolbar.tsx`
- Modify: `features/director/pdf-inner.tsx`

**Current state:** 939 lines containing canvas rendering, annotation popovers, keyboard shortcuts, IntersectionObservers, floating toolbars.

**Proposed split:**
1. **`pdf-canvas.tsx`** — Canvas rendering logic, page management, scroll/IntersectionObserver
2. **`pdf-annotations.tsx`** — Annotation data model, popover UI, add/edit/delete
3. **`pdf-toolbar.tsx`** — Floating toolbar, zoom controls, search in document, keyboard shortcuts
4. **`pdf-inner.tsx`** becomes an orchestrator that imports and composes the three sub-components

**Caution:** This is a high-risk refactor. The PDF viewer has tight coupling between canvas rendering and annotation positioning. Approach:
1. First, identify the exact interface boundaries between the three modules
2. Extract one module at a time, starting with the toolbar (most independent)
3. Run the build/typecheck after each extraction

**Commit sequence:**
```bash
git commit -m "refactor: extract PdfToolbar from pdf-inner"
git commit -m "refactor: extract PdfAnnotations from pdf-inner"
git commit -m "refactor: extract PdfCanvas from pdf-inner"
```

---

### Task 13: Split `create-proposal-modal.tsx` into step components

**Files:**
- Create: `features/proposals/components/proposal-step-info.tsx`
- Create: `features/proposals/components/proposal-step-details.tsx`
- Create: `features/proposals/components/proposal-step-documents.tsx`
- Create: `features/proposals/components/proposal-step-review.tsx`
- Modify: `features/proposals/components/create-proposal-modal.tsx`

**Current state:** 935 lines containing a 4-step wizard with form state, file upload with simulated progress, user search with deferred value.

**Proposed split:**
1. **`proposal-step-info.tsx`** — Basic proposal information form step
2. **`proposal-step-details.tsx`** — Detailed fields step
3. **`proposal-step-documents.tsx`** — File upload step with progress simulation
4. **`proposal-step-review.tsx`** — Review and submit step
5. **`create-proposal-modal.tsx`** — Orchestrates steps, manages wizard state, form context, and submission

**Approach:** Same as Task 12 — extract one step at a time, verify after each.

**Commit sequence:**
```bash
git commit -m "refactor: extract ProposalStepInfo from create-proposal-modal"
git commit -m "refactor: extract ProposalStepDetails from create-proposal-modal"
git commit -m "refactor: extract ProposalStepDocuments from create-proposal-modal"
git commit -m "refactor: extract ProposalStepReview from create-proposal-modal"
```

---

### Verification

After each phase completes:

**Step 1:** Run build
```bash
npm run build
```
Expected: Build succeeds with no errors.

**Step 2:** Run typecheck
```bash
npm run typecheck
```
Expected: No type errors.

**Step 3:** Run linter
```bash
npm run lint
```
Expected: No new errors introduced.

**After all phases complete:** Run the full verification suite and confirm the app still works correctly.
