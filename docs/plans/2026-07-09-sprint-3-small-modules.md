# Sprint 3: Homogenization of the 10 Smaller Modules

> **Goal:** Refactor the remaining 10 smaller modules into routes + services + schemas. Bring 100% architectural homogeneity to the NEUST-EPMS backend.

**Branch:** `refactor/backend-homogenization` (or continue on `refactor/backend`)

**Tech Stack:** TypeScript, Hono (OpenAPIHono), Drizzle ORM, Zod, Supabase, Redis/In-Memory Cache (User Session caching)

---

## Architectural Alignment Analysis

Sprints 1 and 2 successfully split and cleaned up the Big 5 modules (`director`, `proposals`, `projects`, `action-center`, `moas`), which held 80% of the backend code complexity. However, the remaining 10 modules still embed routes, HTTP parsing, Zod schemas, DB queries, caching logic, and third-party integrations into single monolithic route files. 

Refactoring these remaining modules ensures:
1. **100% Codebase Consistency**: Any developer working on any module immediately understands the boundaries of routing, business logic, and schemas.
2. **Superior Testability**: Business rules, caching logic, and file processors can be unit tested in isolation without spawning mock HTTP handlers.
3. **Clean Schemas & Deduplication**: Common schemas (e.g., `UserResponse`, `PaginationQuery`) can be normalized into `src/lib/schemas.ts` or clearly re-used.

---

## Target Structure for Remaining Modules

For each of the 10 modules:
```
src/modules/<name>/
├── index.ts                     ← Barrel re-export (mounts sub-routes)
├── <name>.routes.ts             ← Thin OpenAPI route definitions & handlers (HTTP parsing only)
├── <name>.service.ts            ← Pure business logic & DB transactions
└── <name>.schema.ts             ← Zod schemas & OpenAPI type descriptions
```

---

## Sprint 3 Task Breakdown

### Task 1: Refactor `auth` and `admin` Modules
*   **`auth` (805 lines)**:
    *   *Extract schemas*: Move `UserResponseSchema`, `RegisterUserBodySchema`, `CreateUserBodySchema`, `CheckPasswordBody`, etc. to `auth.schema.ts`.
    *   *Extract service*: Move onboarding, registration validation, password compromise checking (`isPasswordCompromised`), cache reads/writes (`authUserCache`), and user creation queries to `auth.service.ts`.
    *   *Verify*: Thin out `auth.routes.ts` down to HTTP parsing and calling the service.
*   **`admin` (~750 lines)**:
    *   *Extract schemas*: Move user update, college assignment, and admin setting schemas to `admin.schema.ts`.
    *   *Extract service*: Move user approval state updates, role changes, and database audit logs fetches to `admin.service.ts`.
    *   *Verify*: Keep `admin.routes.ts` lightweight with role-guard middlewares.

### Task 2: Refactor `special-orders`, `reports`, and `storage` Modules
*   **`special-orders` (~600 lines)**:
    *   *Extract schemas*: Move upload formats, special order queries, and association request schemas to `special-orders.schema.ts`.
    *   *Extract service*: Move file integrity checking, relationship linking (linking special orders to projects), and audit log writing to `special-orders.service.ts`.
*   **`reports` (~600 lines)**:
    *   *Extract schemas*: Move report details, submission payloads, and rating schemas to `reports.schema.ts`.
    *   *Extract service*: Move status checking (e.g., verifying a reporting schedule is active before submission), file storage updates, and transition workflows to `reports.service.ts`.
*   **`storage` (~450 lines)**:
    *   *Extract schemas*: Move signed URL request payload schemas and file list queries to `storage.schema.ts`.
    *   *Extract service*: Move Supabase storage clients, signed URL expiry calculators, and audit logging to `storage.service.ts`.

### Task 3: Refactor `members` and `search` Modules
*   **`members` (~300 lines)**:
    *   *Extract schemas*: Move project member schemas to `members.schema.ts`.
    *   *Extract service*: Move transactional insertions for adding members, role checking (leader vs. member), and removal operations to `members.service.ts`.
*   **`search` (~250 lines)**:
    *   *Extract schemas*: Move universal search queries and list responses to `search.schema.ts`.
    *   *Extract service*: Move SQL queries that join and query across `campuses`, `departments`, `projects`, and `proposals` using search terms to `search.service.ts`.

### Task 4: Refactor `notifications`, `settings`, and `audit` Modules
*   **`notifications` (~200 lines)**:
    *   *Extract service*: Move notification polling queries and bulk read-state updates to `notifications.service.ts`.
*   **`settings` (~150 lines)**:
    *   *Extract service*: Move preference storage and notification setting modifiers to `settings.service.ts`.
*   **`audit` (~200 lines)**:
    *   *Extract service*: Move paginated log collection and filter queries to `audit.service.ts`.

---

## Execution & Verification Workflow

For each module, the process should be:
1. **Create service and schema files** and move code block-by-block.
2. **Clean up `routes.ts`** and import dependencies.
3. **Verify it compiles** with:
    ```bash
    npx tsc --noEmit
    ```
4. **Run domain-specific tests** to verify functional parity (e.g., `npx vitest run src/modules/auth/auth.routes.test.ts`).
5. **Commit atomically** for each module (e.g., `refactor(auth): split auth module into routes, service, and schemas`).
