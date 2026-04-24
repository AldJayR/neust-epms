# NEUST EPMS Backend Codebase Audit
## Focus: Scalability & System Design

**Audit Date:** April 23, 2026  
**Auditor Role:** Senior Backend Engineer (Scalability & System Design Specialist)  
**Scope:** `backend/` directory only

---

## Executive Summary

The backend is **well-structured with a solid foundation** but has **critical scalability concerns** that will become problematic as data volume and concurrent user load increases. The codebase demonstrates good practices in authentication, error handling, and API documentation, but lacks caching strategies, lacks query optimization, and has potential N+1 problems that could bottleneck under production load.
 

**Overall Assessment:** 6.5/10 for production scalability
- **Strengths:** Clean architecture, type safety, audit logging, RBAC, structured error handling
- **Weaknesses:** No caching layer, inefficient queries, synchronous cron execution, hardcoded connection pools, missing pagination defaults

**Recent Work:** Pagination on list endpoints, MOA cron batch update, DB pool configurability, and an in-process LRU cache for auth/profile and settings have been implemented and validated with tests.

---

## 1. Architecture Assessment

### 1.1 Overall Design Pattern ✅ GOOD

**Architecture:** Feature-based modular routes with centralized DB layer  
**Framework:** Hono (lightweight, edge-compatible)  
**ORM:** Drizzle ORM (type-safe, zero-runtime overhead)  
**API Style:** RESTful with OpenAPI documentation  
**Auth:** Supabase JWT with local DB profile lookup

**Verdict:** Clean, maintainable, and follows industry best practices for Express-like frameworks.

### 1.2 Route Organization ✅ GOOD

10 route modules organized by domain:
- `auth.routes.ts` - Authentication & profiles
- `proposals.routes.ts` - Core proposal CRUD & workflow
- `members.routes.ts` - Team membership management
- `projects.routes.ts` - Project lifecycle post-approval
- `reports.routes.ts` - Progress reporting
- `moas.routes.ts` - MOA tracking
- etc.

**Each route module:**
- Has standalone OpenAPI schema definitions
- Uses Zod for runtime validation
- Includes integration tests
- Has consistent error handling

**Verdict:** Good separation of concerns. Scales well up to ~10-15 routes before consolidation is needed.

### 1.3 Middleware Stack ✅ GOOD

**Global middleware (in order):**
```
1. logger()              // HTTP request logging
2. secureHeaders()      // Security headers
3. requestId()          // Request tracking (via X-Request-ID)
4. cors()               // CORS for localhost:3001, localhost:5173
5. Global error handler // Standardized JSON error responses
```

**Auth Flow:**
```
Request → authMiddleware → Supabase.auth.getUser() → DB user profile lookup → c.var.user
```

**Issues:**
- ⚠️ Auth middleware runs on **EVERY** protected route (no bypass for batch ops)
- ⚠️ Supabase token validation is **NOT cached** (hits external service on every request)
- ⚠️ User profile lookup queries `users JOIN roles` **without SELECT optimization** (fetches all columns)

---

## 2. Database Design & Query Patterns

### 2.1 Schema Design ✅ EXCELLENT

**21 well-designed tables** with clear relationships:

```
CORE ENTITIES:
├── users (1:M) → roles, proposals, audit_logs
├── campuses (1:M) → departments, users, proposals
├── departments (1:M) → users, proposals

PROPOSAL WORKFLOW (Central Hub):
├── proposals (1:1) ↔ projects
│   ├── 1:M → proposal_members
│   ├── 1:M → proposal_documents
│   ├── 1:M → proposal_reviews
│   ├── M:M → proposal_departments (junction)
│   ├── M:M → proposal_beneficiaries (junction)
│   └── M:M → proposal_sdgs (junction)

PROJECT LIFECYCLE:
├── projects (1:M) ← proposals
│   ├── (optional) → moas
│   └── 1:M → progress_reports

MOA TRACKING:
├── moas (1:M) → projects
└── special_orders (1:M) ← proposal_members

AUDIT & CONFIG:
├── audit_logs (indexed: user_id, created_at)
└── system_settings
```

**Strengths:**
- ✅ Proper foreign keys with referential integrity
- ✅ All tables have `created_at`, `updated_at`, `archived_at` timestamps
- ✅ Soft-delete pattern consistent across all tables
- ✅ Good index coverage on commonly filtered columns

**Indexes Found:**
```sql
proposals:
  - proposals_leader_id_idx (projectLeaderId)
  - proposals_campus_id_idx (campusId)
  - proposals_department_id_idx (departmentId)
  - proposals_status_idx (currentStatus)
```

**Verdict:** Excellent relational design. No major structural issues.

### 2.2 Query Patterns ⚠️ NEEDS IMPROVEMENT

#### Problem 1: Missing LIMIT on List Queries
```typescript
// proposals.routes.ts line 120-130
app.openapi(listRoute, async (c) => {
  const rows = await db
    .select()
    .from(proposals)
    .where(isNull(proposals.archivedAt))
    .orderBy(desc(proposals.createdAt));
  
  const items = rows.map((r) => ({...r, ...timestamps}));
  return c.json({ items, total: items.length }, 200);
});
```

**Issue:** 
- ❌ Fetches **ALL non-archived proposals** (unbounded)
- ❌ No pagination implemented
- ❌ If 100K proposals exist → loads entire dataset into memory
- ❌ Transfer 100K+ rows over network

**Severity:** 🔴 CRITICAL for scalability

#### Problem 2: Missing SELECT Column Specification
```typescript
// audit.routes.ts line 59-66
const rows = await db
  .select()
  .from(auditLogs)
  .orderBy(desc(auditLogs.createdAt))
  .limit(limit)
  .offset(offset);

const items = rows.map((r) => ({...r, createdAt: r.createdAt.toISOString()}));
```

**Issue:**
- ❌ `select()` with no args fetches all columns
- ⚠️ If audit_logs has binary/text columns, wastes bandwidth
- ⚠️ Better: `select({ logId, userId, action, tableAffected, ipAddress, createdAt })`

**Severity:** 🟡 MODERATE (good pagination, but wasteful)

#### Problem 3: Auth Middleware Joins Without Optimization
```typescript
// middleware/auth.ts line 47-55
const [appUser] = await db
  .select({
    userId: users.userId,
    email: users.email,
    roleId: users.roleId,
    roleName: roles.roleName,
    campusId: users.campusId,
    departmentId: users.departmentId,
    isActive: users.isActive,
  })
  .from(users)
  .innerJoin(roles, eq(users.roleId, roles.roleId))
  .where(eq(users.userId, supabaseUser.id))
  .limit(1);
```

**Good:** ✅ Column specification & LIMIT 1 are correct

**Issue:**
- ⚠️ Runs **on every authenticated request** (all 10 routes × multiple operations)
- ⚠️ No caching of user profile within request lifetime
- ⚠️ No server-side caching of role/user data (every request hits DB)

**Severity:** 🔴 CRITICAL under load

#### Problem 4: N+1 in Proposal Retrieval
```typescript
// proposals.routes.ts line 230-265
app.openapi(createProposalRoute, async (c) => {
  const created = await db.transaction(async (tx) => {
    const [proposal] = await tx
      .insert(proposals)
      .values({...})
      .returning();

    // INSERT proposal_departments for each dept
    if (body.departmentIds && body.departmentIds.length > 0) {
      await tx.insert(proposalDepartments).values(
        body.departmentIds.map((deptId) => ({
          proposalId: proposal.proposalId,
          departmentId: deptId,
        })),
      );
    }

    // INSERT proposal_beneficiaries for each sector
    if (body.sectorIds && body.sectorIds.length > 0) {
      await tx.insert(proposalBeneficiaries).values(...);
    }

    // INSERT proposal_sdgs for each SDG
    if (body.sdgIds && body.sdgIds.length > 0) {
      await tx.insert(proposalSdgs).values(...);
    }
  });
});
```

**Good:** ✅ Uses transactions for ACID compliance  
**Issue:**
- ✅ Actually GOOD - uses batch INSERT (no N+1)
- ⚠️ But returns only base proposal object, not related entities

#### Problem 5: MOA Expiration Cron Job
```typescript
// cron/moa-expiration.ts line 10-30
export function startMoaExpirationCron(): void {
  cron.schedule("0 1 * * *", async () => {
    const expiredMoas = await db
      .select()
      .from(moas)
      .where(
        and(
          eq(moas.isExpired, false),
          lte(moas.validUntil, now),
          isNull(moas.archivedAt),
        ),
      );

    for (const moa of expiredMoas) {
      await db
        .update(moas)
        .set({ isExpired: true, updatedAt: now })
        .where(eq(moas.moaId, moa.moaId));
    }
  });
}
```

**Issue:**
- ❌ Loop with individual UPDATE statements = N queries
- ❌ Runs synchronously on main thread (blocks if many MOAs exist)
- ❌ No error handling for email service

**Better approach:** Batch UPDATE
```typescript
await db
  .update(moas)
  .set({ isExpired: true, updatedAt: now })
  .where(and(eq(moas.isExpired, false), lte(moas.validUntil, now), isNull(moas.archivedAt)));
```

**Severity:** 🟡 MODERATE (only runs daily, but poor pattern)

### 2.3 Connection Pooling ✅ ACCEPTABLE

```typescript
// db/client.ts
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,                    // Max connections
  idleTimeoutMillis: 30_000,  // 30s idle timeout
  connectionTimeoutMillis: 5_000,  // 5s timeout
});
```

**Assessment:**
- ✅ Pool size of 20 is reasonable for small-to-medium load
- ⚠️ Should be **configurable** via ENV variable
- ⚠️ Idle timeout (30s) is good, but consider 60s for less churn
- ⚠️ No connection pool monitoring (no metrics)
- ⚠️ No circuit breaker for DB connection failures

**For 100 concurrent users:** 20 connections is **marginal** (0.2 conn/user)  
**For 1000 concurrent users:** 20 connections is **critically insufficient**

**Recommendation:**
```typescript
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: parseInt(env.DB_POOL_MAX ?? "20"),
  idleTimeoutMillis: parseInt(env.DB_IDLE_TIMEOUT ?? "60000"),
  connectionTimeoutMillis: parseInt(env.DB_CONNECTION_TIMEOUT ?? "5000"),
});
```

**Severity:** 🟡 MODERATE-HIGH (will fail under load)

---

## 3. Performance & Scalability Concerns

### 3.1 Missing Caching Layer 🔴 CRITICAL

**Current State:** Zero caching
- ❌ No Redis or in-memory cache
- ❌ Every request triggers DB queries
- ❌ User profile lookup on every authenticated request (repeats 3x+ per user session)
- ❌ Role data is queried repeatedly
- ❌ Audit logs are never cached

**Estimated Impact:**
- 1000 concurrent users × 10 requests/min = 10,000 requests/min
- Each auth hits DB: 1,000 × 10 = 10,000 DB queries/min just for auth
- At 100 TPS (transactions/sec), DB hits ~167 TPS → likely exceeds DB capacity

**What needs caching:**
1. **User profile + roles** (TTL: 1 hour) - cache after auth lookup
2. **System settings** (TTL: 24 hours) - rarely changes
3. **MOA validation queries** (TTL: 1 hour) - expensive cross-table lookup
4. **Audit logs paginated results** (TTL: 5 min) - mostly read-only

**Cost Impact:** Adding Redis cache → 90%+ reduction in DB queries for auth path

**Severity:** 🔴 CRITICAL - will fail at 100-200 concurrent users

### 3.2 API Response Payload Size 🟡 MODERATE

**Example: Audit Log Response**
```json
{
  "items": [
    {
      "logId": "uuid",
      "userId": "uuid",
      "action": "Created proposal 12345...",
      "tableAffected": "proposals",
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-04-23T10:15:00.000Z"
    }
  ],
  "total": 50
}
```

**Issue:**
- ✅ Response is relatively lean
- ⚠️ Could be gzip-compressed automatically (check if Hono does this)
- ⚠️ Timestamp ISO strings could use epoch ms in some cases
- ⚠️ No `Content-Encoding: gzip` header visible

**Verdict:** Acceptable for now, but monitor bandwidth usage.

### 3.3 Database Indexing Strategy ✅ ADEQUATE

**Indexes Found:**
```sql
proposals:
  - proposals_leader_id_idx        ✅ Good for "my proposals" queries
  - proposals_campus_id_idx        ✅ Good for campus filtering
  - proposals_department_id_idx    ✅ Good for department filtering
  - proposals_status_idx           ✅ Good for workflow filtering

audit_logs:
  - audit_logs_user_id_created_at_idx  ⚠️ Not visible in code but likely exists
```

**Missing Indexes (Potential):**
- ❌ `proposals(currentStatus, archivedAt)` - composite for filtered list queries
- ❌ `proposal_members(proposalId, userId)` - for membership checks
- ❌ `progress_reports(projectId, createdAt)` - for report timeline queries
- ❌ `moas(isExpired, validUntil)` - for cron efficiency

**Recommendation:** Add composite indexes for frequently filtered combinations

**Severity:** 🟡 MODERATE (current queries are simple enough)

### 3.4 Request/Response Timing

**Estimated Request Latencies (with current setup):**

| Endpoint | Auth | DB Queries | Serialization | Total |
|----------|------|-----------|----------------|-------|
| `GET /proposals` (empty list) | 20ms | 50ms | 5ms | **75ms** ⚠️ |

---

## 4. Security & Validation Findings (Immediate fixes)

### 4.1 Path parameter validation missing UUID check (HIGH)
- Issue: Several route param schemas (e.g. `ParamId`, `ProposalParam`, `DocumentParam`) declare `id`/`proposalId` as `z.string()` without `.uuid()` validation. This allows invalid or malicious strings to reach DB layer and causes unexpected 500 errors.
- Risk: Invalid IDs, accidental DB errors, and unclear 400 vs 500 semantics.
- Fix: Change param schemas to `z.string().uuid()` (or `z.string().uuid().openapi(...)`) so invalid IDs return 400.

### 4.2 Numeric/monetary fields accepted as free-form strings (HIGH)
- Issue: `CreateProposalSchema` and `UpdateProposalSchema` accept `budgetPartner` and `budgetNeust` as `z.string()` which permits non-numeric values (e.g., `sudhidahidada`). The DB stores these as `numeric` and will throw on invalid input.
- Risk: Requests with invalid numeric payloads cause 500 errors; inconsistent validation surfaces between API and DB.
- Fix: Validate numeric money fields with `z.coerce.number().nonnegative()` or use `z.string().regex()` for decimal format; return 400 for invalid input.

### 4.3 File upload handling lacks size/type sanitization (HIGH)
- Issue: `storage.routes.ts` accepts multipart `file` and only checks `instanceof File` and uses `file.name` directly in storage path. No content-type or size limit enforcement and no filename sanitization.
- Risks:
  - Upload of extremely large files → DoS and storage cost
  - Malicious filenames with path-like segments → unexpected storage keys
  - Non-PDF uploads despite message claiming PDF required
- Fixes:
  - Enforce max file size (e.g., 10MB) and check `file.size`.
  - Enforce `file.type === 'application/pdf'` or extension whitelist.
  - Sanitize `file.name` to allow only safe chars (e.g., base64 slug or timestamped UUID).
  - Consider streaming upload or direct client-to-Supabase signed upload to avoid proxying large files.

### 4.4 Insufficient rate limiting / abuse protection (HIGH)
- Issue: No rate limiting or abuse protection middleware. Auth endpoints, upload endpoints and list endpoints are exposed to unauthenticated or authenticated but unchecked high-frequency requests.
- Risk: Brute force, credential stuffing, or abuse of endpoints causing resource exhaustion.
- Fix: Add rate limiting middleware (IP + user scoped), e.g., Redis-backed token bucket or use Cloud Provider WAF/rate limiting.

### 4.5 CORS is hard-coded to localhost only (MEDIUM)
- Issue: `app.ts` allows only `http://localhost:3001` and `http://localhost:5173`. For staging/production, rely on env-driven allowed origins.
- Fix: Drive CORS origins from `env.ALLOWED_ORIGINS` or similar, defaulting to localhost for dev.

### 4.6 Audit & Logging (IMPROVEMENTS)
- Good: Structured `ApiError`, centralized `installApiErrorHandler`, and `insertAuditLog` usage.
- Improvements:
  - Attach request id to audit logs for traceability (`c.req.get('X-Request-ID')` or middleware-set id).
  - Use Sentry (SENTRY_DSN present) to capture unhandled exceptions with contexts (userId, route).
  - Mask sensitive fields in logs (authorization headers, tokens).

---

## 5. Actionable Remediation Checklist (prioritized)

1. Fix parameter validation (HIGH)
  - Update all `Param` schemas to use `z.string().uuid()`.
2. Enforce numeric validation (HIGH)
  - Replace `budget*` strings with `z.coerce.number().nonnegative()`.
3. Harden file uploads (HIGH)
  - Enforce `file.size` and `file.type`, sanitize filenames.
4. Add rate limiting middleware (HIGH)
  - Implement Redis-backed rate limiter or cloud WAF rules.
5. Cache auth/user profiles (MEDIUM)
  - Use Redis or extend `authUserCache` with invalidation on role change.
6. Make CORS origins configurable (MEDIUM)
7. Add monitoring/metrics (MEDIUM)
  - Expose Prometheus metrics for DB pool usage, request latency, error rate.
8. Improve tests for edge-cases (MEDIUM)
  - Add tests for invalid UUIDs, invalid monetary strings, large file uploads.

---

## 6. Quick Patch Suggestions (small PRs)

1) Param UUID validation (example): update `ParamId` → `z.object({ id: z.string().uuid().openapi({ param: { name: "id", in: "path" } }) })`.

2) Budget numeric validation (example):
```ts
budgetPartner: z.coerce.number().nonnegative().optional(),
budgetNeust: z.coerce.number().nonnegative().optional(),
```

3) File upload checks (example): validate `file.type` and `file.size`, and sanitize `file.name` to slug.

---

## 7. Next Steps I can take (pick one)

- Run an automated grep for missing `.uuid()` param schemas and prepare a PR to fix them.
- Implement file upload hardening in `storage.routes.ts` with size/type checks and filename sanitization.
- Add a Redis-backed cache for auth profiles and patch `middleware/auth.ts` to use it safely.

If you say which to prioritize I will create focused PRs and tests.
| `GET /proposals` (100K rows) | 20ms | 500ms+ | 100ms+ | **600ms+** 🔴 |
| `GET /auth/me` | 15ms | 10ms | 2ms | **27ms** ✅ |
| `POST /proposals` | 20ms | 100ms | 10ms | **130ms** ⚠️ |
| `POST /proposals/:id/review` | 20ms | 150ms | 15ms | **185ms** ⚠️ |

**Severity:** 🟡 MODERATE-HIGH - acceptable for MVP, but unscalable

---

## 4. Security & Authentication

### 4.1 JWT Token Validation ✅ GOOD

**Flow:**
1. Client sends `Authorization: Bearer <JWT>`
2. Middleware extracts token
3. Supabase validates token cryptographically
4. User profile fetched from local DB
5. Context attached to request

**Strengths:**
- ✅ JWT validation delegated to Supabase (trusted service)
- ✅ Local user profile lookup prevents unauthorized users
- ✅ `isActive` flag prevents deactivated users
- ✅ All endpoints protected by default

**Weaknesses:**
- ⚠️ No token refresh mechanism visible (relies on client-side rotation)
- ⚠️ No token revocation list (revoked users still valid until expiry)
- ⚠️ No rate limiting on auth endpoint

**Verdict:** Solid for current scale. Add token refresh for enterprise use.

### 4.2 Role-Based Access Control (RBAC) ✅ GOOD

```typescript
// middleware/rbac.ts
export function requireRole(...allowedRoles: string[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get("user");
    if (!allowedRoles.includes(user.roleName)) {
      throw new ApiError(403, "FORBIDDEN", ...);
    }
    await next();
  });
}
```

**Implementation:**
- ✅ 4 roles defined: Super Admin, Director, RET Chair, Faculty
- ✅ Role-based authorization enforced on audit endpoints
- ✅ User provisioning restricted to admins
- ✅ Conflict of interest checks (EC-01: user cannot review own proposal)

**Issues:**
- ⚠️ Role-checking not consistently applied (some routes lack RBAC)
- ⚠️ No attribute-based access control (ABAC) - can't restrict by campus/department
- ⚠️ No permission model beyond roles

**Verdict:** Good for current scope, but scaling to 50+ roles would require redesign.

### 4.3 CORS Configuration ⚠️ NEEDS IMPROVEMENT

```typescript
// app.ts line 29-32
cors({
  origin: ["http://localhost:3001", "http://localhost:5173"],
  credentials: true,
})
```

**Issues:**
- ❌ Hardcoded localhost origins - won't work in production
- ❌ Should be `process.env.ALLOWED_ORIGINS || []`
- ⚠️ `credentials: true` requires specific origin (not wildcard)

**Production Configuration Needed:**
```typescript
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "").split(",");
cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : ["http://localhost:3001"],
  credentials: true,
})
```

**Severity:** 🟡 MODERATE - will fail in production without config change

### 4.4 Input Validation ✅ EXCELLENT

All routes use **Zod schemas** for runtime validation:
```typescript
const CreateProposalSchema = z
  .object({
    campusId: z.number().int().positive(),
    departmentId: z.number().int().positive(),
    title: z.string().min(1),
    ...
  })
```

**Strengths:**
- ✅ Type-safe at compile time
- ✅ Runtime validation before handler execution
- ✅ Clear error messages
- ✅ No SQL injection risk (Drizzle parameterizes queries)

**Verdict:** Excellent input validation. No security issues here.

---

## 5. Error Handling & Resilience

### 5.1 Error Response Standardization ✅ EXCELLENT

```typescript
// lib/errors.ts
export class ApiError extends HTTPException {
  constructor(status: 400|401|403|404|409|422|500, code: string, message: string)
}

// Global error handler
app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(createErrorResponse(err), err.status);
  }
  ...
})
```

**Response Format:**
```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Only Draft or Returned proposals can be submitted"
  }
}
```

**Strengths:**
- ✅ Consistent error structure across all endpoints
- ✅ Proper HTTP status codes
- ✅ Error codes machine-readable (for client handling)
- ✅ Global error handler prevents unhandled exceptions

**Verdict:** Excellent error handling. Production-ready.

### 5.2 Audit Logging ✅ GOOD

```typescript
// lib/audit.ts
export async function insertAuditLog(params: {
  userId: string;
  action: string;
  tableAffected: string;
  ipAddress?: string | null;
}): Promise<void> {
  await db.insert(auditLogs).values({...});
}
```

**Current Usage:**
- ✅ Logged in proposal create/update/review/delete
- ✅ Logged in project transitions
- ✅ Logged in user provisioning
- ✅ Indexed by `userId`, `created_at`

**Issues:**
- ⚠️ Audit log inserts **not awaited consistently** (some routes fire-and-forget)
- ⚠️ No batch audit logging (each operation = 1 query)
- ⚠️ Audit logs never deleted (infinite growth)

**Recommendation:**
```typescript
// Use fire-and-forget but with error logging
insertAuditLog({...}).catch(err => console.error("[AUDIT] Insert failed:", err));
```

**Severity:** 🟡 MODERATE - acceptable for now

### 5.3 Sentry Integration ✅ GOOD

```typescript
// index.ts
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1.0,
  });
}
```

**Strengths:**
- ✅ Configured with environment awareness
- ✅ Sample rate reduced in production (0.2 = 20%)
- ✅ Optional (no hard dependency)

**Issues:**
- ⚠️ No custom context for domain-specific errors
- ⚠️ No breadcrumb tracking for user actions
- ⚠️ Sample rate of 0.2 may miss issues (recommend 0.5-1.0 for errors)

**Severity:** 🟡 MODERATE - good foundation, needs tuning

---

## 6. Code Organization & Patterns

### 6.1 Type Safety ✅ EXCELLENT

**TypeScript Usage:**
- ✅ Strict mode enabled (inferred from setup)
- ✅ Zod schemas provide runtime type inference
- ✅ Drizzle ORM generates Select/Insert types
- ✅ No `any` types visible

**Verdict:** Excellent type safety throughout.

### 6.2 Transaction Management ✅ GOOD

```typescript
// proposals.routes.ts - Create proposal with related entities
const created = await db.transaction(async (tx) => {
  const [proposal] = await tx.insert(proposals).values({...}).returning();
  
  if (body.departmentIds?.length) {
    await tx.insert(proposalDepartments).values(
      body.departmentIds.map(deptId => ({proposalId: proposal.proposalId, departmentId: deptId}))
    );
  }
  
  return proposal;
});
```

**Strengths:**
- ✅ Transactions used for multi-step operations
- ✅ Atomic updates guaranteed
- ✅ Rollback on error

**Issues:**
- ⚠️ Transaction timeout not configured
- ⚠️ No retry logic for deadlocks

**Verdict:** Good for current load. Add retry for high-concurrency.

### 6.3 Middleware Composition ✅ GOOD

Each route applies auth middleware:
```typescript
app.use("/*", authMiddleware);
```

Then applies RBAC where needed:
```typescript
app.openapi(auditRoute, authMiddleware, requireRole("Super Admin"), handler);
```

**Verdict:** Clean middleware composition. Easy to extend.

---

## 7. Operational Concerns

### 7.1 Logging 🟡 MINIMAL

**Current:**
```typescript
app.use("*", logger());  // Hono's built-in HTTP logger
```

**Issues:**
- ❌ No structured logging (JSON)
- ❌ No log levels (DEBUG, INFO, WARN, ERROR)
- ❌ No correlation IDs for tracing (only requestId in header)
- ❌ Cron job logs are console.log (unstructured)
- ❌ No performance metrics

**What's Missing:**
- Slow query logging (> 100ms)
- Database connection pool metrics
- Error rate tracking
- API endpoint latency percentiles

**Recommendation:** Add structured logging library (e.g., Pino)
```typescript
import pino from "pino";
const logger = pino();
app.use(async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  logger.info({ method: c.req.method, path: c.req.path, duration });
});
```

**Severity:** 🟡 MODERATE - works for MVP, fails for production

### 7.2 Deployment & Scaling

**Current Setup:**
- Single Node.js process
- No horizontal scaling configured
- No load balancer visible
- No auto-scaling rules

**Issues:**
- ❌ Single point of failure
- ❌ Vertical scaling only (limited by machine size)
- ❌ Zero downtime deployments not possible
- ❌ No health check endpoint (except `/health`)

**For 100 concurrent users:** 1 server sufficient  
**For 1000 concurrent users:** Need 5-10 servers (with LB)  
**For 10K concurrent users:** Need 50-100 servers or serverless

**Recommendation:** Add health check endpoint
```typescript
app.get("/health/live", (c) => c.json({ status: "up" }));
app.get("/health/ready", (c) => {
  // Check DB connectivity
  const isReady = await db.select().from(roles).limit(1);
  return c.json({ status: isReady ? "ready" : "not-ready" });
});
```

**Severity:** 🟡 MODERATE - not critical for MVP

### 7.3 Database Monitoring ❌ MISSING

**No visibility into:**
- Query performance
- Connection pool utilization
- Slow queries
- Lock contention
- Index usage

**Recommended Tools:**
- PostgreSQL `pg_stat_statements` for slow query logs
- Drizzle Kit Studio for dev debugging
- DataDog or New Relic for APM

**Severity:** 🟡 MODERATE - acceptable for MVP

### 7.4 Secrets Management ⚠️ ADEQUATE

**Current:**
```typescript
// env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SENTRY_DSN: z.string().optional(),
  ...
});

const parsed = envSchema.safeParse(process.env);
```

**Issues:**
- ✅ Environment variables used (not hardcoded)
- ⚠️ Assumes `.env` file (check if gitignored)
- ⚠️ No encryption for secrets at rest
- ⚠️ Service keys could be logged in errors

**Production Setup:**
- Use AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
- Never store secrets in code or .env files
- Rotate secrets monthly

**Severity:** 🟡 MODERATE - critical for production

---

## 8. Recommendations (Prioritized by Impact)

### 🔴 CRITICAL (Do Now - will fail in production)

#### 1. Add Pagination to All List Endpoints
**Impact:** 90% reduction in memory usage & DB load  
**Effort:** 4-6 hours

```typescript
// Before (unbounded)
const rows = await db.select().from(proposals)...;

// After (paginated)
const { page = 1, limit = 50 } = c.req.query();
const offset = (page - 1) * limit;
const rows = await db.select().from(proposals)
  .limit(limit).offset(offset);
```

**Files to update:**
- proposals.routes.ts (GET /proposals)
- projects.routes.ts (GET /projects)
- All list endpoints

**Status:** Completed — pagination added to major list endpoints and validated in tests.

---

#### 2. Implement Redis Caching Layer
**Impact:** 80% reduction in DB queries  
**Effort:** 8-12 hours

```typescript
// Install: npm install redis
import { createClient } from "redis";
const redis = createClient({ url: process.env.REDIS_URL });

// Cache user profile on auth
const cacheKey = `user:${userId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const user = await db.select().from(users)...;
await redis.setEx(cacheKey, 3600, JSON.stringify(user)); // 1 hour TTL
```

**Cache Strategy:**
- User profiles: 1 hour TTL
- System settings: 24 hour TTL
- Role data: 24 hour TTL
- Invalidate on UPDATE/DELETE

**Status:** Deferred — Redis not installed; implemented an in-process LRU cache for auth/profile and settings as a pragmatic first step.

---

#### 3. Fix MOA Expiration Cron Job
**Impact:** Prevent N+1 queries  
**Effort:** 1-2 hours

```typescript
// Before (N+1)
for (const moa of expiredMoas) {
  await db.update(moas).set({isExpired: true})...
}

// After (batch)
await db.update(moas)
  .set({ isExpired: true, updatedAt: now })
  .where(and(
    eq(moas.isExpired, false),
    lte(moas.validUntil, now),
    isNull(moas.archivedAt)
  ));
```

---

#### 4. Configure DB Connection Pool Per Environment
**Impact:** Prevent connection exhaustion under load  
**Effort:** 2-3 hours

```typescript
// db/client.ts
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: parseInt(env.DB_POOL_MAX ?? "20"),
  idleTimeoutMillis: parseInt(env.DB_IDLE_TIMEOUT ?? "60000"),
  connectionTimeoutMillis: parseInt(env.DB_CONNECTION_TIMEOUT ?? "5000"),
});
```

**Recommended settings:**
- Development: 5 connections
- Staging: 10 connections
- Production: 20-30 connections (depends on user load)

**Status:** Completed — DB pool parameters exposed and wired into `db/client.ts`.

---

#### 5. Add Composite Indexes
**Impact:** 30-50% faster filtered queries  
**Effort:** 2-3 hours

```sql
CREATE INDEX proposals_status_archived_idx 
  ON proposals(current_status, archived_at);

CREATE INDEX proposal_members_proposal_user_idx 
  ON proposal_members(proposal_id, user_id);

CREATE INDEX moas_expired_valid_idx 
  ON moas(is_expired, valid_until);
```

---

### 🟡 HIGH (Do This Sprint - impacts production readiness)

#### 6. Add Structured Logging
**Impact:** Visibility into system behavior  
**Effort:** 4-6 hours

```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: {
    target: "pino-pretty",
    options: { colorize: true }
  }
});

// In middleware
app.use(async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  if (duration > 100) {
    logger.warn({ method: c.req.method, path: c.req.path, duration }, "Slow request");
  }
});
```

---

#### 7. Add Health Check Endpoints
**Impact:** Enable load balancer monitoring  
**Effort:** 1-2 hours

```typescript
// Liveness check (is server running?)
app.get("/health/live", (c) => c.json({ status: "up" }));

// Readiness check (is server ready to serve?)
app.get("/health/ready", async (c) => {
  try {
    await db.select().from(roles).limit(1);
    return c.json({ status: "ready" });
  } catch {
    return c.json({ status: "not-ready" }, 503);
  }
});
```

---

#### 8. Fix CORS Configuration
**Impact:** Enable production deployments  
**Effort:** 1-2 hours

```typescript
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn("⚠️ ALLOWED_ORIGINS not set, using localhost");
}

cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : ["http://localhost:3001"],
  credentials: true,
})
```

**Set in production:**
```bash
ALLOWED_ORIGINS="https://app.example.com,https://admin.example.com"
```

---

#### 9. Add Request Rate Limiting
**Impact:** Prevent abuse & DDoS  
**Effort:** 3-4 hours

```typescript
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
});

app.use("*", async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || "unknown";
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }
  await next();
});
```

---

#### 10. Add Token Refresh Mechanism
**Impact:** Better UX, security  
**Effort:** 4-6 hours

```typescript
// POST /auth/refresh
app.post("/auth/refresh", async (c) => {
  const refreshToken = c.req.header("x-refresh-token");
  if (!refreshToken) throw new ApiError(401, "MISSING_REFRESH");
  
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });
  
  if (error) throw new ApiError(401, "INVALID_REFRESH");
  return c.json({ accessToken: data.session.access_token });
});
```

---

### 🟢 MEDIUM (Do Next Quarter)

#### 11. Add API Rate Limiting Per User
- Prevent single user from overloading system
- Implement: X requests per Y minutes per user

#### 12. Implement Query Result Caching
- Cache frequently accessed proposal lists
- Cache user-specific dashboards
- Invalidate on data changes

#### 13. Add Database Connection Pooling Monitoring
- Track pool utilization metrics
- Alert when pool exhaustion imminent
- Add dashboards for ops team

#### 14. Implement Distributed Tracing
- Use OpenTelemetry for request tracing
- Correlate logs across services
- Identify bottlenecks

#### 15. Add Async Job Queue
- Move heavy operations off request path
- Email notifications (MOA expiration, proposal status)
- Audit log cleanup
- Report generation

---

## 9. Scalability Projections

| Load Scenario | Current Capacity | Bottleneck | Recommendation |
|---|---|---|---|
| **100 concurrent users** | ✅ Handles easily | None | Current setup OK |
| **500 concurrent users** | ⚠️ Marginal | DB queries/auth | Add caching (critical) |
| **1000 concurrent users** | 🔴 Fails | Connection pool exhaustion | Increase pool + caching |
| **5000 concurrent users** | 🔴 Fails completely | DB capacity | Horizontal scaling + DB optimization |
| **10K+ concurrent users** | 🔴 Fails | Architectural limit | Microservices + event-driven |

---

## 10. Compliance & Best Practices

### ✅ Done Well
- Type safety (TypeScript + Zod)
- Error standardization
- Audit logging
- RBAC implementation
- Database relationships
- Transaction management
- API documentation (OpenAPI)

### ⚠️ Needs Improvement
- Logging granularity
- Monitoring & observability
- Caching strategy
- Pagination defaults
- Connection pooling config
- Secrets management
- CORS hardcoding

### ❌ Missing
- Rate limiting
- Circuit breaker
- Retry logic for failures
- Dead letter queue
- Database replication strategy
- Backup/restore testing
- Disaster recovery plan

---

## Conclusion

The backend is **well-engineered for an MVP** with good architectural decisions and clean code. However, it will **hit scalability limits around 500-1000 concurrent users** without addressing the critical items above.

**Path to Production Readiness:**

1. **Weeks 1-2:** Implement pagination, caching, fix cron job
2. **Weeks 3-4:** Add structured logging, health checks, CORS config
3. **Weeks 5-6:** Rate limiting, token refresh, connection monitoring
4. **Weeks 7-8:** Distributed tracing, async jobs, scaling infrastructure

**Estimated Effort to Production:** 80-100 engineer-hours  
**Target Capacity:** 1000+ concurrent users with these changes

---

## Appendix: Quick Reference Commands

```bash
# Test capacity
npm run test:coverage

# Monitor database
npm run db:studio

# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Watch for changes
npm run dev

# Production build
npm run build && npm run start
```

---

**Audit Completed:** April 23, 2026  
**Recommended Review:** Q3 2026 (after implementing critical items)
