# Frontend Refactoring Plan

## Principles
- **DRY**: Single source for types, config, column definitions
- **KISS**: No new abstraction layers, no renaming `components/custom/`
- **YAGNI**: Types stay in `.functions.ts` if only used by one feature
- **Modular**: Features own their code, import from shared layers only
- **Loose coupling**: Features never import from other features
- **High cohesion**: All related code lives in one feature folder

---

## Phase 1: Foundation (additive, no breakage)

### 1.1 Create `src/config/api.ts`
Single source for `API_BASE` — used by all server functions.

```
src/config/api.ts
```
```ts
export const API_BASE = process.env.API_URL ?? "http://localhost:3001/api/v1";
```

### 1.2 Create `src/lib/api/client.ts`
Centralized `getErrorMessage()` — currently duplicated in every `.functions.ts` file.

```
src/lib/api/client.ts
```
```ts
import type { ApiErrorResponse } from "../auth/auth";

export async function getErrorMessage(
  response: Response,
  defaultMessage: string,
): Promise<string> {
  // ... (extracted from lib/auth.functions.ts lines 15-33)
}
```

### 1.3 Create `src/types/` — shared domain types
Extract types used across multiple features. Keep types that are only used within one feature in that feature's `functions.ts`.

```
src/types/
├── index.ts              # re-exports all
├── project.ts            # ProjectDetailsResponse, HubProject, ProjectMember,
│                         #   ProjectHistoryItem, ProjectAttachment,
│                         #   ProjectHubResponse, ProjectMemberSpecialOrder
├── proposal.ts           # ProposalFull, ProposalItem (from ret.functions.ts)
├── moa.ts                # MoaItem, MoaDetails, MoaRepositoryResponse, ActiveMoa
├── report.ts             # ReportItem, ReportsResponse, ReportStatsResponse
├── user.ts               # AuthUser (from lib/auth.ts), FacultyInvolvement,
│                         #   FacultyDirectoryResponse
└── search.ts             # SearchUserResponse
```

**File-by-file extraction source:**
| Target File | Source |
|-------------|--------|
| `types/project.ts` | `lib/dashboard.functions.ts` lines 72-219 |
| `types/moa.ts` | `lib/dashboard.functions.ts` lines 98-121, 817-822 |
| `types/report.ts` | `lib/dashboard.functions.ts` lines 221-245 |
| `types/user.ts` | `lib/auth.ts` (AuthUser), `lib/dashboard.functions.ts` lines 123-157 |
| `types/proposal.ts` | `lib/ret.functions.ts` (ProposalFull, ProposalItem) |

### 1.4 Add barrel exports (`index.ts`)
Create `index.ts` in every feature folder for clean imports:

| Folder | Exports |
|--------|---------|
| `features/action-center/` | `ActionCenterCard` |
| `features/admin/` | `UsersPage`, `SettingsPage`, `ActivityLogPage`, `AddUserDialog`, etc. |
| `features/archives/` | `ArchivesPage` |
| `features/auth/` | `loginFn`, `signupFn`, `logoutFn`, etc. |
| `features/dashboard/` | role subfolders |
| `features/faculty/` | `FacultyDirectoryPage`, `getFacultyDirectoryColumns` |
| `features/moa/` | `MoaDetailsPage`, `MoaRepositoryPage`, `EditMoaModal` |
| `features/projects/` | `ProjectHubPage`, `ProjectDetailsPage`, `ActivateProjectWizard` |
| `features/proposals/` | `ProposalReviewPage`, `CreateProposalModal`, `ProposalLifecycleStepper` |
| `features/reports/` | `ReportsPage`, `SubmitReportModal` |
| `features/ret/` | `RETDashboardPage`, `ProjectMonitoringPage`, `RetFacultyDirectoryPage` |
| `components/custom/` | `AppHeader`, `DataTablePage`, `MetricCard`, `PageHeader`, etc. |
| `components/layout/` | `AppShell`, `AppSidebar` |
| `hooks/` | `useActionCenter`, `useDerivedState`, `useProjectReadiness`, etc. |
| `lib/api/` | `API_BASE`, `getErrorMessage` |

### 1.5 Move `features/layout/` → `components/layout/`
Create `components/layout/` and move:
- `features/layout/app-shell.tsx` → `components/layout/app-shell.tsx`
- `features/layout/app-sidebar.tsx` → `components/layout/app-sidebar.tsx`

Update import in `routes/_authenticated.tsx`:
```ts
// Before:
import { AppShell } from "@/features/layout/app-shell";
// After:
import { AppShell } from "@/components/layout/app-shell";
```

---

## Phase 2: Split `lib/dashboard.functions.ts` (925 lines)

The 925-line file contains 7+ domains. Split into per-feature server function files:

### Domain → Feature function file mapping

| Server Function | Target File |
|----------------|-------------|
| `getDirectorDashboardFn` | `features/dashboard/functions.ts` |
| `getProjectHubFn` | `features/projects/functions.ts` |
| `getMoaRepositoryFn` | `features/moa/functions.ts` (merge with existing) |
| `getFacultyDirectoryFn` | `features/faculty/functions.ts` |
| `getProjectDetailsFn` | `features/projects/functions.ts` |
| `reviewProposalFn` | `features/proposals/functions.ts` |
| `getReportsListFn` | `features/reports/functions.ts` |
| `getReportStatsFn` | `features/reports/functions.ts` |
| `emailReportFn` | `features/reports/functions.ts` |
| `submitReportFn` | `features/reports/functions.ts` |
| `uploadReportDocumentFn` | `features/reports/functions.ts` |
| `transitionProjectFn` | `features/projects/functions.ts` |
| `activateProjectFn` | `features/projects/functions.ts` |
| `closeProjectFn` | `features/projects/functions.ts` |
| `getActiveMoasFn` | `features/moa/functions.ts` |
| `uploadMoaFn` | `features/moa/functions.ts` (replace existing) |
| `getSpecialOrderSignedUrlFn` | `lib/special-orders.functions.ts` (new) |
| `getAccessTokenForUploadFn` | `lib/special-orders.functions.ts` (new) |
| `uploadSpecialOrderFn` | `lib/special-orders.functions.ts` (new) |

### Each new file structure:
```
features/<domain>/functions.ts
├── import { API_BASE } from "@/config/api"
├── import { getErrorMessage } from "@/lib/api/client"
├── import { authorizeSessionUser, getValidAccessToken } from "@/lib/server/session.server"
├── Zod schemas (params validation)
├── Types (domain-specific only — shared types move to src/types/)
├── createServerFn handlers
└── queryOptions exports
```

### Imports to update (files consuming `lib/dashboard.functions.ts`):

| File | Replace imports with |
|------|---------------------|
| `routes/_authenticated/dashboard.tsx` | `@/features/dashboard/functions` |
| `routes/_authenticated/projects/index.tsx` | `@/features/projects/functions` |
| `routes/_authenticated/projects/$projectId/index.tsx` | `@/features/projects/functions` |
| `routes/_authenticated/proposals/$proposalId.tsx` | `@/features/projects/functions` (projectDetailsQueryOptions lives with projects) |
| `routes/_authenticated/moas/index.tsx` | `@/features/moa/functions` |
| `routes/_authenticated/faculty/index.tsx` | `@/features/faculty/functions` |
| `routes/_authenticated/reports/index.tsx` | `@/features/reports/functions` |
| `features/director/director-dashboard-page.tsx` | `@/features/dashboard/functions` |
| `features/director/project-hub-page.tsx` | `@/features/projects/functions` |
| `features/director/project-details-page.tsx` | `@/features/projects/functions` |
| `features/director/faculty-directory-page.tsx` | `@/features/faculty/functions` + `@/features/reports/functions` (emailReportFn) |
| `features/director/reports-page.tsx` | `@/features/reports/functions` |
| `features/director/moa-repository-page.tsx` | `@/features/moa/functions` |
| `features/director/activate-project-wizard.tsx` | `@/features/projects/functions` + `@/features/moa/functions` |
| `features/ret/faculty-directory-page.tsx` | `@/features/faculty/functions` |

### Delete `lib/dashboard.functions.ts` after all imports updated

---

## Phase 3: Move files out of `features/director/`

### 3.1 Files to move

| File | Move to | Notes |
|------|---------|-------|
| `director-dashboard-page.tsx` | `features/dashboard/director/` | New folder for director-specific dashboard |
| `project-hub-page.tsx` | `features/projects/` | Already has `features/projects/` folder |
| `project-details-page.tsx` (847 lines) | `features/projects/` | Split into sub-components is deferred |
| `project-details-skeleton.tsx` | `features/projects/components/` | Co-locate with detail page |
| `activate-project-wizard.tsx` | `features/projects/components/` | Project-specific wizard |
| `projects-chart.tsx` | `features/projects/components/` | Used by dashboard, owned by projects |
| `projects-chart-card.tsx` | `features/projects/components/` | Used by dashboard, owned by projects |
| `reports-page.tsx` (529 lines) | `features/reports/` | Already has `features/reports/components/` |
| `moa-repository-page.tsx` | `features/moa/` | Already has `features/moa/` folder |
| `faculty-directory-page.tsx` | `features/faculty/` | Already has `features/faculty/` folder |
| `proposal-review-page.tsx` | `features/proposals/` | Already has `features/proposals/` folder |
| `components/proposal-details-tab.tsx` | `features/proposals/components/` | Proposal-specific |
| `components/proposal-review-skeleton.tsx` | `features/proposals/components/` | Proposal-specific |
| `components/comments-tab.tsx` | `features/proposals/components/` | Comments on proposals |
| `components/faculty-directory-columns.tsx` | `features/faculty/components/` | Shared source (see Phase 4) |

### 3.2 Files that stay in `features/director/` (PDF-related, self-contained)
- `pdf-inner.tsx` — PDF viewer logic
- `pdf-ssr-polyfill.ts` — SSR polyfill
- `components/pdf-annotations.tsx`
- `components/pdf-canvas.tsx`
- `components/pdf-constants.ts`
- `components/pdf-toolbar.tsx`
- `components/hooks/` (5 PDF hooks)
- `components/create-moa-modal.tsx` → move to `features/moa/components/`

### 3.3 Update route imports

| Route File | Update import path |
|------------|-------------------|
| `routes/_authenticated/dashboard.tsx` | `@/features/director/director-dashboard-page` → `@/features/dashboard/director/director-dashboard-page` |
| `routes/_authenticated/projects/index.tsx` | `@/features/director/project-hub-page` → `@/features/projects/project-hub-page` |
| `routes/_authenticated/projects/$projectId/index.tsx` | `@/features/director/project-details-page` → `@/features/projects/project-details-page` |
| `routes/_authenticated/projects/$projectId/index.tsx` | `@/features/director/project-details-skeleton` → `@/features/projects/components/project-details-skeleton` |
| `routes/_authenticated/moas/index.tsx` | `@/features/director/moa-repository-page` → `@/features/moa/moa-repository-page` |
| `routes/_authenticated/faculty/index.tsx` | `@/features/director/faculty-directory-page` → `@/features/faculty/faculty-directory-page` |
| `routes/_authenticated/reports/index.tsx` | `@/features/director/reports-page` → `@/features/reports/reports-page` |
| `routes/_authenticated/proposals/$proposalId.tsx` | `@/features/director/proposal-review-page` → `@/features/proposals/proposal-review-page` |
| `routes/_authenticated/proposals/$proposalId.tsx` | `@/features/director/components/proposal-review-skeleton` → `@/features/proposals/components/proposal-review-skeleton` |

### 3.4 Update feature-to-feature imports

| File | Update |
|------|--------|
| `features/ret/faculty-directory-page.tsx` line 18 | `./components/faculty-directory-columns` → `@/features/faculty/components/faculty-directory-columns` |

### 3.5 Remove `features/director/` (only PDF files remain)
After all moves, `director/` only has PDF-related files. Consider renaming to `features/pdf-viewer/` or keeping as `features/director/` for the PDF/annotations that are Director-specific.

---

## Phase 4: Deduplicate `faculty-directory-columns.tsx`

### Current state
- `features/director/components/faculty-directory-columns.tsx` — 112 lines, exported as function `getFacultyDirectoryColumns(page, limit)`
- `features/ret/components/faculty-directory-columns.tsx` — 97 lines, exported as const `retFacultyDirectoryColumns`

### Resolution
The director version has college filter support, avatar display, rank column, lead/collaborator/total involvement columns, and actions. The RET version has name, rank badge, total projects, account status, and actions.

These are genuinely different column configurations for different roles. **Don't force them into one**. Instead:

1. Keep the shared `FacultyInvolvement` type in `src/types/user.ts`
2. Move director's columns to `features/faculty/components/director-directory-columns.tsx`
3. Move RET's columns to `features/faculty/components/ret-directory-columns.tsx`
4. Create barrel export from `features/faculty/components/index.ts`

Actually, simpler: just keep both in the `features/faculty/components/` folder with clear names.

#### Updated plan:
| Current | New Location |
|---------|-------------|
| `director/components/faculty-directory-columns.tsx` | `features/faculty/components/director-directory-columns.tsx` |
| `ret/components/faculty-directory-columns.tsx` | `features/faculty/components/ret-directory-columns.tsx` |

Both pages now import from `@/features/faculty/components/director-directory-columns` (or ret version).

---

## Phase 5: Move remaining `features/director/` files

### Files still in director/ after Phase 3

| File | Move to |
|------|---------|
| `components/create-moa-modal.tsx` | `features/moa/components/create-moa-modal.tsx` |

### PDF files — decision
The PDF viewer (`pdf-inner.tsx`, `pdf-ssr-polyfill.ts`, `components/pdf-*.tsx`, `components/hooks/`) is used by `features/director/project-details-page.tsx`. After the move, project-details-page will be in `features/projects/`.

**Options:**
A) Move PDF files to `features/projects/components/pdf-viewer/` (co-located with consumer)
B) Move PDF files to `components/pdf-viewer/` (shared, in case other features need it later)

Recommend **Option A** — YAGNI, only one consumer currently.

### Delete `features/director/` folder entirely
After all files relocated, `features/director/` becomes empty and is removed.

---

## Phase 6: Standardize imports & barrel exports sweep

### 6.1 Ensure all imports use `@/` path alias
Search for relative imports across features (e.g., `../lib/`, `../../components/`) and convert to `@/`.

### 6.2 Add barrel exports everywhere
Add `index.ts` to every folder that's imported by others. This allows:
```ts
// Before:
import { ProjectHubPage } from "@/features/projects/project-hub-page";
import { ProjectDetailsPage } from "@/features/projects/project-details-page";
import { ActivateProjectWizard } from "@/features/projects/components/activate-project-wizard";

// After:
import { ProjectHubPage, ProjectDetailsPage, ActivateProjectWizard } from "@/features/projects";
```

### 6.3 Remove unused files
- `lib/dashboard.functions.ts` (after split completes)
- `features/director/` (after all files moved)
- Any `.gitkeep` files in empty dirs

---

## Execution Order Summary

| Phase | Description | Breakage Risk | Files Touched |
|-------|-------------|---------------|---------------|
| **1** | Foundation (config, types, api client, barrels, layout move) | None (additive) | ~10 new files, 1 import update |
| **2** | Split `dashboard.functions.ts` into 6 feature files | Medium | 1 file deleted, 6 created, ~15 import updates |
| **3** | Move files out of director/ | Medium | ~14 files moved, ~10 import updates |
| **4** | Deduplicate faculty-directory-columns | Low | 2 files moved, 2 import updates |
| **5** | Clean up remaining director/ files | Low | ~8 files moved, 1 folder deleted |
| **6** | Standardize imports & barrel exports | Low | ~30 files updated |

**Total impact:** ~50 files created/moved, ~40 import path updates, 2 folders deleted.

---

## Rollout Strategy

Per the user's constraint, do this as a single coordinated commit. The sequence within that commit:

```
1. Create config/api.ts
2. Create lib/api/client.ts  (extract getErrorMessage)
3. Create src/types/*.ts  (extract shared types)
4. Create feature functions.ts files (split dashboard.functions.ts)
5. Create barrel exports for all folders
6. Move features/layout/ → components/layout/
7. Move all files out of director/ to target locations
8. Update ALL imports across all touched files
9. Delete lib/dashboard.functions.ts
10. Delete features/director/ (now empty)
```

Run lint + typecheck after each verification gate.
