import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, eq, ilike, inArray, or, isNull, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { campuses } from "../db/schema/campuses.js";
import { departments } from "../db/schema/departments.js";
import { roles } from "../db/schema/roles.js";
import { users } from "../db/schema/users.js";
import { insertAuditLog } from "../lib/audit.js";
import { invalidateAuthUserCache } from "../lib/cache.js";
import { getClientIp } from "../lib/client-ip.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import { createNotification } from "../lib/notification.helpers.js";
import { ROLE_NAMES } from "../lib/types.js";
import { type AuthEnv, authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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
		avatarUrl: z.string().nullable(),
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

	// DFD 3.1: Count users pending approval (isActive=false = not yet activated)
	const [pendingResult] = await db
		.select({ value: count() })
		.from(users)
		.where(eq(users.isActive, false));

	return c.json(
		{
			totalAccounts: Number(allUsersCount[0]?.value ?? 0),
			pendingApproval: Number(pendingResult?.value ?? 0),
			deactivated: Number(deactivatedCount[0]?.value ?? 0),
		},
		200,
	);
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
			page: z.coerce.number().int().min(1).default(1),
			pageSize: z.coerce.number().int().min(1).max(100).default(10),
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
	const p = page;
	const ps = pageSize;
	const offset = (p - 1) * ps;

	let searchClause: SQL | undefined;
	if (search) {
		searchClause = or(
			ilike(users.firstName, `${search}%`),
			ilike(users.lastName, `${search}%`),
			ilike(users.email, `${search}%`),
		);
	}

	let activeClause: SQL | undefined;
	if (isActive === "true") {
		activeClause = eq(users.isActive, true);
	} else if (isActive === "false") {
		activeClause = eq(users.isActive, false);
	}

	const finalWhere = and(searchClause, activeClause);

	const totalResult = await db
		.select({ value: count() })
		.from(users)
		.where(finalWhere);
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
			avatarUrl: users.avatarUrl,
		})
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.innerJoin(campuses, eq(users.campusId, campuses.campusId))
		.leftJoin(departments, eq(users.departmentId, departments.departmentId))
		.where(finalWhere)
		.limit(ps)
		.offset(offset);

	return c.json(
		{
			users: rows,
			total: Number(totalResult[0]?.value ?? 0),
			page: p,
			pageSize: ps,
		},
		200,
	);
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
			content: {
				"application/json": {
					schema: z.object({ success: z.boolean(), updatedCount: z.number() }),
				},
			},
			description: "Status updated",
		},
	},
});

app.openapi(bulkUpdateStatusRoute, async (c) => {
	const authUser = c.get("user");
	const { userIds, isActive } = c.req.valid("json");

	// Prevent self-deactivation
	if (isActive === false && userIds.includes(authUser.userId)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You cannot deactivate your own account",
		);
	}

	if (userIds.length === 0) {
		return c.json({ success: true, updatedCount: 0 }, 200);
	}

	const result = await db
		.update(users)
		.set({ isActive, updatedAt: new Date() })
		.where(inArray(users.userId, userIds))
		.returning({ userId: users.userId });

	if (result.length > 0) {
		invalidateAuthUserCache(result.map((r) => r.userId));
	}

	await insertAuditLog({
		userId: authUser.userId,
		action: `Bulk updated status of ${result.length} users to ${isActive ? "Active" : "Inactive"}`,
		tableAffected: "users",
		ipAddress: getClientIp(c),
	});

	return c.json(
		{
			success: true,
			updatedCount: result.length,
		},
		200,
	);
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
						}),
					),
				},
			},
			description: "List of roles",
		},
	},
});

app.openapi(getRolesRoute, async (c) => {
	const allRoles = await db
		.select({ roleId: roles.roleId, roleName: roles.roleName })
		.from(roles);
	return c.json(allRoles, 200);
});

// ── PATCH /admin/users/approve ──
const bulkApproveSchema = z.object({
	users: z.array(
		z.object({
			userId: z.string(),
			roleName: z.string(),
		}),
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
			content: {
				"application/json": {
					schema: z.object({ success: z.boolean(), updatedCount: z.number() }),
				},
			},
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
	const roleMap = new Map(allRoles.map((r) => [r.roleName, r.roleId]));

	// Perform updates in a transaction for atomicity.
	// Cache invalidation and audit log happen AFTER commit to avoid
	// irreversible side-effects if the transaction rolls back.
	let updatedCount = 0;

	await db.transaction(async (tx) => {
		// Sequential updates to avoid interleaving concurrent queries on the
		// same Postgres connection.
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
					ipAddress: getClientIp(c),
				},
				tx,
			);
		}
	});

	// Invalidate cache AFTER successful commit
	if (updatedCount > 0) {
		invalidateAuthUserCache(usersToApprove.map((u) => u.userId));
	}

	// DFD 1.3: Send activation notification to each approved user
	for (const u of usersToApprove) {
		await createNotification({
			recipientId: u.userId,
			type: "system",
			title: "Account Activated",
			message: "Your account has been approved and activated.",
		}).catch((err) => {
			console.error("[notification] Failed to send activation notification:", err);
		});
	}

	return c.json(
		{
			success: true,
			updatedCount,
		},
		200,
	);
});

// ── POST /admin/users ──
const provisionUserRoute = createRoute({
	method: "post",
	path: "/admin/users",
	tags: ["Admin"],
	summary: "Provision a new Director account directly (Super Admin only)",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: {
				"application/json": {
					schema: z.object({
						firstName: z.string().min(1),
						middleName: z.string().optional().nullable(),
						lastName: z.string().min(1),
						nameSuffix: z.string().optional().nullable(),
						email: z.string().email(),
						academicRank: z.string().min(1),
						departmentId: z.number().optional().nullable(),
					}),
				},
			},
			required: true,
		},
	},
	responses: {
		201: {
			content: {
				"application/json": {
					schema: z.object({
						success: z.boolean(),
						userId: z.string(),
						temporaryPassword: z.string(),
					}),
				},
			},
			description: "Director provisioned successfully",
		},
	},
});

app.openapi(provisionUserRoute, async (c) => {
	const authUser = c.get("user");
	const body = c.req.valid("json");

	if (authUser.roleName !== "Super Admin") {
		throw new ApiError(403, "FORBIDDEN", "Only Super Admin can provision accounts");
	}

	const [existing] = await db
		.select({ userId: users.userId })
		.from(users)
		.where(eq(users.email, body.email))
		.limit(1);

	if (existing) {
		throw new ApiError(400, "USER_EXISTS", "Email already registered");
	}

	// Check for duplicate profiles (Verify Duplicate Profiles)
	const [duplicateName] = await db
		.select({ userId: users.userId })
		.from(users)
		.where(
			and(
				ilike(users.firstName, body.firstName.trim()),
				ilike(users.lastName, body.lastName.trim()),
			),
		)
		.limit(1);

	if (duplicateName) {
		throw new ApiError(
			400,
			"DUPLICATE_PROFILE",
			"A user with this name is already registered in the system. Duplicate accounts are not permitted.",
		);
	}

	const [directorRole] = await db
		.select({ roleId: roles.roleId })
		.from(roles)
		.where(eq(roles.roleName, ROLE_NAMES.DIRECTOR))
		.limit(1);

	if (!directorRole) {
		throw new ApiError(500, "CONFIG_ERROR", "Director role not found in system");
	}

	const [mainCampus] = await db
		.select({ campusId: campuses.campusId })
		.from(campuses)
		.where(eq(campuses.isMainCampus, true))
		.limit(1);

	let campusId = mainCampus?.campusId;
	if (!campusId) {
		const [anyCampus] = await db
			.select({ campusId: campuses.campusId })
			.from(campuses)
			.limit(1);
		campusId = anyCampus?.campusId;
	}

	if (!campusId) {
		throw new ApiError(500, "CONFIG_ERROR", "No campus found in system");
	}

	// Generate temporary password
	const tempPassword = `Temp-${Math.random().toString(36).slice(-8)}${Math.floor(Math.random() * 10)}`;

	const { data: authData, error: authError } =
		await supabase.auth.admin.createUser({
			email: body.email,
			password: tempPassword,
			email_confirm: true,
		});

	if (authError || !authData.user) {
		throw new ApiError(
			400,
			"AUTH_ERROR",
			authError?.message ?? "Failed to create auth user",
		);
	}

	await db.transaction(async (tx) => {
		await tx.insert(users).values({
			userId: authData.user.id,
			firstName: body.firstName,
			middleName: body.middleName ?? null,
			lastName: body.lastName,
			nameSuffix: body.nameSuffix ?? null,
			academicRank: body.academicRank,
			email: body.email,
			roleId: directorRole.roleId,
			campusId: campusId,
			departmentId: body.departmentId ?? null,
			isActive: true,
		});

		await insertAuditLog(
			{
				userId: authUser.userId,
				action: `Provisioned Director account for ${body.email}`,
				tableAffected: "users",
				ipAddress: getClientIp(c),
			},
			tx,
		);
	});

	return c.json(
		{
			success: true,
			userId: authData.user.id,
			temporaryPassword: tempPassword,
		},
		201,
	);
});

// ── PATCH /admin/users/{id} ──
const ParamId = z.object({
	id: z.string().openapi({
		param: {
			name: "id",
			in: "path",
		},
		type: "string",
		example: "123e4567-e89b-12d3-a456-426614174000",
	}),
});

const updateSpecificUserRoute = createRoute({
	method: "patch",
	path: "/admin/users/{id}",
	tags: ["Admin"],
	summary: "Update user profile details and role (Super Admin only)",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: {
				"application/json": {
					schema: z.object({
						firstName: z.string().min(1).optional(),
						middleName: z.string().optional().nullable(),
						lastName: z.string().min(1).optional(),
						nameSuffix: z.string().optional().nullable(),
						academicRank: z.string().optional().nullable(),
						campusId: z.number().optional(),
						departmentId: z.number().optional().nullable(),
						roleId: z.number().optional(),
						isActive: z.boolean().optional(),
					}),
				},
			},
			required: true,
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						success: z.boolean(),
						userId: z.string(),
					}),
				},
			},
			description: "User updated successfully",
		},
	},
});

app.openapi(updateSpecificUserRoute, async (c) => {
	const authUser = c.get("user");
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");

	if (authUser.roleName !== "Super Admin") {
		throw new ApiError(403, "FORBIDDEN", "Only Super Admin can update users");
	}

	const [existing] = await db
		.select()
		.from(users)
		.where(eq(users.userId, id))
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "User not found");
	}

	const updateFields: Partial<typeof users.$inferInsert> = {
		updatedAt: new Date(),
	};

	if (body.firstName !== undefined) updateFields.firstName = body.firstName;
	if (body.middleName !== undefined) updateFields.middleName = body.middleName;
	if (body.lastName !== undefined) updateFields.lastName = body.lastName;
	if (body.nameSuffix !== undefined) updateFields.nameSuffix = body.nameSuffix;
	if (body.academicRank !== undefined) updateFields.academicRank = body.academicRank;
	if (body.campusId !== undefined) updateFields.campusId = body.campusId;
	if (body.departmentId !== undefined) updateFields.departmentId = body.departmentId;
	if (body.roleId !== undefined) updateFields.roleId = body.roleId;
	if (body.isActive !== undefined) updateFields.isActive = body.isActive;

	await db.transaction(async (tx) => {
		await tx
			.update(users)
			.set(updateFields)
			.where(eq(users.userId, id));

		await insertAuditLog(
			{
				userId: authUser.userId,
				action: `Updated profile details for user ${id}`,
				tableAffected: "users",
				ipAddress: getClientIp(c),
			},
			tx,
		);
	});

	invalidateAuthUserCache([id]);

	return c.json({ success: true, userId: id }, 200);
});

export default app;
