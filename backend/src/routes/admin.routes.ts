import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, count, and, ilike, inArray, sql, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { roles } from "../db/schema/roles.js";
import { campuses } from "../db/schema/campuses.js";
import { departments } from "../db/schema/departments.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { insertAuditLog } from "../lib/audit.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import { ROLE_NAMES } from "../lib/types.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──

const UserResponseSchema = z
  .object({
    userId: z.string(),
    firstName: z.string(),
    middleName: z.string().nullable(),
    lastName: z.string(),
    nameSuffix: z.string().nullable(),
    academicRank: z.string().nullable(),
    email: z.string().email(),
    roleName: z.string(),
    campusName: z.string(),
    departmentName: z.string().nullable(),
    isActive: z.boolean(),
  })
  .openapi("UserResponse");

const UsersListResponseSchema = z.object({
  users: z.array(UserResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

const AdminStatsResponseSchema = z.object({
  totalAccounts: z.number(),
  pendingApproval: z.number(), // For now, we'll treat a specific condition as pending if applicable
  deactivated: z.number(),
});

const BulkUpdateStatusSchema = z.object({
  userIds: z.array(z.string()),
  isActive: z.boolean(),
});

const ErrorSchema = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
  })
  .openapi("Error");

// ── Authentication & Authorization Middleware ──
app.use("/admin/*", authMiddleware);
app.use("/admin/*", requireRole(ROLE_NAMES.SUPER_ADMIN));

// ── GET /admin/stats ──
const getAdminStatsRoute = createRoute({
  method: "get",
  path: "/admin/stats",
  tags: ["Admin"],
  summary: "Get administrator dashboard statistics",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { "application/json": { schema: AdminStatsResponseSchema } },
      description: "Admin statistics",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
  },
});

app.openapi(getAdminStatsRoute, async (c) => {
  const allUsersCount = await db.select({ value: count() }).from(users);
  const deactivatedCount = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.isActive, false));

  // "Pending Approval" logic can be specific. For now, let's assume it's 0 
  // or define a placeholder logic if we have a field for it.
  // Based on requirements, there might be a 'pending' state. 
  // If we don't have a status field yet, we'll return 0 or implement a check.
  
  return c.json({
    totalAccounts: Number(allUsersCount[0]?.value ?? 0),
    pendingApproval: 0, 
    deactivated: Number(deactivatedCount[0]?.value ?? 0),
  }, 200);
});

// ── GET /admin/users ──
const getUsersRoute = createRoute({
  method: "get",
  path: "/admin/users",
  tags: ["Admin"],
  summary: "List users with filtering and pagination",
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      search: z.string().optional(),
      isActive: z.string().optional(), // "true" or "false"
      page: z.string().optional().default("1"),
      pageSize: z.string().optional().default("10"),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: UsersListResponseSchema } },
      description: "List of users",
    },
  },
});

app.openapi(getUsersRoute, async (c) => {
  const { search, isActive, page, pageSize } = c.req.valid("query");
  const p = parseInt(page);
  const ps = parseInt(pageSize);
  const offset = (p - 1) * ps;

  let searchClause = undefined;
  if (search) {
    searchClause = or(
      ilike(users.firstName, `%${search}%`),
      ilike(users.lastName, `%${search}%`),
      ilike(users.email, `%${search}%`)
    );
  }
  
  let activeClause = undefined;
  if (isActive === "true") {
    activeClause = eq(users.isActive, true);
  } else if (isActive === "false") {
    activeClause = eq(users.isActive, false);
  }
  
  const finalWhere = and(searchClause, activeClause);

  const totalResult = await db.select({ value: count() }).from(users).where(finalWhere);
  const rows = await db
    .select({
      userId: users.userId,
      firstName: users.firstName,
      middleName: users.middleName,
      lastName: users.lastName,
      nameSuffix: users.nameSuffix,
      academicRank: users.academicRank,
      email: users.email,
      roleName: roles.roleName,
      campusName: campuses.campusName,
      departmentName: departments.departmentName,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .innerJoin(campuses, eq(users.campusId, campuses.campusId))
    .leftJoin(departments, eq(users.departmentId, departments.departmentId))
    .where(finalWhere)
    .limit(ps)
    .offset(offset);

  return c.json({
    users: rows,
    total: Number(totalResult[0]?.value ?? 0),
    page: p,
    pageSize: ps,
  }, 200);
});

// ── PATCH /admin/users/status ──
const bulkUpdateStatusRoute = createRoute({
  method: "patch",
  path: "/admin/users/status",
  tags: ["Admin"],
  summary: "Bulk update user active status",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: BulkUpdateStatusSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.boolean(), updatedCount: z.number() }) } },
      description: "Status updated",
    },
  },
});

app.openapi(bulkUpdateStatusRoute, async (c) => {
  const authUser = c.get("user");
  const { userIds, isActive } = c.req.valid("json");

  if (userIds.length === 0) {
    return c.json({ success: true, updatedCount: 0 }, 200);
  }

  const result = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(inArray(users.userId, userIds))
    .returning({ userId: users.userId });

  await insertAuditLog({
    userId: authUser.userId,
    action: `Bulk updated status of ${result.length} users to ${isActive ? 'Active' : 'Inactive'}`,
    tableAffected: "users",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
  });

  return c.json({
    success: true,
    updatedCount: result.length,
  }, 200);
});

// ── GET /admin/roles ──
const getRolesRoute = createRoute({
  method: "get",
  path: "/admin/roles",
  tags: ["Admin"],
  summary: "Get all available roles",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              roleId: z.number(),
              roleName: z.string(),
            })
          ),
        },
      },
      description: "List of roles",
    },
  },
});

app.openapi(getRolesRoute, async (c) => {
  const allRoles = await db.select().from(roles);
  return c.json(allRoles, 200);
});

// ── PATCH /admin/users/approve ──
const bulkApproveSchema = z.object({
  users: z.array(
    z.object({
      userId: z.string(),
      roleName: z.string(),
    })
  ),
});

const bulkApproveRoute = createRoute({
  method: "patch",
  path: "/admin/users/approve",
  tags: ["Admin"],
  summary: "Bulk approve users and assign roles",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: bulkApproveSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.boolean(), updatedCount: z.number() }) } },
      description: "Users approved",
    },
  },
});

app.openapi(bulkApproveRoute, async (c) => {
  const authUser = c.get("user");
  const { users: usersToApprove } = c.req.valid("json");

  if (usersToApprove.length === 0) {
    return c.json({ success: true, updatedCount: 0 }, 200);
  }

  // Fetch roles mapping to avoid N queries
  const allRoles = await db.select().from(roles);
  const roleMap = new Map(allRoles.map(r => [r.roleName, r.roleId]));

  let updatedCount = 0;

  // We perform updates in a transaction for atomicity
  await db.transaction(async (tx) => {
    for (const u of usersToApprove) {
      const roleId = roleMap.get(u.roleName);
      if (!roleId) continue;

      const result = await tx
        .update(users)
        .set({ isActive: true, roleId, updatedAt: new Date() })
        .where(eq(users.userId, u.userId))
        .returning({ userId: users.userId });
        
      if (result.length > 0) updatedCount++;
    }
    
    if (updatedCount > 0) {
      await insertAuditLog(
        {
          userId: authUser.userId,
          action: `Bulk approved ${updatedCount} users with assigned roles`,
          tableAffected: "users",
          ipAddress: c.req.header("x-forwarded-for") ?? null,
        },
        tx
      );
    }
  });

  return c.json({
    success: true,
    updatedCount,
  }, 200);
});

export default app;
