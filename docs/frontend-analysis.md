# Frontend Architecture Analysis

Stack: TanStack Start (SSR) + TanStack Router + TanStack Query + React Hook Form + shadcn/ui + Supabase auth.

Structure: feature-based folders (`features/{role}/`), shared UI (`components/ui/`), custom shared components (`components/custom/`), server functions (`lib/*.functions.ts`), route definitions (`routes/`).

---

## Strengths

### Separation of Concerns
- Route files handle URL parsing, auth guards, and data prefetching only — no rendering logic.
- Feature files compose pages and manage state.
- `.functions.ts` convention cleanly separates server-only code (build replaces them with RPC stubs on the client).
- `lib/` files contain all API interaction logic.
- `components/ui/` are pure presentation, zero business logic.

### Modularity
- Role-based directory structure (`admin/`, `director/`, `ret/`) maps clearly to domains.
- Each feature page is a self-contained module with a typed props interface.

### Loose Coupling (data layer)
- Routes pass data down via props to feature components — features don't import routes.
- Query options are exported as functions, centralizing cache key + fetch logic.
- `PdfViewer`/`PdfInner` split with `forwardRef` is a clean abstraction boundary.

### Robustness
- Typed `ApiErrorResponse` error handling in all server functions.
- Session token refresh with JWT expiry check (`getValidAccessToken()`).
- `isDestroyed` flags prevent state updates after unmount in the PDF renderer.
- Input validation with Zod schemas on both client and server.

---

## Areas Needing Improvement

### 1. DRY — Pagination Duplicated ~7x

Every list page reimplements pagination with nearly identical markup:

| File | Lines |
|---|---|
| `features/admin/users-page.tsx` | 295–331 |
| `features/admin/activity-log-page.tsx` | 272–319 |
| `features/director/moa-repository-page.tsx` | 257–345 |
| `features/director/faculty-directory-page.tsx` | 264–323 |
| `features/director/project-hub-page.tsx` | 300–375 |
| `features/director/reports-page.tsx` | 215–249 |
| `features/ret/ret-dashboard-page.tsx` | 287–321 |

**Fix:** Extract a reusable `<PaginationBar>` component accepting `page`, `totalPages`, `onPageChange`, `total`, `pageSize`.

### 2. DRY — Search Input Pattern Duplicated

Search bars with `Search` icon + `Input` are duplicated across the same 7+ files.

**Fix:** Extract a `<SearchInput>` component.

### 3. DRY — Table Loading / Empty / Error States

Every table page repeats the same patterns: loading spinner row, "No records found" row, error state, conditional table header visibility.

**Fix:** Extract a `<DataTable>` wrapper handling loading/empty/error states uniformly, accepting columns config and data.

### 4. Flexibility — Role Checks via Magic Strings

`user.roleName === "Super Admin"` comparisons scattered across files:

| File | Lines |
|---|---|
| `routes/_authenticated/dashboard.tsx` | 31–34 |
| `routes/_authenticated/projects/index.tsx` | 24 |
| `routes/_authenticated/faculty/index.tsx` | 23–27 |
| `routes/_authenticated/moas/index.tsx` | 22–26 |
| `routes/_authenticated/admin/users/index.tsx` | 23 |
| `routes/_authenticated/admin/activity-log/index.tsx` | 14 |
| `features/layout/app-sidebar.tsx` | 154–158 |

Brittle — renaming a role breaks the app silently.

**Fix:** Use role IDs or a `hasPermission(role, action)` abstraction.

### 5. Reusability — Inline Sub-Components

Defined inside feature files instead of extracted:

| Component | File |
|---|---|
| `RecentActivitiesCard` | `features/director/director-dashboard-page.tsx:17` |
| `ExpiringMoasCard` | `features/director/director-dashboard-page.tsx:73` |
| `ProposalStatusBadge` | `features/ret/ret-dashboard-page.tsx:331` |
| `MoaStatusBadge` | `features/director/moa-repository-page.tsx:40` |
| `StatusBadge` | `features/admin/users-page.tsx:335` |
| `ProjectStatusBadge` | `features/director/project-hub-page.tsx:44` |
| `ProposalDetailsTab` | `features/director/proposal-review-page.tsx:39` |
| `CommentsTab` | `features/director/proposal-review-page.tsx:240` |

### 6. KISS — Overly Large Components

| File | Lines | Problem |
|---|---|---|
| `features/director/pdf-inner.tsx` | 939 | Canvas rendering, annotation popovers, keyboard shortcuts, IntersectionObservers, floating toolbars — could be 3–4 modules |
| `features/proposals/components/create-proposal-modal.tsx` | 935 | Multi-step wizard, file upload with simulated progress, user search with deferred value |

### 7. KISS/YAGNI — `bulk-approve-dialog.tsx` useReducer

Uses a full reducer (8 action types) for dialog state + selected users + roles. Simpler `useState` calls would suffice at this scope.

### 8. KISS/YAGNI — `role-sidebar.tsx` `useRender` Prop

Accepts `headerRender` via `@base-ui/react/use-render` — advanced composition for what could be a simpler `ReactNode` prop.

### 9. Inconsistency — `AppShell` Wrapping Strategy

- The dashboard wraps `AppShell` per-role inside its component.
- Other pages include `AppShell` inside their feature component (e.g., `project-hub-page.tsx`).
- `_authenticated.tsx` layout does **not** include `AppShell`, so every page must remember to add it.

**Fix:** Move `AppShell` into `_authenticated.tsx` so all authenticated pages get it automatically.

### 10. Inconsistency — Search Debounce vs. Form Submit

| Strategy | Files |
|---|---|
| Debounced (300ms) | `project-hub`, `moa-repository`, `faculty-directory` |
| Form submit on Enter | `users`, `activity-log`, `ret-dashboard` |

### 11. Inconsistency — Server Function Token Retrieval

| Approach | File |
|---|---|
| `getValidAccessToken()` (handles refresh) | `lib/ret.functions.ts` |
| `getAppSession()` + manual extraction (no refresh) | `lib/dashboard.functions.ts`, `lib/admin.functions.ts` |
| Mixed | `lib/auth.functions.ts` |

### 12. Inconsistency — Pagination Variants

| Approach | Files |
|---|---|
| `Pagination` components | `project-hub`, `moa-repository` |
| Plain `Button` groups | `users`, `reports`, `ret-dashboard`, `faculty-directory` |

Some show 3 page numbers; some show ellipsis-based dynamic ranges.

---

## Summary

| Principle | Rating | Key Issues |
|---|---|---|
| Separation of Concerns | ★★★★☆ | Routes/features/lib split is clean; route files stay thin |
| Modularity | ★★★★☆ | Feature-based by role; good cohesion within files |
| Loose Coupling | ★★★☆☆ | Props-based data flow is good; magic string role checks are not |
| High Cohesion | ★★★★☆ | Each file has a focused responsibility |
| DRY | ★★☆☆☆ | Pagination, search bars, table states duplicated across 7+ files each |
| Reusability | ★★★☆☆ | Good UI library; inline sub-components prevent reuse |
| Flexibility | ★★★☆☆ | Role-based routing is rigid; no permission abstraction |
| Robustness | ★★★★☆ | Good error handling, token refresh, cancellation patterns |
| KISS | ★★★☆☆ | 900+ line components, unnecessary reducer |
| YAGNI | ★★★☆☆ | Lazy loading one chart, complex sidebar render props |

**Overall:** Well-architected foundation with a clean feature-based structure and good separation of concerns. Main technical debt is **pervasive duplication** of pagination/search/table patterns across ~7 near-identical list pages, and **inconsistency** in search strategy, AppShell usage, and token retrieval.
