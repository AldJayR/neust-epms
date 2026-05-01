import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, count, and, ilike, inArray, sql } from "drizzle-orm";
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
    employeeId: z.string(),
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
app.use("/admin/*", requireRole([ROLE_NAMES.SUPER_ADMIN]));

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
  const [allUsersCount] = await db.select({ value: count() }).from(users);
  const [deactivatedCount] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.isActive, false));

  // "Pending Approval" logic can be specific. For now, let's assume it's 0 
  // or define a placeholder logic if we have a field for it.
  // Based on requirements, there might be a 'pending' state. 
  // If we don't have a status field yet, we'll return 0 or implement a check.
  
  return c.json({
    totalAccounts: Number(allUsersCount.value),
    pendingApproval: 0, 
    deactivated: Number(deactivatedCount.value),
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
  const { search, page, pageSize } = c.req.valid("query");
  const p = parseInt(page);
  const ps = parseInt(pageSize);
  const offset = (p - 1) * ps;

  let whereClause = undefined;
  if (search) {
    whereClause = or(
      ilike(users.firstName, `%${search}%`),
      ilike(users.lastName, `%${search}%`),
      ilike(users.email, `%${search}%`),
      ilike(users.employeeId, `%${search}%`),
    );
  }

  const query = db
    .select({
      userId: users.userId,
      employeeId: users.employeeId,
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
    .where(whereClause)
    .limit(ps)
    .offset(offset);

  const [totalResult] = await db
    .select({ value: count() })
    .from(users)
    .where(whereClause);

  const rows = await query;

  return c.json({
    users: rows,
    total: Number(totalResult.value),
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

export default app;
