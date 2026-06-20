# Frontend Architecture Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all findings from the architecture review — extract shared helpers, add validation gaps, migrate raw Tables to DataTable, consolidate status badges, standardize reports state, and add an error boundary.

**Architecture:** Create two shared foundation modules (`authenticatedFetch` and `metadata.functions.ts`), then refactor all server function files to use them. Migrate 3 list pages from raw `<Table>` to `DataTable`. Consolidate 4 near-identical status badge components into one generic `StatusBadge`. Add an error boundary to `__root.tsx`. Standardize reports page to URL-driven state.

**Tech Stack:** React 19, TanStack Start (SSR + RPC), TanStack Query, TanStack Router, Zod, shadcn/ui, Tailwind CSS, lucide-react

---

## Task 1: Create `authenticatedFetch` helper

**Files:**
- Create: `frontend/src/lib/fetch.server.ts`

**Step 1: Create the helper**

```ts
import type { ApiErrorResponse } from "./auth";
import { getValidAccessToken } from "./session.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";

interface AuthenticatedFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
  errorMessage?: string;
}

export async function authenticatedFetch<T>(
  path: string,
  options?: AuthenticatedFetchOptions,
): Promise<T> {
  const token = await getValidAccessToken();

  const url = new URL(`${API_BASE}${path}`);
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const method = options?.method ?? "GET";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...options?.headers,
  };

  const isFormData = options?.body instanceof FormData;
  if (!isFormData && options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: isFormData
      ? (options!.body as FormData)
      : options?.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorResponse;
    throw new Error(
      errorBody.error?.message ??
        options?.errorMessage ??
        `Request failed: ${response.status}`,
    );
  }

  return (await response.json()) as T;
}
```

**Step 2: Verify import resolution**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors (file is `.server.ts` so only imported by server functions, which is valid)

**Step 3: Commit**

```bash
git add frontend/src/lib/fetch.server.ts
git commit -m "feat: add authenticatedFetch helper to reduce server function boilerplate"
```

---

## Task 2: Create shared `metadata.functions.ts`

**Files:**
- Create: `frontend/src/lib/metadata.functions.ts`

**Step 1: Create the module**

Move `getDepartmentsFn` and `getCampusesFn` (currently duplicated in `auth.functions.ts` and `ret.functions.ts`) into a single shared location. Also include their query options.

```ts
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
const METADATA_STALE_TIME_MS = 1000 * 60 * 60; // 1 hour

export interface MetadataItem {
  id: number;
  name: string;
}

export const getDepartmentsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const response = await fetch(`${API_BASE}/auth/departments`);
    if (!response.ok) return [] as MetadataItem[];
    return (await response.json()) as MetadataItem[];
  },
);

export const getCampusesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const response = await fetch(`${API_BASE}/auth/campuses`);
    if (!response.ok) return [] as MetadataItem[];
    return (await response.json()) as MetadataItem[];
  },
);

export function departmentsQueryOptions() {
  return queryOptions({
    queryKey: ["metadata", "departments"],
    queryFn: () => getDepartmentsFn(),
    staleTime: METADATA_STALE_TIME_MS,
  });
}

export function campusesQueryOptions() {
  return queryOptions({
    queryKey: ["metadata", "campuses"],
    queryFn: () => getCampusesFn(),
    staleTime: METADATA_STALE_TIME_MS,
  });
}
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors (new file has no internal imports yet)

**Step 3: Commit**

```bash
git add frontend/src/lib/metadata.functions.ts
git commit -m "feat: add shared metadata.functions.ts for lookup data"
```

---

## Task 3: Add error boundary to `__root.tsx`

**Files:**
- Create: `frontend/src/components/error-boundary.tsx`
- Modify: `frontend/src/routes/__root.tsx`

**Step 1: Create the ErrorBoundary component**

```tsx
import { useRouteError, isRouteError, Link } from "@tanstack/react-router";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center p-8 text-center">
          <h1 className="text-4xl font-semibold">Oops!</h1>
          <p className="mt-4 text-xl text-muted-foreground">
            Something went wrong.
          </p>
          <Link
            to="/"
            className="mt-8 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary({ children }: Props) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>;
}

export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteError(error)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-semibold">{error.status}</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          {error.status === 404
            ? "Page not found."
            : "Something went wrong."}
        </p>
        <Link
          to="/"
          className="mt-8 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-semibold">Oops!</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        Something went wrong.
      </p>
      <Link
        to="/"
        className="mt-8 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go home
      </Link>
    </div>
  );
}
```

**Step 2: Wrap children in `__root.tsx`**

In `frontend/src/routes/__root.tsx`:
- Import `{ ErrorBoundary }` from `../components/error-boundary`
- Wrap `{children}` in `<ErrorBoundary>` inside `RootDocument`

The change in `RootDocument`:
```tsx
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster position="top-right" />
        <Devtools />
        <Scripts />
      </body>
    </html>
  );
}
```

Also update `notFoundComponent` to use `RouteErrorBoundary`:
```tsx
export const Route = createRootRouteWithContext<MyRouterContext>()({
  // ... beforeLoad, head ...
  errorComponent: RouteErrorBoundary,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});
```

**Step 3: Verify build**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/src/components/error-boundary.tsx frontend/src/routes/__root.tsx
git commit -m "feat: add error boundary to root route for graceful crash recovery"
```

---

## Task 4: Refactor `lib/dashboard.functions.ts`

**Files:**
- Modify: `frontend/src/lib/dashboard.functions.ts`

**Step 1: Replace all fetch blocks with `authenticatedFetch`**

Replace every `getValidAccessToken()` + `fetch()` + error handling + `response.json()` block with a single `authenticatedFetch` call.

Example — `getDirectorDashboardFn` before:
```ts
export const getDirectorDashboardFn = createServerFn({ method: "GET" })
  .validator(z.void())
  .handler(async () => {
    const token = await getValidAccessToken();
    const response = await fetch(`${API_BASE}/director/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorBody = (await response.json()) as ApiErrorResponse;
      throw new Error(errorBody.error?.message ?? "Failed to fetch director dashboard");
    }
    return (await response.json()) as DirectorDashboardResponse;
  });
```

After:
```ts
import { authenticatedFetch } from "./fetch.server";

export const getDirectorDashboardFn = createServerFn({ method: "GET" })
  .validator(z.void())
  .handler(async () => {
    return authenticatedFetch<DirectorDashboardResponse>("/director/dashboard", {
      errorMessage: "Failed to fetch director dashboard",
    });
  });
```

Repeat for all 8 server functions in this file. For functions with URL params (getProjectHubFn, getMoaRepositoryFn, getFacultyDirectoryFn, getReportsListFn), use the `params` option:

```ts
export const getProjectHubFn = createServerFn({ method: "GET" })
  .validator(projectHubParamsSchema)
  .handler(async ({ data }) => {
    return authenticatedFetch<ProjectHubResponse>("/director/hub/projects", {
      params: {
        page: String(data.page),
        limit: String(data.limit),
        ...(data.search && { search: data.search }),
        ...(data.college && { college: data.college }),
        ...(data.status && { status: data.status }),
      },
      errorMessage: "Failed to fetch project hub",
    });
  });
```

For POST functions (reviewProposalFn), use `method: "POST"` and `body`:
```ts
export const reviewProposalFn = createServerFn({ method: "POST" })
  .validator(...)
  .handler(async ({ data }) => {
    return authenticatedFetch<{ message: string }>(
      `/proposals/${data.proposalId}/review`,
      {
        method: "POST",
        body: { decision: data.decision, comments: data.comments },
        errorMessage: "Failed to submit review",
      },
    );
  });
```

Remove the `import { getValidAccessToken }` and `import type { ApiErrorResponse }` lines (no longer needed). Keep the `const API_BASE` line (still needed for queryOptions references if any, but actually it's only used in fetch calls now, so remove it too).

**Step 2: Verify build**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/lib/dashboard.functions.ts
git commit -m "refactor: use authenticatedFetch in dashboard server functions"
```

---

## Task 5: Refactor `lib/admin.functions.ts`

**Files:**
- Modify: `frontend/src/lib/admin.functions.ts`

**Step 1: Replace all fetch blocks with `authenticatedFetch`**

Same pattern as Task 4. Replace all 7 server functions:

- `getAdminStatsFn` → `authenticatedFetch<AdminStats>("/admin/stats", ...)`
- `getAdminUsersFn` → `authenticatedFetch<UsersListResponse>("/admin/users", { params: ... })`
- `bulkUpdateUserStatusFn` → `authenticatedFetch<{...}>("/admin/users/status", { method: "PATCH", body: ... })`
- `getRolesFn` → `authenticatedFetch<RoleResponse[]>("/admin/roles", ...)`
- `bulkApproveUsersFn` → `authenticatedFetch<{...}>("/admin/users/approve", { method: "PATCH", body: ... })`
- `getAuditLogsFn` → `authenticatedFetch<AuditLogListResponse>("/audit-logs", { params: ... })`
- `getAuditStatsFn` → `authenticatedFetch<AuditStats>("/audit-logs/stats", ...)`

Remove `getValidAccessToken` and `ApiErrorResponse` imports. Remove `const API_BASE`.

**Step 2: Verify build**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/lib/admin.functions.ts
git commit -m "refactor: use authenticatedFetch in admin server functions"
```

---

## Task 6: Refactor `lib/comments.functions.ts` + add queryOptions

**Files:**
- Modify: `frontend/src/lib/comments.functions.ts`

**Step 1: Replace fetch blocks with `authenticatedFetch`**

```ts
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const COMENTS_STALE_TIME_MS = 1000 * 60 * 2; // 2 minutes

// ... interfaces unchanged ...

// ... validators unchanged ...

export const saveProposalCommentFn = createServerFn({ method: "POST" })
  .validator(saveCommentValidator)
  .handler(async ({ data }) => {
    const { proposalId, documentId, content, annotationJson } = data;
    return authenticatedFetch<ProposalComment>(
      `/proposals/${proposalId}/documents/${documentId}/comments`,
      {
        method: "POST",
        body: { content, annotationJson },
        errorMessage: "Failed to save comment",
      },
    );
  });

export const getProposalCommentsFn = createServerFn({ method: "GET" })
  .validator(getCommentsValidator)
  .handler(async ({ data }) => {
    const { proposalId, documentId } = data;
    return authenticatedFetch<ProposalComment[]>(
      `/proposals/${proposalId}/documents/${documentId}/comments`,
      { errorMessage: "Failed to fetch comments" },
    );
  });
```

**Step 2: Add queryOptions**

```ts
export function proposalCommentsQueryOptions(
  proposalId: string,
  documentId: string,
) {
  return queryOptions({
    queryKey: ["proposal-comments", proposalId, documentId],
    queryFn: () =>
      getProposalCommentsFn({ data: { proposalId, documentId } }),
    staleTime: COMENTS_STALE_TIME_MS,
  });
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/src/lib/comments.functions.ts
git commit -m "refactor: use authenticatedFetch in comments functions + add queryOptions"
```

---

## Task 7: Refactor `lib/ret.functions.ts` — validators + remove duplicates

**Files:**
- Modify: `frontend/src/lib/ret.functions.ts`

**Step 1: Replace fetch blocks with `authenticatedFetch`**

Same pattern as Tasks 4-6. Replace all authenticated fetch blocks.

**Step 2: Add Zod validators to unvalidated functions**

```ts
// getRETDashboardStatsFn — add void validator
export const getRETDashboardStatsFn = createServerFn({ method: "GET" })
  .validator(z.void())
  .handler(async () => {
    return authenticatedFetch<RETDashboardStats>(
      "/proposals/ret/dashboard-stats",
      { errorMessage: "Failed to fetch RET stats" },
    );
  });

// getSDGsFn — add void validator
export const getSDGsFn = createServerFn({ method: "GET" })
  .validator(z.void())
  .handler(async () => {
    return authenticatedFetch<SDG[]>("/proposals/metadata/sdgs", {
      errorMessage: "Failed to fetch SDGs",
    });
  });

// getSectorsFn — add void validator
export const getSectorsFn = createServerFn({ method: "GET" })
  .validator(z.void())
  .handler(async () => {
    return authenticatedFetch<Sector[]>("/proposals/metadata/sectors", {
      errorMessage: "Failed to fetch sectors",
    });
  });
```

**Step 3: Replace inline validators in createProposalFn and uploadProposalDocumentFn**

```ts
const createProposalSchema = z.object({
  campusId: z.number(),
  departmentId: z.number(),
  title: z.string().min(1),
  bannerProgram: z.string(),
  projectLocale: z.string(),
  extensionCategory: z.string(),
  budgetPartner: z.number().optional(),
  budgetNeust: z.number().optional(),
  targetStartDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  departmentIds: z.array(z.number()).optional(),
  sectorIds: z.array(z.number()).optional(),
  sdgIds: z.array(z.number()).optional(),
  members: z.array(z.object({
    userId: z.string(),
    projectRole: z.string(),
  })).optional(),
});

export const createProposalFn = createServerFn({ method: "POST" })
  .validator(createProposalSchema)
  .handler(async ({ data }) => {
    return authenticatedFetch<ProposalItem>("/proposals", {
      method: "POST",
      body: data,
      errorMessage: "Failed to create proposal",
    });
  });
```

For `uploadProposalDocumentFn`, keep the FormData validator (it validates `proposalId` exists) but simplify the handler:
```ts
export const uploadProposalDocumentFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    const proposalId = data.get("proposalId");
    if (typeof proposalId !== "string" || !proposalId) {
      throw new Error("proposalId is required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const proposalId = data.get("proposalId") as string;
    return authenticatedFetch<{
      documentId: string;
      storagePath: string;
      versionNum: number;
    }>(`/proposals/${proposalId}/documents/upload`, {
      method: "POST",
      body: data,
      errorMessage: "Failed to upload document",
    });
  });
```

**Step 4: Remove duplicate functions and import from metadata**

Remove the local `getDepartmentsFn`, `getCampusesFn`, and their queryOptions. Import from `metadata.functions.ts`:

```ts
// Remove these lines:
// export const getDepartmentsFn = ...
// export const getCampusesFn = ...
// export function departmentsQueryOptions() { ... }
// export function campusesQueryOptions() { ... }

// Add at top of file:
import {
  departmentsQueryOptions,
  campusesQueryOptions,
} from "./metadata.functions";

// Re-export for backward compatibility
export { departmentsQueryOptions, campusesQueryOptions };
```

Remove the local `MetadataItem` interface (it's now in `metadata.functions.ts`). Keep the local `SDG`, `Sector` interfaces (they're different from MetadataItem).

**Step 5: Remove `const API_BASE` line** (no longer needed — `authenticatedFetch` handles it)

Remove: `const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";`

**Step 6: Verify build**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors

**Step 7: Commit**

```bash
git add frontend/src/lib/ret.functions.ts
git commit -m "refactor: use authenticatedFetch in RET functions, add validators, remove duplicates"
```

---

## Task 8: Update `lib/auth.functions.ts` — remove duplicates

**Files:**
- Modify: `frontend/src/lib/auth.functions.ts`

**Step 1: Remove duplicate functions**

Remove the local `getDepartmentsFn` and `getCampusesFn` definitions (they now live in `metadata.functions.ts`).

Add re-exports for backward compatibility (so callers in register.tsx don't break):

```ts
// At top of file, add:
import {
  getDepartmentsFn as _getDepartmentsFn,
  getCampusesFn as _getCampusesFn,
} from "./metadata.functions";

// Re-export so existing imports continue to work
export const getDepartmentsFn = _getDepartmentsFn;
export const getCampusesFn = _getCampusesFn;
```

**Step 2: Update searchUsersFn and getCurrentUserFn to use authenticatedFetch where applicable**

`searchUsersFn` currently uses `getValidAccessToken()` directly — refactor to use `authenticatedFetch`:

```ts
export const searchUsersFn = createServerFn({ method: "GET" })
  .validator(z.object({ search: z.string().min(1) }))
  .handler(async ({ data }) => {
    return authenticatedFetch<SearchUserResponse[]>("/auth/users/search", {
      params: { search: data.search },
      errorMessage: "Failed to search users",
    });
  });
```

`getCurrentUserFn` has complex token refresh logic — **leave it as-is**. The custom retry + session update logic doesn't fit the `authenticatedFetch` pattern (it manages its own token lifecycle).

**Step 3: Remove unused imports**

Remove `getValidAccessToken` import if no longer used by any remaining function. Check: `loginFn` uses `supabase.auth.signInWithPassword` directly, `signupFn` doesn't use auth tokens, `logoutFn` uses `getAppSession`. Only `getCurrentUserFn` still uses `getValidAccessToken`. Keep the import.

**Step 4: Verify build**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend/src/lib/auth.functions.ts
git commit -m "refactor: remove duplicate metadata functions from auth, use authenticatedFetch for searchUsersFn"
```

---

## Task 9: Migrate `activity-log-page.tsx` to DataTable

**Files:**
- Modify: `frontend/src/features/admin/activity-log-page.tsx`

**Step 1: Replace raw Table with DataTable**

Current: Manual `<Table>` with inline loading spinner and empty state text.
Target: `<DataTable>` with `renderRow`, built-in loading/empty states.

Replace the table section (lines ~150-257) with:

```tsx
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TableCell, TableRow } from "@/components/ui/table";

// ... define columns:
const columns: DataTableColumn[] = [
  { key: "time", label: "Time", className: "w-[140px] font-medium text-[#666] text-sm py-2.5" },
  { key: "action", label: "Action", className: "font-medium text-[#666] text-sm py-2.5" },
  { key: "actor", label: "Actor", className: "w-[200px] font-medium text-[#666] text-sm py-2.5" },
  { key: "type", label: "Type", className: "w-[130px] font-medium text-[#666] text-sm py-2.5 text-center" },
  { key: "actions", label: "", className: "w-[50px] py-2.5" },
];

// Replace the table div with:
<div className="border border-[#ebebeb] rounded-[12px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden bg-white">
  <DataTable
    columns={columns}
    data={logsData?.items ?? []}
    isLoading={isLogsLoading}
    isEmpty={logsData?.items.length === 0}
    emptyMessage="No activities found."
    colSpan={5}
    ariaLabel="Activity log"
    renderRow={(log) => {
      const typeInfo = getActionTypeInfo(log.action, log.tableAffected);
      const createdAt = new Date(log.createdAt);
      return (
        <TableRow key={log.logId} className="border-b-[#e5e5e5]">
          <TableCell className="py-2.5">
            <div className="flex flex-col">
              <ClientOnly
                fallback={
                  <div className="flex flex-col">
                    <span className="text-sm text-[#0a0a0a]">...</span>
                    <span className="text-xs text-[#666]">...</span>
                  </div>
                }
              >
                <span className="text-sm text-[#0a0a0a]">
                  {dateFormatter.format(createdAt)}
                </span>
                <span className="text-xs text-[#666]">
                  {timeFormatter.format(createdAt)}
                </span>
              </ClientOnly>
            </div>
          </TableCell>
          <TableCell className="py-2.5 text-sm text-[#0a0a0a] leading-normal">
            {log.action}
          </TableCell>
          <TableCell className="py-2.5">
            <div className="flex flex-col">
              <span className="text-sm text-[#0a0a0a]">
                {log.actorName ?? "System"}
              </span>
              <span className="text-xs text-muted-foreground">
                {log.actorRole ?? "Automated"}
              </span>
            </div>
          </TableCell>
          <TableCell className="py-2.5 text-center">
            <Badge
              variant="outline"
              className="font-medium text-[#737373] border-[#e5e5e5] h-[22px] px-1.5 gap-1 rounded-[8px]"
            >
              {typeInfo.icon}
              <span>{typeInfo.label}</span>
            </Badge>
          </TableCell>
          <TableCell className="py-2.5 text-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="More actions for log entry"
            >
              <MoreVertical className="size-4" />
            </Button>
          </TableCell>
        </TableRow>
      );
    }}
  />
</div>
```

Remove the `Loader2` import (no longer needed for manual spinner).

**Step 2: Verify build**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/features/admin/activity-log-page.tsx
git commit -m "refactor: migrate activity-log-page to DataTable for consistent table UX"
```

---

## Task 10: Migrate `ret-dashboard-page.tsx` to DataTable

**Files:**
- Modify: `frontend/src/features/ret/ret-dashboard-page.tsx`

**Step 1: Replace raw Table with DataTable**

Current: Manual `<Table>` with overlay spinner, empty state div, and conditional header.
Target: `<DataTable>` with `renderRow`.

Replace the proposals table section (lines ~161-274) with:

```tsx
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TableCell, TableRow } from "@/components/ui/table";

const columns: DataTableColumn[] = [
  { key: "title", label: "Project Title", className: "w-[352px] font-medium text-[#666] px-4" },
  { key: "leader", label: "Project Leader", className: "w-[228px] font-medium text-[#666] px-4" },
  { key: "date", label: "Date Submitted", className: "w-[134px] font-medium text-[#666] px-4" },
  { key: "status", label: "Status", className: "w-[188px] font-medium text-[#666] px-4" },
  { key: "actions", label: "", className: "w-[50px]" },
];

// Replace the table div with:
<div className="rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden min-h-[400px]">
  <DataTable
    columns={columns}
    data={proposals}
    isLoading={isProposalsLoading}
    isEmpty={proposals.length === 0}
    emptyMessage="No proposals found."
    colSpan={5}
    ariaLabel="Proposals"
    renderRow={(proposal) => (
      <TableRow
        key={proposal.proposalId}
        className="border-b-[#ebebeb] hover:bg-[#fcfcfc] py-2"
      >
        <TableCell className="px-4 py-3 align-middle">
          <p className="text-sm font-medium text-[#0a0a0a] line-clamp-2 leading-5">
            {proposal.title}
          </p>
        </TableCell>
        <TableCell className="px-4 py-3 align-middle">
          <div className="flex items-center gap-2">
            <Avatar className="size-9 rounded-full">
              <AvatarImage src="" alt="Leader" />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                {proposal.leaderFirstName?.[0]}
                {proposal.leaderLastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-[2px]">
              <span className="text-sm font-normal text-[#0a0a0a] leading-5">
                {proposal.leaderFirstName} {proposal.leaderLastName}
              </span>
              <span className="text-xs text-[#666] leading-[14px]">
                {formatAcademicRank(proposal.leaderAcademicRank ?? null)}
              </span>
            </div>
          </div>
        </TableCell>
        <TableCell className="px-4 py-3 align-middle text-sm text-[#0a0a0a]">
          {format(new Date(proposal.createdAt), "MMM dd, yyyy")}
        </TableCell>
        <TableCell className="px-4 py-3 align-middle">
          <ProposalStatusBadge status={proposal.status} />
        </TableCell>
        <TableCell className="px-4 py-3 align-middle">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="size-8 text-[#666]" />
              }
              aria-label="Open proposal actions"
            >
              <EllipsisVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  navigate({
                    to: "/projects/$projectId",
                    params: { projectId: proposal.proposalId },
                  })
                }
              >
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  navigate({
                    to: "/proposals/$proposalId",
                    params: { proposalId: proposal.proposalId },
                  })
                }
              >
                Review Proposal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )}
  />
</div>
```

Remove the `Loader2` import and the overlay spinner div (DataTable handles loading state). Remove the `showTableHeader` computed variable.

**Step 2: Verify build**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/features/ret/ret-dashboard-page.tsx
git commit -m "refactor: migrate ret-dashboard-page to DataTable for consistent table UX"
```

---

## Task 11: Migrate `bulk-approve-dialog.tsx` to DataTable

**Files:**
- Modify: `frontend/src/features/admin/bulk-approve-dialog.tsx`

**Step 1: Replace raw Table with DataTable**

Current: Manual `<Table>` with overlay spinner, inline empty state.
Target: `<DataTable>` with `renderRow` (checkboxes and Select remain in `renderRow`).

Replace the table section (lines ~202-314) with:

```tsx
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TableCell, TableRow } from "@/components/ui/table";

const columns: DataTableColumn[] = [
  { key: "select", label: "", className: "w-[50px] px-4 text-center" },
  { key: "name", label: "Name", className: "min-w-[250px] font-medium text-[#0a0a0a]" },
  { key: "department", label: "Department", className: "min-w-[200px] text-center font-medium text-[#0a0a0a]" },
  { key: "role", label: "Assign role", className: "w-[200px] pr-6 text-right font-medium text-[#0a0a0a]" },
];

// Replace the table container div with:
<div className="relative flex-1 overflow-hidden rounded-md border border-[#e5e5e5] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
  {isUsersFetching && (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  )}
  <div className="h-full overflow-auto">
    <DataTable
      columns={columns}
      data={usersData?.users ?? []}
      isLoading={false}
      isEmpty={!isUsersFetching && (usersData?.users.length === 0)}
      emptyMessage="No pending users found."
      colSpan={4}
      ariaLabel="Pending users for approval"
      renderRow={(user) => (
        <TableRow
          key={user.userId}
          className="border-b-[#e5e5e5] transition-colors hover:bg-[#fcfcfc]"
        >
          <TableCell className="px-4 text-center">
            <Checkbox
              checked={selectedUsers.has(user.userId)}
              onCheckedChange={(checked) =>
                handleSelectRow(user.userId, checked as boolean)
              }
              aria-label={`Select ${user.firstName}`}
            />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-[10px]">
              <Avatar className="size-9 border border-[#e5e5e5]">
                <AvatarImage src="" alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback className="bg-primary/5 text-xs font-medium text-primary">
                  {user.firstName[0]}{user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-medium leading-5 text-[#0a0a0a]">
                  {user.firstName}{" "}
                  {user.middleName ? `${user.middleName[0]}. ` : ""}{" "}
                  {user.lastName}
                </span>
                <span className="truncate text-[12px] leading-4 text-[#666]">
                  {user.campusName}
                </span>
              </div>
            </div>
          </TableCell>
          <TableCell className="text-center text-[14px] text-[#0a0a0a]">
            {user.departmentName ?? "-"}
          </TableCell>
          <TableCell className="pr-6">
            <div className="flex justify-end">
              <Select
                value={userRoles[user.userId]}
                onValueChange={(val) =>
                  handleRoleChange(user.userId, val as string)
                }
              >
                <SelectTrigger className="h-[30px] w-[160px] rounded-md border-[#e5e5e5] bg-white px-3 shadow-[0px_1px_1px_rgba(0,0,0,0.1)]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-md shadow-lg">
                  {rolesData?.map((role) => (
                    <SelectItem
                      key={role.roleId}
                      value={role.roleName}
                      className="text-sm"
                    >
                      {role.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TableCell>
        </TableRow>
      )}
    />
  </div>
</div>
```

Note: We keep the overlay spinner for background refetch (better UX for this dialog context), and use `isEmpty` only when not fetching.

Remove the `Loader2` import from lucide-react — wait, it's still used for the overlay spinner. Keep it.

**Step 2: Verify build**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/features/admin/bulk-approve-dialog.tsx
git commit -m "refactor: migrate bulk-approve-dialog to DataTable for consistent table UX"
```

---

## Task 12: Consolidate status badges into generic component

**Files:**
- Create: `frontend/src/components/ui/status-badge.tsx`
- Modify: `frontend/src/features/admin/users-page.tsx`
- Modify: `frontend/src/features/admin/components/status-badge.tsx`
- Modify: `frontend/src/features/director/components/moa-status-badge.tsx`
- Modify: `frontend/src/features/director/components/project-status-badge.tsx`
- Modify: `frontend/src/features/ret/components/proposal-status-badge.tsx`
- Delete: `frontend/src/features/admin/components/status-badge.tsx`
- Delete: `frontend/src/features/director/components/moa-status-badge.tsx`
- Delete: `frontend/src/features/director/components/project-status-badge.tsx`
- Delete: `frontend/src/features/ret/components/proposal-status-badge.tsx`

**Step 1: Create generic StatusBadge component**

```tsx
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, AlertCircle, XCircle, CircleCheck, RotateCcw, Loader2 } from "lucide-react";
import { Badge } from "./badge";

interface StatusConfig {
  label?: string;
  icon?: LucideIcon;
  className?: string;
}

interface StatusBadgeProps {
  status: string;
  config: Record<string, StatusConfig>;
  variant?: "secondary" | "outline";
  className?: string;
}

export function StatusBadge({
  status,
  config,
  variant = "secondary",
  className,
}: StatusBadgeProps) {
  const entry = config[status] ?? { label: status, icon: CircleCheck };
  const Icon = entry.icon ?? CircleCheck;

  return (
    <Badge
      variant={variant}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${entry.className ?? ""} ${className ?? ""}`}
    >
      <Icon className="size-3" />
      {entry.label ?? status}
    </Badge>
  );
}

// Pre-defined configs for each domain

export const adminStatusConfig: Record<string, StatusConfig> = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    className: "bg-green-50 text-green-700 border-green-200",
  },
  deactivated: {
    label: "Deactivated",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export const moaStatusConfig: Record<string, StatusConfig> = {
  Valid: {
    label: "Valid",
    icon: CheckCircle2,
    className: "bg-green-50 text-green-700 border-green-200",
  },
  "Renewal Needed": {
    label: "Renewal Needed",
    icon: AlertCircle,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  Expired: {
    label: "Expired",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
  },
  Terminated: {
    label: "Terminated",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export const projectStatusConfig: Record<string, StatusConfig> = {
  Approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-green-50 text-green-700 border-green-200",
  },
  Submitted: {
    label: "For Review",
    icon: Loader2,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  Endorsed: {
    label: "For Review",
    icon: Loader2,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  Returned: {
    label: "Needs Revision",
    icon: RotateCcw,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

export const proposalStatusConfig: Record<string, StatusConfig> = {
  submitted: {
    label: "Pending",
    icon: CircleCheck,
    className: "text-gray-500 border-gray-200",
  },
  endorsed: {
    label: "For Endorsement",
    icon: CircleCheck,
    className: "text-gray-500 border-gray-200",
  },
  approved: {
    label: "Approved",
    icon: CircleCheck,
    className: "bg-green-50 text-green-700 border-green-200",
  },
};
```

**Step 2: Update callers**

In `users-page.tsx`, replace:
```tsx
import { StatusBadge } from "./components/status-badge";
// ...
<StatusBadge isActive={user.isActive} />
```
With:
```tsx
import { StatusBadge, adminStatusConfig } from "@/components/ui/status-badge";
// ...
<StatusBadge
  status={user.isActive ? "active" : "deactivated"}
  config={adminStatusConfig}
  variant="outline"
/>
```

In `moa-repository-page.tsx`, replace:
```tsx
import { MoaStatusBadge } from "./components/moa-status-badge";
// ...
<MoaStatusBadge status={moa.status} />
```
With:
```tsx
import { StatusBadge, moaStatusConfig } from "@/components/ui/status-badge";
// ...
<StatusBadge status={moa.status} config={moaStatusConfig} />
```

Similarly for `project-hub-page.tsx` and `ret-dashboard-page.tsx`.

**Step 3: Delete old badge files**

```bash
git rm frontend/src/features/admin/components/status-badge.tsx
git rm frontend/src/features/director/components/moa-status-badge.tsx
git rm frontend/src/features/director/components/project-status-badge.tsx
git rm frontend/src/features/ret/components/proposal-status-badge.tsx
```

**Step 4: Verify build**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: consolidate 4 status badge components into generic StatusBadge"
```

---

## Task 13: Standardize reports page to URL-driven state

**Files:**
- Modify: `frontend/src/routes/_authenticated/reports/index.tsx`
- Modify: `frontend/src/features/director/reports-page.tsx`

**Step 1: Add search params validation to the route**

Update `routes/_authenticated/reports/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ReportsPage } from "@/features/director/reports-page";
import { reportsQueryOptions, reportsListQueryOptions } from "@/lib/dashboard.functions";

const reportsSearchSchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(20),
  search: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/reports/")({
  validateSearch: (search) => reportsSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    page: search.page,
    limit: search.limit,
    search: search.search,
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(reportsQueryOptions()),
      context.queryClient.ensureQueryData(
        reportsListQueryOptions({
          page: deps.page,
          limit: deps.limit,
          search: deps.search,
        }),
      ),
    ]);
  },
  component: ReportsIndexPage,
});

function ReportsIndexPage() {
  const { page, limit, search } = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleSearch = (newSearch: string) => {
    navigate({
      search: (old) => ({ ...old, search: newSearch || undefined, page: 1 }),
    });
  };

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (old) => ({ ...old, page: newPage }),
    });
  };

  return (
    <ReportsPage
      page={page}
      limit={limit}
      search={search}
      onSearch={handleSearch}
      onPageChange={handlePageChange}
    />
  );
}
```

**Step 2: Refactor `ReportsPage` to use props**

Update `features/director/reports-page.tsx`:

```tsx
interface ReportsPageProps {
  page: number;
  limit: number;
  search?: string;
  onSearch: (search: string | undefined) => void;
  onPageChange: (page: number) => void;
}

export function ReportsPage({
  page,
  limit,
  search,
  onSearch,
  onPageChange,
}: ReportsPageProps) {
  // Remove local useState:
  // const [search, setSearch] = useState("");  -- REMOVE
  // const [page, setPage] = useState(1);       -- REMOVE
  // const limit = 20;                          -- REMOVE (comes from props)

  const { data: stats, isLoading: statsLoading } = useQuery(reportsQueryOptions());
  const { data: listData, isLoading: listLoading, error } = useQuery(
    reportsListQueryOptions({ page, limit, search }),
  );

  // ... rest unchanged, but update SearchInput and PaginationBar:
  // SearchInput onChange: onChange={(val) => onSearch(val || undefined)}
  // PaginationBar onPageChange: onPageChange={onPageChange}
```

**Step 3: Remove unused `useState` import**

**Step 4: Verify build**

Run: `npx tsc --noEmit --pretty` in `frontend/`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend/src/routes/_authenticated/reports/index.tsx frontend/src/features/director/reports-page.tsx
git commit -m "refactor: standardize reports page to URL-driven state like other list pages"
```

---

## Execution Summary

| Task | Phase | Depends On | Files Created | Files Modified | Files Deleted |
|------|-------|------------|---------------|----------------|---------------|
| 1 | Foundation | — | 1 | 0 | 0 |
| 2 | Foundation | — | 1 | 0 | 0 |
| 3 | Foundation | — | 1 | 1 | 0 |
| 4 | Server Refactor | 1 | 0 | 1 | 0 |
| 5 | Server Refactor | 1 | 0 | 1 | 0 |
| 6 | Server Refactor | 1 | 0 | 1 | 0 |
| 7 | Server Refactor | 1, 2 | 0 | 1 | 0 |
| 8 | Server Refactor | 1, 2 | 0 | 1 | 0 |
| 9 | UI Migration | — | 0 | 1 | 0 |
| 10 | UI Migration | — | 0 | 1 | 0 |
| 11 | UI Migration | — | 0 | 1 | 0 |
| 12 | UI Consolidation | — | 1 | 4 | 4 |
| 13 | State Standardization | — | 0 | 2 | 0 |

**Total:** 3 files created, 13 files modified, 4 files deleted

---

## What This Plan Fixes

| Finding | Severity | Task |
|---------|----------|------|
| Fetch pattern duplication (~20 blocks) | Medium | 1, 4-8 |
| Validation gaps in RET functions | High | 7 |
| Duplicate `getDepartmentsFn`/`getCampusesFn` | Low | 2, 7, 8 |
| Missing queryOptions for comments | Low | 6 |
| No error boundary | Medium | 3 |
| 3 raw-Table pages bypass DataTable | Medium | 9, 10, 11 |
| 4 near-identical status badges | Low | 12 |
| Reports page local state | Low | 13 |

**Findings intentionally NOT addressed:**
- Login/signupFn soft-return pattern (kept as documented exception — user decision)
- Inconsistent error handling between login/signup (same rationale)

---

## Notes for Execution

- Run `npx tsc --noEmit --pretty` after each task to verify no regressions
- The `authenticatedFetch` helper is `.server.ts` — it can only be imported by other server functions
- `metadata.functions.ts` is NOT `.server.ts` — it uses `createServerFn` which handles RPC transformation
- The `ErrorBoundary` component uses class component pattern (required for `getDerivedStateFromError`)
- When deleting old status badge files, verify no other files import them
- Task 13 changes the `ReportsPage` component API — the route must be updated first or simultaneously
