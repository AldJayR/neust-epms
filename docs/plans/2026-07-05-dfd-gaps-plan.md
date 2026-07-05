# DFD Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close remaining 14 DFD gaps (backend + frontend) identified in the revised DFD analysis.

**Architecture:** Backend-first approach — foundational endpoints and data changes land first, then frontend builds on top. Each phase produces a shippable increment.

**Tech Stack:** Hono + Drizzle ORM (backend), TanStack Start/Router + shadcn + Resend (frontend).

---

## Phase 1: Backend Quick Fixes (4 gaps, ~1.5h)

Small, self-contained backend changes. No schema migrations needed.

### Task 1.1: Send activation notification on user approve

**Files:**
- Modify: `backend/src/routes/admin.routes.ts` — in `PATCH /admin/users/approve` handler, after `insertAuditLog`, add `createNotification` call

**Steps:**
1. Import `createNotification` from `../lib/notification.helpers.js`
2. After the audit log call, loop through the approved user IDs and call `createNotification` for each
3. Notification title: `"Account Activated"`, message: `"Your account has been approved and activated."`, type: `"system"`
4. No email needed — just in-app notification

**Verify:** Run backend tests — `npx vitest run`

### Task 1.2: Send submission acknowledgment notification

**Files:**
- Modify: `backend/src/routes/proposals.routes.ts` — in `POST /proposals` handler and `POST /proposals/{id}/submit` handler

**Steps:**
1. Import `createNotification` (already imported in this file)
2. After the audit log call in `POST /proposals`, find the project leader's userId from `proposalMembers` where `projectRole = "Project Leader"`
3. Call `createNotification` with `recipientId: leaderUserId`, `type: "proposal"`, `title: "Submission Received"`, `message: "Your proposal '{title}' has been received and is pending review."`
4. Do the same in `POST /proposals/{id}/submit` handler

**Verify:** Run backend tests

### Task 1.3: Clear Overdue flag when report is submitted

**Files:**
- Modify: `backend/src/routes/reports.routes.ts` — in `POST /reports` handler, after inserting the report

**Steps:**
1. After the report is inserted, query the parent project: `SELECT projectStatus FROM projects WHERE projectId = :projectId`
2. If `projectStatus === "Overdue"`, update it back to `"Ongoing"`:
   ```ts
   await db.update(projects)
     .set({ projectStatus: "Ongoing", updatedAt: new Date() })
     .where(eq(projects.projectId, projectId));
   ```
3. Log the transition in the audit log

**Verify:** Run backend tests

### Task 1.4: Fix admin stats pending count

**Files:**
- Modify: `backend/src/routes/admin.routes.ts` — in `GET /admin/stats` handler

**Steps:**
1. Replace the hardcoded `pendingApproval: 0` with an actual query:
   ```ts
   const [pendingResult] = await db
     .select({ value: count() })
     .from(users)
     .where(eq(users.isActive, false));
   ```
2. Set `pendingApproval: Number(pendingResult?.value ?? 0)`

**Verify:** Run backend tests

---

## Phase 2: Backend Core Features (3 gaps, ~5h)

Requires new endpoints and/or schema changes.

### Task 2.1: Add reject endpoint for pending registrations

**Files:**
- Modify: `backend/src/routes/admin.routes.ts` — add `PATCH /admin/users/{id}/reject`

**Steps:**
1. Define new route schema: `RejectUserSchema` with optional `reason` (string)
2. Create route: `PATCH /admin/users/{id}/reject` — Super Admin only
3. Handler: load user, verify `isActive === false`, set `isActive` remains false (or add `rejectedAt` timestamp if column exists — otherwise just archive the user)
4. Log audit event: `"Rejected user {userId}"`
5. Add OpenAPI route definition matching existing patterns in admin.routes.ts

**Schema consideration:** If no `rejectedAt` column exists, soft-delete by setting `archivedAt = new Date()` instead.

**Verify:** Run backend tests

### Task 2.2: Add duplicate title check for proposals

**Files:**
- Modify: `backend/src/routes/proposals.routes.ts` — in `POST /proposals` handler

**Steps:**
1. Before the insert, query for existing proposals with matching title (case-insensitive):
   ```ts
   const [existing] = await db
     .select({ proposalId: proposals.proposalId, title: proposals.title })
     .from(proposals)
     .where(ilike(proposals.title, body.title))
     .limit(1);
   ```
2. If found, return HTTP 409 Conflict with `{ error: { code: "DUPLICATE_TITLE", message: "A proposal with this title already exists", existingProposalId } }`
3. Frontend will handle this with a warning dialog (Phase 3)

**Verify:** Run backend tests

### Task 2.3: Add Project Implementation Updates (7.3)

**Files:**
- Create: `backend/src/db/schema/project-updates.ts` — new table
- Modify: `backend/src/db/schema/index.ts` — export new table
- Create: `backend/src/routes/project-updates.routes.ts` — new endpoint
- Modify: `backend/src/app.ts` — register new routes

**Schema:**
```ts
export const projectUpdates = pgTable("project_updates", {
  updateId: uuid("update_id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.projectId),
  userId: uuid("user_id").notNull().references(() => users.userId),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  projectIdx: index("pu_project_id_idx").on(table.projectId),
}));
```

**Endpoints:**
- `POST /projects/{id}/updates` — create update (any project member). Content is required text.
- `GET /projects/{id}/updates` — list updates for project (paginated, newest first)

**Steps:**
1. Create schema file
2. Export from schema index
3. Run `npx drizzle-kit push` to apply migration
4. Create route file with both endpoints
5. Register in app.ts
6. Authorization: user must be a member of the proposal linked to this project

**Verify:** Run backend tests, verify migration

---

## Phase 3: Frontend Quick Wins (5 gaps, ~3h)

Small frontend-only changes building on backend from Phase 1.

### Task 3.1: Add Reject button to proposal review (6.3)

**Files:**
- Modify: `frontend/src/features/director/components/proposal-details-tab.tsx`
- Modify: `frontend/src/features/director/proposal-review-page.tsx`

**Steps:**
1. In `proposal-details-tab.tsx`, add a third action button alongside Return and Endorse/Approve:
   - Label: "Reject"
   - Style: `variant="destructive"` or red-colored
   - Only visible for Director (not RET Chair)
2. Add `isRejectOpen` state and a reject dialog similar to the Return dialog
3. In `proposal-review-page.tsx`, add `handleReject` function:
   ```ts
   const handleReject = (comments?: string) => {
     reviewMutation.mutate({
       proposalId,
       decision: "Rejected",
       comments: comments || "Proposal rejected",
     });
   };
   ```
4. Pass `handleReject` to `ProposalDetailsTab`

**Verify:** Run frontend build — `npx vite build`

### Task 3.2: Add Withdraw button to proposal detail (4.5)

**Files:**
- Modify: `frontend/src/features/director/project-details-page.tsx`
- Modify: `frontend/src/lib/dashboard.functions.ts` — add `withdrawProposalFn`

**Steps:**
1. Add server function in `dashboard.functions.ts`:
   ```ts
   export const withdrawProposalFn = createServerFn({ method: "POST" })
     .validator(z.object({ proposalId: z.string() }))
     .handler(async ({ data }) => {
       await authorizeSessionUser("Faculty", "RET Chair", "Director");
       const token = await getValidAccessToken();
       const response = await fetch(`${API_BASE}/proposals/${data.proposalId}`, {
         method: "DELETE",
         headers: { Authorization: `Bearer ${token}` },
       });
       if (!response.ok) throw new Error("Failed to withdraw proposal");
       return response.json();
     });
   ```
2. In `project-details-page.tsx`, add a "Withdraw" button in the header actions:
   - Visible when: user is project leader AND status is `"Pending Review"` or `"Returned"`
   - On click: confirm dialog → call `withdrawProposalFn` → invalidate query → navigate to proposals list

**Verify:** Run frontend build

### Task 3.3: Wire Export CSV (9.2)

**Files:**
- Modify: `frontend/src/features/admin/activity-log-page.tsx`

**Steps:**
1. Replace the empty `exportToCsv` function body with CSV generation:
   ```ts
   const exportToCsv = () => {
     if (!logsData?.items?.length) {
       toast.error("No data to export");
       return;
     }
     const headers = ["Time", "Action", "Actor", "Type"];
     const rows = logsData.items.map((log) => [
       new Date(log.createdAt).toISOString(),
       `"${log.action.replace(/"/g, '""')}"`,
       log.actorName ?? "System",
     ]);
     const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
     const url = URL.createObjectURL(blob);
     const link = document.createElement("a");
     link.href = url;
     link.download = `activity-log-${new Date().toISOString().split("T")[0]}.csv`;
     link.click();
     URL.revokeObjectURL(url);
     toast.success("CSV exported");
   };
   ```

**Verify:** Run frontend build

### Task 3.4: Wire Export Reports button (8.4)

**Files:**
- Modify: `frontend/src/features/director/reports-page.tsx`

**Steps:**
1. Find the Export Reports button (currently has no onClick)
2. Add an `exportReports` function similar to the activity log CSV export
3. Use the filtered reports data to generate CSV with columns: Title, Type, Status, Date Submitted, Project, Leader
4. Wire the onClick handler

**Verify:** Run frontend build

### Task 3.5: Fix route guard mismatches

**Files:**
- Modify: `frontend/src/routes/_authenticated/admin/settings/index.tsx`
- Modify: `frontend/src/features/admin/users-page.tsx` (sidebar)

**Steps:**
1. Check the Settings route guard — if it requires Super Admin but sidebar shows for all roles, either:
   - Option A: Change route guard to allow all authenticated users (if settings are read-only for non-admins)
   - Option B: Hide the sidebar link for non-Super Admin users
2. Check the Faculty/MOA route guards — add Super Admin to `authorizeSessionUser` in the backend endpoints, OR block Super Admin in the route guard

**Verify:** Run frontend build

---

## Phase 4: Frontend Core — Project Update Form (1 gap, ~4h)

The biggest remaining frontend gap. Depends on Task 2.3 (backend).

### Task 4.1: Add project updates API function

**Files:**
- Modify: `frontend/src/lib/dashboard.functions.ts` — add server functions

**Steps:**
1. Add `getProjectUpdatesFn` — calls `GET /projects/{id}/updates`
2. Add `createProjectUpdateFn` — calls `POST /projects/{id}/updates`
3. Add query options: `projectUpdatesQueryOptions(projectId)`

### Task 4.2: Create project update form component

**Files:**
- Create: `frontend/src/features/director/components/project-update-form.tsx`

**Steps:**
1. Create a card-based form component:
   - Text area for update content (required, min 10 characters)
   - Submit button with loading state
   - On submit: call `createProjectUpdateFn`, invalidate query, show toast
2. Style to match existing form patterns (FieldGroup, Label, etc.)

### Task 4.3: Add updates section to project details page

**Files:**
- Modify: `frontend/src/features/director/project-details-page.tsx`

**Steps:**
1. Add a new `<PageCard>` section below the existing content, titled "Implementation Updates"
2. Load updates with `useQuery(projectUpdatesQueryOptions(projectId))`
3. Display updates as a timeline-style list (similar to the existing ActivityHistoryCard pattern)
4. Show the `ProjectUpdateForm` at the top of the section (only if project is `Ongoing` and user is a member)
5. Each update card shows: content text, author name, date

**Verify:** Run frontend build

---

## Phase 5: Remaining Gaps (3 gaps, ~6h)

Lower priority items.

### Task 5.1: Duplicate title check frontend (4.1)

**Files:**
- Modify: `frontend/src/features/proposals/components/create-proposal-modal.tsx`

**Steps:**
1. After step 2 (title entry) in the wizard, before proceeding to step 3:
   - Make a debounced check call to the backend (or do it on step transition)
   - If 409 response, show a warning dialog: "A proposal with a similar title already exists. Do you want to continue?"
   - Allow user to go back and change the title, or proceed anyway
2. This is a soft check — not a hard block

### Task 5.2: MOA Edit PDF re-upload (5.1)

**Files:**
- Modify: `frontend/src/features/moa/components/edit-moa-modal.tsx`
- Modify: `frontend/src/lib/moa.functions.ts`

**Steps:**
1. Add file upload input to the edit modal (same pattern as create modal)
2. If a new file is selected, upload it separately via `POST /moas/upload` (or add FormData support to `PATCH /moas/{id}`)
3. Show current document link if `storagePath` exists

### Task 5.3: Audit trail access logging (9.2)

**Files:**
- Modify: `backend/src/routes/audit.routes.ts` — in `GET /audit-logs` handler

**Steps:**
1. After the query, call `insertAuditLog` with the requesting user's ID and action `"Viewed audit trail"`
2. This ensures every access to the audit log is itself audited

---

## Verification

After all phases, run:

```bash
# Backend
cd backend && npx vitest run

# Frontend
cd frontend && npx vite build
```

All 98+ backend tests should pass. Frontend should compile with no errors.

---

## Effort Summary

| Phase | Gaps | Effort |
|-------|------|--------|
| 1. Backend Quick Fixes | 4 | ~1.5h |
| 2. Backend Core Features | 3 | ~5h |
| 3. Frontend Quick Wins | 5 | ~3h |
| 4. Frontend Core (Project Updates) | 1 | ~4h |
| 5. Remaining Gaps | 3 | ~6h |
| **Total** | **14** | **~19.5h** |
