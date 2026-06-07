import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { desc, eq, count, sql, and, or, ilike, lt, type SQL } from "drizzle-orm";
import { paginateResults } from "../lib/pagination.js";
import { db } from "../db/client.js";
import { auditLogs } from "../db/schema/audit-logs.js";
import { users } from "../db/schema/users.js";
import { roles } from "../db/schema/roles.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { installApiErrorHandler } from "../lib/errors.js";
import { ROLE_NAMES } from "../lib/types.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──
const AuditLogSchema = z
  .object({
    logId: z.string().uuid(),
    userId: z.string().uuid(),
    action: z.string(),
    tableAffected: z.string(),
    ipAddress: z.string().nullable(),
    createdAt: z.string(),
    actorName: z.string().nullable(),
    actorRole: z.string().nullable(),
  })
  .openapi("AuditLog");

const AuditLogListSchema = z
  .object({ items: z.array(AuditLogSchema), total: z.number(), nextCursor: z.string().nullable() })
  .openapi("AuditLogList");

const AuditStatsSchema = z
  .object({
    totalActionsToday: z.number(),
    uniqueUsersActive: z.number(),
    accountChanges: z.number(),
    failedLogins: z.number(),
  })
  .openapi("AuditStats");

const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    param: { name: "limit", in: "query" },
  }),
  cursor: z.string().optional().openapi({
    param: { name: "cursor", in: "query" },
  }),
  search: z.string().optional().openapi({
    param: { name: "search", in: "query" },
  }),
});

const ErrorSchema = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
  })
  .openapi("AuditError");

app.use("/audit-logs/*", authMiddleware);
app.use("/audit-logs/*", requireRole(ROLE_NAMES.SUPER_ADMIN));

// ── GET /audit-logs/stats ──
const statsRoute = createRoute({
  method: "get",
  path: "/audit-logs/stats",
  tags: ["Audit"],
  summary: "Get audit log statistics",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { "application/json": { schema: AuditStatsSchema } },
      description: "Audit log statistics",
    },
  },
});

app.openapi(statsRoute, async (c) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalActionsResult, accountChangesResult, failedLoginsResult] = await Promise.all([
    db.select({ value: count() }).from(auditLogs).where(sql`${auditLogs.createdAt} >= ${today}`),
    db.select({ value: count() }).from(auditLogs).where(and(eq(auditLogs.tableAffected, "users"), sql`${auditLogs.createdAt} >= ${today}`)),
    db.select({ value: count() }).from(auditLogs).where(and(ilike(auditLogs.action, "%failed login%"), sql`${auditLogs.createdAt} >= ${today}`)),
  ]);

  const [uniqueUsersResult] = await db
    .select({ value: sql<number>`count(distinct ${auditLogs.userId})` })
    .from(auditLogs)
    .where(sql`${auditLogs.createdAt} >= ${today}`);
  const uniqueUsersCount = Number(uniqueUsersResult?.value ?? 0);

  return c.json({
    totalActionsToday: Number(totalActionsResult[0]?.value ?? 0),
    uniqueUsersActive: uniqueUsersCount,
    accountChanges: Number(accountChangesResult[0]?.value ?? 0),
    failedLogins: Number(failedLoginsResult[0]?.value ?? 0),
  }, 200);
});

// ── GET /audit-logs ──
const listRoute = createRoute({
  method: "get",
  path: "/audit-logs",
  tags: ["Audit"],
  summary: "List audit logs (Super Admin only)",
  security: [{ Bearer: [] }],
  request: { query: PaginationQuery },
  responses: {
    200: {
      content: { "application/json": { schema: AuditLogListSchema } },
      description: "Paginated audit logs",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
  },
});

app.openapi(listRoute, async (c) => {
  const { limit, cursor, search } = c.req.valid("query");

  const baseConditions: SQL[] = [];
  if (search) {
    baseConditions.push(
      or(
        ilike(auditLogs.action, `${search}%`),
        ilike(users.firstName, `${search}%`),
        ilike(users.lastName, `${search}%`),
        ilike(users.email, `${search}%`)
      )!
    );
  }

  const cursorConditions = [...baseConditions];
  if (cursor) {
    cursorConditions.push(lt(auditLogs.createdAt, new Date(cursor)));
  }

  const [totalResult, rows] = await Promise.all([
    db.select({ value: count() })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.userId))
      .where(baseConditions.length > 0 ? and(...baseConditions) : undefined),
    db
      .select({
        logId: auditLogs.logId,
        userId: auditLogs.userId,
        action: auditLogs.action,
        tableAffected: auditLogs.tableAffected,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        actorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        actorRole: roles.roleName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.userId))
      .leftJoin(roles, eq(users.roleId, roles.roleId))
      .where(cursorConditions.length > 0 ? and(...cursorConditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit + 1),
  ]);

  const { items: rawItems, nextCursor } = paginateResults(rows, limit, "createdAt");

  const items = rawItems.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return c.json({ items, total: Number(totalResult[0]?.value ?? 0), nextCursor }, 200);
});

export default app;
