# Frontend Sprint 2 Domain Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete feature ownership for the remaining frontend server functions so route and UI code no longer consume domain behavior from `src/lib`.

**Architecture:** Sprint 1 established feature folders, shared API utilities, shared types, and public barrels. Sprint 2 moves each remaining domain function module to its feature, preserves endpoint behavior and React Query keys, and leaves `lib` for cross-cutting utilities only. Large page-component decomposition is deliberately deferred to Sprint 3.

**Tech Stack:** React 19, TanStack Start/Router/Query, TypeScript, Zod, Vitest, Biome.

---

## Scope and Rules

- Preserve API endpoints, authorization, validators, return values, query keys, stale times, and UI behavior.
- Keep shared API concerns in `config/api.ts`, `lib/api/client.ts`, and `lib/session.server.ts`.
- Place types in `src/types/` only when another feature consumes them; otherwise keep them beside their owning functions.
- Feature-to-feature composition must use a feature barrel. Same-feature relative imports remain acceptable.
- Feature barrels must expose the public server functions, query options, and consumer-facing types needed by routes, hooks, components, and other features; internal handlers and schemas remain unexported.
- Do not split the large page components in this sprint. Their current sizes are a separate UI-decomposition concern.
- Use a focused request/return or failure-path test first for each migrated function module; mock the server session boundary when testing `createServerFn` handlers and run the relevant test after each move.

## Current Migration Map

| Current module | Target owner |
|---|---|
| `lib/auth.functions.ts` | `features/auth/functions.ts` |
| `lib/admin.functions.ts` | `features/admin/functions.ts` |
| `lib/settings.functions.ts` | `features/admin/settings.functions.ts` |
| `lib/archives.functions.ts` | `features/archives/functions.ts` |
| `lib/action-center.functions.ts` | `features/action-center/functions.ts` |
| `lib/faculty.functions.ts` | `features/faculty/functions.ts` |
| `lib/ret.functions.ts` | `features/proposals/ret.functions.ts` |
| `lib/comments.functions.ts` | `features/proposals/comments.functions.ts` |
| `lib/project-readiness.functions.ts` | `features/projects/readiness.functions.ts` |
| `lib/reporting-schedule.functions.ts` | `features/projects/reporting-schedule.functions.ts` |
| `lib/derived-states.functions.ts` | `features/projects/derived-states.functions.ts` and `features/proposals/derived-states.functions.ts` |
| `lib/search.functions.ts` | `features/search/functions.ts` |
| `lib/notifications.functions.ts` | `features/notifications/functions.ts` |
| `lib/special-orders.functions.ts` | `features/projects/special-orders.functions.ts` |

## Task 1: Establish Migration Tests and Guardrails

**Files:**
- Create: `frontend/src/features/auth/functions.test.ts`
- Create: `frontend/src/features/projects/functions.test.ts`
- Create: `frontend/src/features/proposals/functions.test.ts`
- Modify: `frontend/src/lib/auth.functions.test.ts`

1. Move the existing password-safety test to `features/auth/functions.test.ts` when the auth module moves.
2. Add failing tests for one project function and one proposal function that mock `authorizeSessionUser` and `getValidAccessToken`, stub `fetch`, invoke the public server function, and assert the expected URL, authorization header, and returned value.
3. Run each new test individually with `pnpm --filter frontend exec vitest run <test-path>` and confirm it fails because the feature module does not yet export the function.
4. Migrate the implementation in Tasks 2-5 until these tests pass.
5. Keep `api/client.test.ts` unchanged; it remains the regression test for shared error parsing.

## Task 2: Move Authentication, Administration, Archives, and Action Center

**Files:**
- Move: `frontend/src/lib/auth.functions.ts` → `frontend/src/features/auth/functions.ts`
- Create: `frontend/src/features/auth/index.ts`
- Move: `frontend/src/lib/admin.functions.ts` → `frontend/src/features/admin/functions.ts`
- Move: `frontend/src/lib/settings.functions.ts` → `frontend/src/features/admin/settings.functions.ts`
- Move: `frontend/src/lib/archives.functions.ts` → `frontend/src/features/archives/functions.ts`
- Move: `frontend/src/lib/action-center.functions.ts` → `frontend/src/features/action-center/functions.ts`
- Modify: `frontend/src/features/admin/index.ts`
- Modify: `frontend/src/features/archives/index.ts`
- Modify: `frontend/src/features/action-center/index.ts`
- Modify: all imports currently matching `@/lib/auth.functions`, `@/lib/admin.functions`, `@/lib/settings.functions`, `@/lib/archives.functions`, and `@/lib/action-center.functions`.

1. Move each file without changing handlers, schemas, query keys, or response types.
2. Replace every moved file's local relative dependency that leaves its owner folder, including auth's `./auth`, `./session.server`, and `./supabase.server` imports, with the correct shared alias.
3. Export the public functions, query options, and consumer-facing types needed by routes/components from the relevant feature barrel.
4. Update consumers to feature paths or feature barrels; do not leave compatibility re-exports in `lib`.
5. Run the focused auth test and `pnpm --filter frontend exec tsc --noEmit`.

## Task 3: Consolidate Proposal and Faculty Behavior

**Files:**
- Move: `frontend/src/lib/ret.functions.ts` → `frontend/src/features/proposals/ret.functions.ts`
- Move: `frontend/src/lib/comments.functions.ts` → `frontend/src/features/proposals/comments.functions.ts`
- Move: `frontend/src/lib/faculty.functions.ts` into `frontend/src/features/faculty/functions.ts`
- Modify: `frontend/src/features/proposals/index.ts`
- Modify: `frontend/src/features/faculty/index.ts`
- Modify: `frontend/src/types/proposal.ts` and `frontend/src/types/user.ts` only if a type is consumed outside its owner.
- Modify: all affected routes, proposal components, faculty pages, RET pages, and report components.

1. Keep RET dashboard proposal flows with proposals because their endpoints are proposal endpoints.
2. Keep proposal comments and PDF annotation types with proposals; update all PDF viewer type imports together with the move.
3. Merge faculty proposal/project query options into faculty’s existing function module without renaming public exports.
4. Add public barrel exports for all migrated functions, query options, and types used outside the owner; update RET and report consumers to those barrels.
5. Run proposal and faculty focused tests, then typecheck.

## Task 4: Consolidate Project Operations

**Files:**
- Move: `frontend/src/lib/project-readiness.functions.ts` → `frontend/src/features/projects/readiness.functions.ts`
- Move: `frontend/src/lib/reporting-schedule.functions.ts` → `frontend/src/features/projects/reporting-schedule.functions.ts`
- Split: `frontend/src/lib/derived-states.functions.ts` → `frontend/src/features/projects/derived-states.functions.ts` and `frontend/src/features/proposals/derived-states.functions.ts`
- Move: `frontend/src/lib/special-orders.functions.ts` → `frontend/src/features/projects/special-orders.functions.ts`
- Modify: `frontend/src/features/projects/index.ts`
- Modify: `frontend/src/features/proposals/index.ts`
- Modify: `frontend/src/hooks/use-project-readiness.ts`
- Modify: `frontend/src/hooks/use-project-reporting-schedule.ts`
- Modify: `frontend/src/hooks/use-derived-state.ts`
- Create: `frontend/src/types/derived-state.ts` for the response type shared by both endpoint owners
- Modify: project, proposal, and RET consumers.

1. Keep project readiness, reporting schedules, and special orders with projects because their endpoint and UI lifecycle is project-owned.
2. Split derived-state handlers by endpoint; do not create a generic abstraction. The proposal function belongs with proposals and the project function belongs with projects.
3. Preserve exact React Query keys to avoid cache invalidation regressions.
4. Export query options and function types from each owning feature barrel, and import the shared `DerivedStateResponse` from `src/types/derived-state.ts`.
5. Run `features/projects/functions.test.ts`, proposal tests, and typecheck.

## Task 5: Create Search and Notifications Features

**Files:**
- Move: `frontend/src/lib/search.functions.ts` → `frontend/src/features/search/functions.ts`
- Move: `frontend/src/lib/notifications.functions.ts` → `frontend/src/features/notifications/functions.ts`
- Create: `frontend/src/features/search/index.ts`
- Create: `frontend/src/features/notifications/index.ts`
- Modify: `frontend/src/components/custom/global-search.tsx`
- Modify: `frontend/src/components/custom/notification-dropdown.tsx`

1. Treat search and notifications as application features, not generic `lib` utilities, because they contain endpoint-specific server functions and query policies.
2. Keep the existing custom components as their UI consumers; do not move them merely to follow the function ownership change.
3. Preserve notification polling intervals and global-search result behavior.
4. Add a focused test for each public query function’s request path or failure behavior; mock the session boundary rather than relying on a live cookie/session.
5. Run the focused tests and typecheck.

## Task 6: Remove Legacy Function Modules and Sweep Imports

**Files:**
- Delete all migrated `frontend/src/lib/*.functions.ts` modules from the migration map.
- Modify: all remaining `frontend/src/**/*.{ts,tsx}` imports matching either alias or relative `*.functions` paths.
- Modify: `frontend/src/hooks/index.ts`, feature barrels, and `frontend/src/types/index.ts` as needed.

1. Search repository-wide for every import whose specifier ends in `.functions` (including `@/lib/...`, `../lib/...`, and other relative forms) and classify every result: it must either be a retained shared utility with a documented reason or be migrated.
2. Search for deep feature imports (`@/features/<feature>/components/...` and `@/features/<feature>/functions`) across unrelated features and replace them with the owner’s barrel where a public export exists.
3. Delete moved source files only after no imports reference them.
4. Run `pnpm --filter frontend lint`, `pnpm --filter frontend exec tsc --noEmit`, and `pnpm --filter frontend test`.
5. Run `pnpm --filter frontend build`.

## Task 7: Document Completion and Commit

**Files:**
- Modify: `docs/sprint-1-frontend-refactoring.md` only if it needs a link to the Sprint 2 plan; otherwise leave it unchanged.
- Create: `docs/sprint-2-frontend-domain-migration.md` as the short status/acceptance document if execution requires a sprint tracker.

1. Record the migration map, deleted legacy modules, and final verification commands.
2. Confirm there are no remaining domain-specific function modules under `src/lib`.
3. Confirm `SearchUserResponse` has one owner in `src/types/search.ts` and `DerivedStateResponse` has one shared owner in `src/types/derived-state.ts`.
4. Commit in logical batches, for example:
   - `refactor(frontend): move auth admin and archives functions to features`
   - `refactor(frontend): consolidate proposal and project feature functions`
   - `refactor(frontend): move search and notifications into features`
5. Do not mix page-component decomposition or runtime behavior changes into these commits.

## Final Verification

```bash
pnpm --filter frontend lint
pnpm --filter frontend exec tsc --noEmit
pnpm --filter frontend test
pnpm --filter frontend build
```

Expected result: all commands exit successfully, `src/lib` contains only cross-cutting utilities, and feature/UI consumers import domain behavior from its owning feature.

## Implementation Note

The migration and import/barrel cleanup have been applied. Frontend typecheck passes with `pnpm --filter frontend exec tsc --noEmit`; test and build commands were not run for this execution.
