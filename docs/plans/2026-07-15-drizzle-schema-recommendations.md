# Drizzle Schema Recommendations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the findings from the database-design-analysis skill review of the Drizzle ORM schema. Changes fall into two tracks: (A) schema fixes with data migration, and (B) documentation/audit-only.

**Architecture:** The schema uses Drizzle ORM with PostgreSQL (`pg-core`). All tables are defined in `backend/src/db/schema/*.ts`, relations in `backend/src/db/relations.ts`. Migrations are generated with `drizzle-kit` and stored in `backend/drizzle/`. The service layer uses Drizzle queries throughout.

**Key corrections from initial analysis** (learned by reading service layer):
- `reportType` in `project_reports` is **NOT redundant** with `project_reporting_milestones.reportType` — a milestone categorizes ("Progress" vs "Project Closure"), while the report records its actual type ("Progress", "Terminal", or "Final Accomplishment"). A "Project Closure" milestone can legitimately accept both "Terminal" and "Final Accomplishment" reports. The unique `(milestoneId, reportType)` is correct.
- `archivedAt` in `proposal_beneficiaries` IS per-row — the service archives individual sector links, not the whole proposal. No partial dependency.
- `projectId` in `project_reports` is denormalized (derivable via `milestoneId → project_reporting_milestones.projectId`), but drift risk is minimal and removal requires significant query churn (25+ references across 6+ files). Downgraded to Informational.

**Tech Stack:** TypeScript, Drizzle ORM (`pg-core`), PostgreSQL, Hono, Zod

---

### Task 1: Withdraw DB-002 and DB-005 from the findings record

**Files:**
- Create: `docs/adr/YYYY-MM-DD-withdrawn-db-findings.md` (optional — if the team keeps a decision log)
- Or just annotate the plan

**Why withdrawn:**
- DB-002 (`reportType` redundant): The milestone's `reportType` is a category ("Progress" / "Project Closure"), while the report's `reportType` is the specific type ("Progress" / "Terminal" / "Final Accomplishment"). A single "Project Closure" milestone produces two reports of different types. The unique `(milestoneId, reportType)` enforces correctness.
- DB-005 (`archivedAt` partial dep): `proposals.service.ts:299-304` shows per-row archiving by `(proposalId, sectorId)`. Not proposal-scoped. No dependency.

**No code changes.** This is a documentation update to close the loop.

---

### Task 2: Remove `project_id` from `project_reports` (DB-001, optional)

**Impact:** Informational. 25+ references across 6 files. Drift risk is theoretical — `projectId` is always set from the milestone during creation and milestones never change projects.

**Files to modify if implemented:**
- Modify: `backend/src/db/schema/project-reports.ts` — remove `projectId` column, remove `projectIdx` index, update unique constraint
- Modify: `backend/src/db/relations.ts` — remove `project` relation from `projectReportsRelations`
- Modify: `backend/src/modules/reports/reports.service.ts` — 12+ references: change joins from `projectReports.projectId` to join via `projectReportingMilestones.projectId`
- Modify: `backend/src/modules/projects/projects.service.ts` — 3 references
- Modify: `backend/src/modules/director/director.service.ts` — 2 references
- Modify: `backend/src/modules/search/search.service.ts` — 1 reference
- Modify: `backend/src/cron/privacy-retention.ts` — 1 reference
- Modify: `backend/src/modules/reports/reports.schema.ts` — `ReportSchema` Zod object still exposes `projectId` in API responses
- Create: `backend/drizzle/0002_remove_project_id_from_reports.sql` — new migration

**Step 1: Verify business rule — no code reads depend on `projectId` being writable independently**

Check: `backend/src/modules/reports/reports.service.ts:263` — `projectId` is set from `milestone.projectId` at insert. Never updated independently. **Confirmed safe.**

**Step 2: Update schema definition**

In `backend/src/db/schema/project-reports.ts`:
- Remove `projectId` column definition (lines 18-20)
- Remove `projectIdx` index
- If `milestoneId` is unique per report (one report per milestone), change unique to just `(milestoneId)`. If a milestone can have multiple reports of different types, keep the table as-is but drop `projectId`.

Current unique: `unique("project_reports_milestone_type_unique").on(table.milestoneId, table.reportType)`
This remains correct — don't change it.

**Step 3: Update relations**

In `backend/src/db/relations.ts:233-235`:
- Remove the `project: one(projects, ...)` block from `projectReportsRelations`
- Keep `submitter` and `milestone` relations

**Step 4: Update `reportSelection` object**

In `backend/src/modules/reports/reports.service.ts:73-88`:
- Remove `projectId: projectReports.projectId`
- Add `projectId: projectReportingMilestones.projectId` (need to add join to milestones)

**Step 5: Update `listReports` query**

In `backend/src/modules/reports/reports.service.ts:105-115`:
- Change join from `eq(projectReports.projectId, projects.projectId)` to:
  ```
  .innerJoin(projectReportingMilestones, eq(projectReports.milestoneId, projectReportingMilestones.milestoneId))
  .innerJoin(projects, eq(projectReportingMilestones.projectId, projects.projectId))
  ```

**Step 6: Update `getReportStats` query**

In `backend/src/modules/reports/reports.service.ts:132-138`:
- Same join pattern change

**Step 7: Update `createReport` query**

In `backend/src/modules/reports/reports.service.ts:260-270`:
- Remove `projectId: milestone.projectId` from insert values

In `backend/src/modules/reports/reports.service.ts:289-297`:
- Update join to go through milestones

**Step 8: Update `uploadReportDocument` query**

In `backend/src/modules/reports/reports.service.ts:313-324`:
- Remove `projectId: projectReports.projectId` from select
- Update join to go through milestones

In `backend/src/modules/reports/reports.service.ts:351`:
- Change storage path from `report.projectId` to `report.milestoneId` (or join to milestone first)

**Step 9: Update other service files**

- `backend/src/modules/projects/projects.service.ts:188, 653, 1104`
- `backend/src/modules/director/director.service.ts:773`
- `backend/src/modules/search/search.service.ts:112`
- `backend/src/cron/privacy-retention.ts:125`
- `backend/src/cron/report-overdue.ts:145`

Each needs the same pattern: join through `projectReportingMilestones` instead of using `projectReports.projectId` directly.

**Step 10: Generate migration**

Run: `npx drizzle-kit generate` to create the migration file.

**Step 11: Run tests**

```bash
cd backend && npm test 2>&1
```
Expected: All existing tests pass.

**This task is OPTIONAL.** Given the surface area (6+ files, 25+ references) and low drift risk, the recommended action is **defer** unless there's a specific production incident caused by `projectId` drift.

---

### Task 3: Clarify `added_at` semantics in `proposal_departments` (DB-004)

**Files:**
- Modify: `backend/src/db/schema/proposal-departments.ts` — add JSDoc comment clarifying business rule
- (Optional) Move `addedAt` to `proposals` table if confirmed to be proposal-scoped

**Why this matters:** `added_at` uses `defaultNow()`. When multiple collaborating departments are inserted simultaneously (as in `proposals.service.ts:116`), all get the same timestamp. If this represents "when the association was made" it's correct. If it represents "proposal creation time" it's a partial dependency.

**Step 1: Read the insert code**

In `backend/src/modules/proposals/proposals.service.ts:116`:
```typescript
await tx.insert(proposalDepartments).values(
    body.departmentIds.map((id: number) => ({
        proposalId: created.proposalId,
        departmentId: id,
    })),
)
```
All departments get the same `addedAt` (transaction timestamp). This is ambiguous — could be either per-association (if departments are always added in bulk at creation) or proposal-scoped.

**Step 2: Search for partial updates**

Search for any code that updates `proposal_departments` for a single department after creation. If none exists, `addedAt` is functionally proposal-scoped.

**Step 3: Add clarifying comment OR move column**

Option A (if per-association): Add JSDoc comment
```typescript
/**
 * Junction table: proposals ↔ departments (many-to-many).
 * Allows multiple departments to collaborate on a single proposal.
 * added_at is per-association — tracks when each department was linked.
 */
```

Option B (if proposal-scoped): Move `addedAt` to `proposals` table and remove from junction
- Remove column from `backend/src/db/schema/proposal-departments.ts`
- Add `collaborationAddedAt` to `backend/src/db/schema/proposals.ts`
- Update seed script if it references this

**Recommendation:** Add the JSDoc comment (Option A) since there's no evidence of per-row updates. The column adds negligible storage cost and provides auditing value.

---

### Task 4: Document the `proposal_members → campus` diamond (DB-003)

**Files:**
- Modify: `backend/src/db/relations.ts` — add clarifying comments on the diamond
- (Optional) Create: `docs/adr/YYYY-MM-DD-campus-diamond.md`

**Why this matters:** Two paths exist to resolve a member's campus:
```
Path A: member → proposal → campus
Path B: member → user → campus
```
These can disagree (user from campus A working on a proposal from campus B). Reporting or authorization queries that pick the wrong path will silently produce wrong results.

**Step 1: Audit query layer for campus resolution paths**

Search for all queries that join `proposal_members → proposals → campuses` or `proposal_members → users → campuses`:

```bash
rg "proposalMembers.*campus|campus.*proposalMembers" --type ts backend/src
rg "proposalMembers.*innerJoin|from.*proposalMembers" --type ts backend/src
```

**Step 2: Add comments to relations**

In `backend/src/db/relations.ts`, add a header comment above `proposalsMembersRelations`:
```typescript
/**
 * proposal_members → campus DIAMOND (Conflicting-by-design):
 *   Path A: member → proposal → campus  (proposal's originating campus)
 *   Path B: member → user → campus       (member's home campus)
 * These can differ (cross-campus collaboration). Every query that resolves
 * "a member's campus" must explicitly choose the correct path for its context.
 * Do NOT assume both paths return the same value.
 */
```

**Step 3: Document in ADR** (optional, if the team maintains ADRs)

Document the diamond, the two paths, which one to use in which context, and the rule for precedence.

**No schema changes needed.**

---

### Task 5: Add partial index on `project_reports` for active non-closure reports (Performance)

**Files:**
- Modify: `backend/src/db/schema/project-reports.ts` — add partial index
- Create: `backend/drizzle/0002_project_reports_active_idx.sql` — migration

**Why:** `getReportStats` filters `project_reports` by `reportType = "Progress"` and `reportType = "Terminal"` on non-archived, non-closure rows. These queries scan the table without a partial index.

**Step 1: Add partial index**

In `backend/src/db/schema/project-reports.ts`, add to the table's third argument:
```typescript
activeProgressIdx: index("project_reports_active_progress_idx")
    .on(table.reportType)
    .where(sql`${table.archivedAt} IS NULL`),
```

**Step 2: Generate migration**

Run: `npx drizzle-kit generate`

---

## Execution Order

| Task | Files Changed | Risk | Effort | Priority |
|------|--------------|------|--------|----------|
| Task 1 (withdraw findings) | 0 (doc only) | None | 5 min | Immediate |
| Task 2 (remove projectId) | 6+ | Medium | 2-3 hours | Defer |
| Task 3 (clarity added_at) | 1 | None | 15 min | Low |
| Task 4 (document diamond) | 1-2 | None | 30 min | Medium |
| Task 5 (partial index) | 1 | None | 15 min | Low |

**Recommended sprint:** Tasks 1, 3, 4, 5 in one session. Task 2 deferred.
