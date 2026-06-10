# Director Dashboard RET Chair Scoping Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add department/campus scoping to the GET /director/dashboard endpoint for RET Chair users.

**Architecture:** Modify the dashboard handler to check user role and apply appropriate filters to all sub-queries (project metrics, chart data, expiring MOAs).

**Tech Stack:** Drizzle ORM, Hono, TypeScript

---

### Task 1: Add scoping to project metrics queries

**Files:**
- Modify: `backend/src/routes/director.routes.ts:584-602`

**Step 1: Add scoping to `projectMetrics` query**

The `projectMetrics` query (lines 584-592) queries the `projects` table. Need to join `projects → proposals` and add filter.

Current code:
```ts
const [projectMetrics, underEvaluationResult] = await Promise.all([
  db
    .select({
      total: sql<number>`count(*)`,
      ongoing: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.ONGOING})`,
      completed: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.COMPLETED})`,
    })
    .from(projects)
    .where(isNull(projects.archivedAt)),
```

Change to:
```ts
const projectMetricsConditions = [isNull(projects.archivedAt)];
if (user.roleName === ROLE_NAMES.RET_CHAIR) {
  if (user.isMainCampus && user.departmentId !== null) {
    projectMetricsConditions.push(eq(proposals.departmentId, user.departmentId));
  } else {
    projectMetricsConditions.push(eq(proposals.campusId, user.campusId));
  }
}

const [projectMetrics, underEvaluationResult] = await Promise.all([
  db
    .select({
      total: sql<number>`count(*)`,
      ongoing: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.ONGOING})`,
      completed: sql<number>`count(*) filter (where ${projects.projectStatus} = ${PROJECT_STATUS.COMPLETED})`,
    })
    .from(projects)
    .innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
    .where(and(...projectMetricsConditions)),
```

**Step 2: Add scoping to `underEvaluationResult` query**

Current code:
```ts
  db.select({ value: count() }).from(proposals).where(
    and(
      isNull(proposals.archivedAt),
      or(
        eq(proposals.status, PROPOSAL_STATUS.SUBMITTED),
        eq(proposals.status, PROPOSAL_STATUS.ENDORSED),
      ),
    ),
  ),
```

Change to:
```ts
  (() => {
    const underEvalConditions = [
      isNull(proposals.archivedAt),
      or(
        eq(proposals.status, PROPOSAL_STATUS.SUBMITTED),
        eq(proposals.status, PROPOSAL_STATUS.ENDORSED),
      ),
    ];
    if (user.roleName === ROLE_NAMES.RET_CHAIR) {
      if (user.isMainCampus && user.departmentId !== null) {
        underEvalConditions.push(eq(proposals.departmentId, user.departmentId));
      } else {
        underEvalConditions.push(eq(proposals.campusId, user.campusId));
      }
    }
    return db.select({ value: count() }).from(proposals).where(and(...underEvalConditions));
  })(),
```

**Step 3: Verify with TypeScript compiler**

Run: `npx tsc --noEmit` in backend directory
Expected: No errors

---

### Task 2: Add scoping to chart data query

**Files:**
- Modify: `backend/src/routes/director.routes.ts:604-612`

**Step 1: Add scoping to chart query**

Current code:
```ts
const chartRows = await db
  .select({
    label: campuses.campusName,
    value: count(),
  })
  .from(proposals)
  .innerJoin(campuses, eq(proposals.campusId, campuses.campusId))
  .where(isNull(proposals.archivedAt))
  .groupBy(campuses.campusName);
```

Change to:
```ts
const chartConditions = [isNull(proposals.archivedAt)];
if (user.roleName === ROLE_NAMES.RET_CHAIR) {
  if (user.isMainCampus && user.departmentId !== null) {
    chartConditions.push(eq(proposals.departmentId, user.departmentId));
  } else {
    chartConditions.push(eq(proposals.campusId, user.campusId));
  }
}

const chartRows = await db
  .select({
    label: campuses.campusName,
    value: count(),
  })
  .from(proposals)
  .innerJoin(campuses, eq(proposals.campusId, campuses.campusId))
  .where(and(...chartConditions))
  .groupBy(campuses.campusName);
```

**Step 2: Verify with TypeScript compiler**

Run: `npx tsc --noEmit` in backend directory
Expected: No errors

---

### Task 3: Add scoping to expiring MOAs query

**Files:**
- Modify: `backend/src/routes/director.routes.ts:627-642`

**Step 1: Add scoping to expiring MOAs query**

The MOA query needs to join through `projects → proposals` to get department/campus for filtering.

Current code:
```ts
const expiringMoaRows = await db
  .select({
    partnerName: partners.partnerName,
    validUntil: moas.validUntil,
  })
  .from(moas)
  .innerJoin(partners, eq(moas.partnerId, partners.partnerId))
  .where(
    and(
      isNull(moas.archivedAt),
      sql`${moas.validUntil} > ${now}`,
      sql`${moas.validUntil} <= ${twoWeeksFromNow}`,
    ),
  )
  .orderBy(moas.validUntil)
  .limit(2);
```

Change to:
```ts
const expiringMoaConditions = [
  isNull(moas.archivedAt),
  sql`${moas.validUntil} > ${now}`,
  sql`${moas.validUntil} <= ${twoWeeksFromNow}`,
];

if (user.roleName === ROLE_NAMES.RET_CHAIR) {
  if (user.isMainCampus && user.departmentId !== null) {
    expiringMoaConditions.push(eq(proposals.departmentId, user.departmentId));
  } else {
    expiringMoaConditions.push(eq(proposals.campusId, user.campusId));
  }
}

const expiringMoaRows = await db
  .select({
    partnerName: partners.partnerName,
    validUntil: moas.validUntil,
  })
  .from(moas)
  .innerJoin(partners, eq(moas.partnerId, partners.partnerId))
  .innerJoin(projects, eq(moas.moaId, projects.moaId))
  .innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
  .where(and(...expiringMoaConditions))
  .orderBy(moas.validUntil)
  .limit(2);
```

**Step 2: Verify with TypeScript compiler**

Run: `npx tsc --noEmit` in backend directory
Expected: No errors

---

### Task 4: Final verification and commit

**Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit` in backend directory
Expected: No errors

**Step 2: Self-review**

Review all changes to ensure:
- Only RET Chair users are affected
- Director/Super Admin functionality unchanged
- Scoping rules correctly applied
- No duplicate filters

**Step 3: Commit**

```bash
git add backend/src/routes/director.routes.ts
git commit -m "fix(dashboard): scope all queries for RET Chair users

- Add department/campus filtering to project metrics query
- Add department/campus filtering to chart data query
- Add department/campus filtering to expiring MOAs query via projects→proposals join
- RET Chair on main campus: filter by departmentId
- RET Chair on satellite campus: filter by campusId
- Director/Super Admin: no scoping (unchanged)"
```
