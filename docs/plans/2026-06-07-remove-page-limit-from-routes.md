# Remove Page/Limit from Route Search Params Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove page/limit from route search params and fix hardcoded redirects for cursor-based pagination.

**Architecture:** Simplify route search schemas to only include filter params (search, status, etc.) since page components now manage their own cursor state internally.

**Tech Stack:** TypeScript, Zod, TanStack Router

---

## Task 1: Update projects/index.tsx

**Files:**
- Modify: `frontend/src/routes/_authenticated/projects/index.tsx`

**Step 1: Remove page/limit from search schema**
Remove lines 7-8 (page and limit fields) from projectsSearchSchema.

**Step 2: Remove page/limit from redirect**
Change line 20 from `search: { page: 1, pageSize: 10 }` to `search: {}`.

**Step 3: Remove page/limit from loaderDeps**
Remove `page: search.page` and `limit: search.limit` from loaderDeps (lines 25-26).

**Step 4: Remove page/limit from loader function**
Remove `page: deps.page` and `limit: deps.limit` from projectHubQueryOptions call (lines 41-42).

**Step 5: Remove page/limit from component destructuring**
Remove `page` and `limit` from `Route.useSearch()` destructuring (line 55).

**Step 6: Remove page/limit from component props**
Remove `page` and `limit` props from ProjectHubPage component (lines 92-93).

**Step 7: Remove handlePageChange function**
Remove the entire handlePageChange function (lines 76-80).

**Step 8: Remove onPageChange prop**
Remove `onPageChange={handlePageChange}` from ProjectHubPage (line 97).

**Step 9: Remove page from navigate calls**
In handleSearch, handleCollegeChange, and handleStatusChange, remove `page: 1` from navigate calls (lines 60, 66, 72).

**Step 10: Run typecheck**
Run `cd frontend && npx tsc --noEmit` to verify changes.

**Step 11: Commit**
```bash
git add frontend/src/routes/_authenticated/projects/index.tsx
git commit -m "refactor: remove page/limit from projects route search params"
```

## Task 2: Update moas/index.tsx

**Files:**
- Modify: `frontend/src/routes/_authenticated/moas/index.tsx`

**Step 1: Remove page/limit from search schema**
Remove lines 7-8 (page and limit fields) from moasSearchSchema.

**Step 2: Remove page/limit from redirect**
Change line 22 from `search: { page: 1, pageSize: 10 }` to `search: {}`.

**Step 3: Remove page/limit from loaderDeps**
Remove `page: search.page` and `limit: search.limit` from loaderDeps (lines 27-28).

**Step 4: Remove page/limit from loader function**
Remove `page: deps.page` and `limit: deps.limit` from moaRepositoryQueryOptions call (lines 35-36).

**Step 5: Remove page/limit from component destructuring**
Remove `page` and `limit` from `Route.useSearch()` destructuring (line 47).

**Step 6: Remove page/limit from component props**
Remove `page` and `limit` props from MoaRepositoryPage component (lines 65-66).

**Step 7: Remove handlePageChange function**
Remove the entire handlePageChange function (lines 56-60).

**Step 8: Remove onPageChange prop**
Remove `onPageChange={handlePageChange}` from MoaRepositoryPage (line 69).

**Step 9: Remove page from navigate calls**
In handleSearch, remove `page: 1` from navigate call (line 52).

**Step 10: Run typecheck**
Run `cd frontend && npx tsc --noEmit` to verify changes.

**Step 11: Commit**
```bash
git add frontend/src/routes/_authenticated/moas/index.tsx
git commit -m "refactor: remove page/limit from moas route search params"
```

## Task 3: Update faculty/index.tsx

**Files:**
- Modify: `frontend/src/routes/_authenticated/faculty/index.tsx`

**Step 1: Remove page/limit from search schema**
Remove lines 7-8 (page and limit fields) from facultySearchSchema.

**Step 2: Remove page/limit from redirect**
Change line 22 from `search: { page: 1, pageSize: 10 }` to `search: {}`.

**Step 3: Remove page/limit from loaderDeps**
Remove `page: search.page` and `limit: search.limit` from loaderDeps (lines 27-28).

**Step 4: Remove page/limit from loader function**
Remove `page: deps.page` and `limit: deps.limit` from facultyDirectoryQueryOptions call (lines 35-36).

**Step 5: Remove page/limit from component destructuring**
Remove `page` and `limit` from `Route.useSearch()` destructuring (line 47).

**Step 6: Remove page/limit from component props**
Remove `page` and `limit` props from FacultyDirectoryPage component (lines 71-72).

**Step 7: Remove handlePageChange function**
Remove the entire handlePageChange function (lines 62-66).

**Step 8: Remove onPageChange prop**
Remove `onPageChange={handlePageChange}` from FacultyDirectoryPage (line 75).

**Step 9: Remove page from navigate calls**
In handleSearch and handleCollegeChange, remove `page: 1` from navigate calls (lines 52, 58).

**Step 10: Run typecheck**
Run `cd frontend && npx tsc --noEmit` to verify changes.

**Step 11: Commit**
```bash
git add frontend/src/routes/_authenticated/faculty/index.tsx
git commit -m "refactor: remove page/limit from faculty route search params"
```

## Task 4: Update dashboard.tsx

**Files:**
- Modify: `frontend/src/routes/_authenticated/dashboard.tsx`

**Step 1: Remove page/pageSize from search schema**
Remove lines 13-14 (page and pageSize fields) from dashboardSearchSchema.

**Step 2: Remove page/pageSize from loaderDeps**
Remove `page: search.page` and `pageSize: search.pageSize` from loaderDeps (lines 21-22).

**Step 3: Remove page/pageSize from loader function**
Remove `page: deps.page` and `pageSize: deps.pageSize` from adminUsersQueryOptions call (lines 39-40).

**Step 4: Remove page/pageSize from component destructuring**
Remove `page` and `pageSize` from `Route.useSearch()` destructuring (line 57).

**Step 5: Remove page/pageSize from component props**
Remove `page` and `pageSize` props from UsersPage component (lines 76-77).

**Step 6: Remove handlePageChange function**
Remove the entire handlePageChange function (lines 66-70).

**Step 7: Remove onPageChange prop**
Remove `onPageChange={handlePageChange}` from UsersPage (line 80).

**Step 8: Remove page from navigate calls**
In handleSearch, remove `page: 1` from navigate call (line 62).

**Step 9: Run typecheck**
Run `cd frontend && npx tsc --noEmit` to verify changes.

**Step 10: Commit**
```bash
git add frontend/src/routes/_authenticated/dashboard.tsx
git commit -m "refactor: remove page/pageSize from dashboard route search params"
```

## Task 5: Update admin/activity-log/index.tsx

**Files:**
- Modify: `frontend/src/routes/_authenticated/admin/activity-log/index.tsx`

**Step 1: Remove page/limit from search schema**
Remove lines 6-7 (page and limit fields) from searchSchema.

**Step 2: Remove page/limit from redirect**
Change line 17 from `search: { page: 1, pageSize: 10 }` to `search: {}`.

**Step 3: Remove page/limit from component destructuring**
Remove `page` and `limit` from `Route.useSearch()` destructuring (line 25).

**Step 4: Remove page/limit from component props**
Remove `page` and `limit` props from ActivityLogPage component (lines 30-31).

**Step 5: Remove onPageChange prop and function**
Remove the entire `onPageChange` prop and its function (lines 39-44).

**Step 6: Remove page from navigate calls**
In onSearch, remove `page: 1` from navigate call (line 36).

**Step 7: Run typecheck**
Run `cd frontend && npx tsc --noEmit` to verify changes.

**Step 8: Commit**
```bash
git add frontend/src/routes/_authenticated/admin/activity-log/index.tsx
git commit -m "refactor: remove page/limit from activity-log route search params"
```

## Task 6: Fix hardcoded redirects in register.tsx and register.account.tsx

**Files:**
- Modify: `frontend/src/routes/register.tsx`
- Modify: `frontend/src/routes/register.account.tsx`

**Step 1: Update register.tsx redirect**
Change line 47 from `search: { page: 1, pageSize: 10 }` to `search: {}`.

**Step 2: Update register.account.tsx redirect**
Change line 44 from `search: { page: 1, pageSize: 10 }` to `search: {}`.

**Step 3: Run typecheck**
Run `cd frontend && npx tsc --noEmit` to verify changes.

**Step 4: Commit**
```bash
git add frontend/src/routes/register.tsx frontend/src/routes/register.account.tsx
git commit -m "refactor: remove page/pageSize from registration redirects"
```

## Task 7: Fix hardcoded redirect in login.tsx

**Files:**
- Modify: `frontend/src/routes/login.tsx`

**Step 1: Update prefetch call**
Change lines 86-89 from `page: 1, pageSize: 10` to remove those parameters.

**Step 2: Run typecheck**
Run `cd frontend && npx tsc --noEmit` to verify changes.

**Step 3: Commit**
```bash
git add frontend/src/routes/login.tsx
git commit -m "refactor: remove page/pageSize from login prefetch"
```

## Task 8: Fix app-sidebar.tsx link

**Files:**
- Modify: `frontend/src/features/layout/app-sidebar.tsx`

**Step 1: Update Link component**
Change line 133 from `<Link to="/dashboard" search={{ page: 1, pageSize: 10 }} />` to `<Link to="/dashboard" />`.

**Step 2: Run typecheck**
Run `cd frontend && npx tsc --noEmit` to verify changes.

**Step 3: Commit**
```bash
git add frontend/src/features/layout/app-sidebar.tsx
git commit -m "refactor: remove page/pageSize from sidebar dashboard link"
```

## Task 9: Final verification

**Step 1: Run full typecheck**
Run `cd frontend && npx tsc --noEmit` to ensure all changes compile correctly.

**Step 2: Check for any remaining references**
Search for any remaining `page:` or `pageSize:` in route files to ensure complete removal.

**Step 3: Final commit if needed**
If any additional changes were needed, commit them.