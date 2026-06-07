# Squash Migration Chain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Delete all existing Drizzle migration files and regenerate a single clean baseline migration from the current 20 Drizzle schema files.

**Architecture:** The project uses Drizzle ORM with PostgreSQL. The migration chain is broken due to a commented-out migration file marked as applied. We will delete all migration files and the meta directory, then regenerate a fresh baseline migration using `drizzle-kit generate`. This ensures a clean starting point for future migrations.

**Tech Stack:** Hono, Drizzle ORM, PostgreSQL (Supabase), pnpm

---

## Task 1: Verify Current State

**Files:**
- Read: `backend/drizzle/meta/_journal.json`
- Read: `backend/drizzle/0001_tidy_daimon_hellstrom.sql`

**Step 1: Read _journal.json**

Run: `type backend\drizzle\meta\_journal.json` (or use Read tool)
Expected: Shows 3 entries with `version: "5"` and all marked as applied.

**Step 2: Read 0001_tidy_daimon_hellstrom.sql**

Run: `type backend\drizzle\0001_tidy_daimon_hellstrom.sql` (or use Read tool)
Expected: Entire file is commented out (lines start with `--`).

## Task 2: Delete Old Migration Files

**Files:**
- Delete: `backend/drizzle/0000_wet_hydra.sql`
- Delete: `backend/drizzle/0001_tidy_daimon_hellstrom.sql`
- Delete: `backend/drizzle/0002_wet_bloodaxe.sql`
- Delete: `backend/drizzle/meta/` (entire directory)

**Step 1: Delete .sql files**

Run: `del backend\drizzle\0000_wet_hydra.sql backend\drizzle\0001_tidy_daimon_hellstrom.sql backend\drizzle\0002_wet_bloodaxe.sql`

**Step 2: Delete meta directory**

Run: `rmdir /s /q backend\drizzle\meta`

**Step 3: Verify deletion**

Run: `dir backend\drizzle`
Expected: No .sql files or meta directory.

## Task 3: Generate Fresh Baseline Migration

**Files:**
- Execute: `cd backend && pnpm exec drizzle-kit generate`
- Read: Newly generated migration file (e.g., `backend/drizzle/0000_<name>.sql`)
- Read: `backend/drizzle/meta/_journal.json`

**Step 1: Run drizzle-kit generate**

Run: `cd backend && pnpm exec drizzle-kit generate`
Expected: Command succeeds, creates a new migration file and meta directory.

**Step 2: Verify new migration contains all 21 tables**

Read the generated SQL file and count tables:
1. roles
2. campuses
3. departments
4. users
5. proposals
6. proposalDepartments
7. proposalMembers
8. specialOrders
9. proposalDocuments
10. proposalComments
11. proposalReviews
12. beneficiarySectors
13. proposalBeneficiaries
14. sdgs
15. proposalSdgs
16. moas
17. projects
18. projectReports
19. auditLogs
20. systemSettings

Expected: All 21 tables present with CREATE TABLE statements.

**Step 3: Verify journal has single entry**

Read `backend/drizzle/meta/_journal.json`
Expected: Only one entry in the `entries` array.

## Task 4: Commit Changes

**Files:**
- Git add: `backend/drizzle/` (new migration files)
- Git add: `backend/drizzle/meta/` (new meta files)
- Git commit: "chore: squash migration chain into clean baseline"

**Step 1: Stage changes**

Run: `git add backend/drizzle/`

**Step 2: Commit**

Run: `git commit -m "chore: squash migration chain into clean baseline"`

**Step 3: Verify commit**

Run: `git log --oneline -1`
Expected: Shows new commit with above message.

## Task 5: Self-Review

**Checklist:**
- [ ] All 3 old migration files deleted
- [ ] meta/ directory deleted
- [ ] drizzle-kit generate succeeded
- [ ] New migration contains all 21 tables
- [ ] Journal has single entry
- [ ] No commented-out sections in new migration
- [ ] Generated SQL is well-formed

**Step 1: Review generated SQL**

Read the new migration file and verify:
- No commented-out SQL
- Proper CREATE TABLE statements with correct columns and constraints
- All indexes present

**Step 2: Verify no leftover files**

Run: `dir backend\drizzle /b`
Expected: Only one .sql file (the new migration) and meta directory.

**Step 3: Check git status**

Run: `git status`
Expected: Clean working tree after commit.

## Execution Handoff

Plan complete and saved to `docs/plans/2026-06-07-squash-migration-chain.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?