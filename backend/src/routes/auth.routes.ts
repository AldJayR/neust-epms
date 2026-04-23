import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
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

const CreateUserBodySchema = z
  .object({
    employeeId: z.string().min(1),
    firstName: z.string().min(1),
    middleName: z.string().optional(),
    lastName: z.string().min(1),
    nameSuffix: z.string().optional(),
    academicRank: z.string().optional(),
    email: z.string().email(),
    roleId: z.number().int().positive(),
    campusId: z.number().int().positive(),
    departmentId: z.number().int().positive().optional(),
    supabaseUserId: z.string(),
  })
  .openapi("CreateUserBody");

const ErrorSchema = z
  .object({
    error: z.object({ code: z.string(), message: z.string() }),
  })
  .openapi("Error");

// ── GET /auth/me ──
const getMeRoute = createRoute({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get the currently authenticated user profile",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { "application/json": { schema: UserResponseSchema } },
      description: "Current user profile",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Unauthorized",
    },
  },
});

app.use("/auth/*", authMiddleware);

app.openapi(getMeRoute, async (c) => {
  const authUser = c.get("user");

  const [row] = await db
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
    .where(eq(users.userId, authUser.userId))
    .limit(1);

  if (!row) {
    throw new ApiError(401, "USER_NOT_FOUND", "User profile not found");
  }

  return c.json(row, 200);
});

// ── POST /auth/users (Admin provisioning) ──
const createUserRoute = createRoute({
  method: "post",
  path: "/auth/users",
  tags: ["Auth"],
  summary: "Provision a new user (Super Admin / Director only)",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateUserBodySchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: UserResponseSchema } },
      description: "User created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Forbidden",
    },
  },
});

app.openapi(
  createUserRoute,
  async (c) => {
    const authUser = c.get("user");

    // SYS-REQ-01.2: Director and Super Admin accounts require manual provisioning
    if (
      authUser.roleName !== ROLE_NAMES.SUPER_ADMIN &&
      authUser.roleName !== ROLE_NAMES.DIRECTOR
    ) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Only Super Admin or Director can provision users",
      );
    }

    const body = c.req.valid("json");

    const [created] = await db
      .insert(users)
      .values({
        userId: body.supabaseUserId,
        employeeId: body.employeeId,
        firstName: body.firstName,
        middleName: body.middleName ?? null,
        lastName: body.lastName,
        nameSuffix: body.nameSuffix ?? null,
        academicRank: body.academicRank ?? null,
        email: body.email,
        roleId: body.roleId,
        campusId: body.campusId,
        departmentId: body.departmentId ?? null,
      })
      .returning();

    if (!created) {
      throw new ApiError(500, "INSERT_FAILED", "Failed to create user");
    }

    await insertAuditLog({
      userId: authUser.userId,
      action: `Created user ${created.userId}`,
      tableAffected: "users",
      ipAddress: c.req.header("x-forwarded-for") ?? null,
    });

    // Fetch the full response with joined role/campus/department names
    const [row] = await db
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
      .where(eq(users.userId, created.userId))
      .limit(1);

    if (!row) {
      throw new ApiError(500, "FETCH_FAILED", "Failed to fetch created user");
    }

    return c.json(row, 201);
  },
);

export default app;
