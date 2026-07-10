import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";

import { ErrorSchema } from "@/lib/schemas.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import {
	AdminParamId,
	AdminStatsResponseSchema,
	AdminUsersQuerySchema,
	BulkActionResponseSchema,
	BulkApproveSchema,
	BulkUpdateStatusSchema,
	ProvisionDirectorResponseSchema,
	ProvisionDirectorSchema,
	RejectUserResponseSchema,
	RejectUserSchema,
	RolesResponseSchema,
	UpdateUserResponseSchema,
	UpdateUserSchema,
	UsersListResponseSchema,
} from "./admin.schema.js";
import {
	bulkApproveUsers,
	bulkUpdateUserStatus,
	getAdminStats,
	listRoles,
	listUsers,
	provisionDirector,
	rejectUser,
	updateUser,
} from "./admin.service.js";

const app = new OpenAPIHono<AuthEnv>();

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
	const result = await getAdminStats();
	return c.json(result, 200);
});

// ── GET /admin/users ──
const getUsersRoute = createRoute({
	method: "get",
	path: "/admin/users",
	tags: ["Admin"],
	summary: "List users with filtering and pagination",
	security: [{ Bearer: [] }],
	request: { query: AdminUsersQuerySchema },
	responses: {
		200: {
			content: { "application/json": { schema: UsersListResponseSchema } },
			description: "List of users",
		},
	},
});

app.openapi(getUsersRoute, async (c) => {
	const query = c.req.valid("query");
	const result = await listUsers(query);
	return c.json(result, 200);
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
			content: { "application/json": { schema: BulkActionResponseSchema } },
			description: "Status updated",
		},
	},
});

app.openapi(bulkUpdateStatusRoute, async (c) => {
	const authUser = c.get("user");
	const body = c.req.valid("json");
	const result = await bulkUpdateUserStatus(authUser, body, getClientIp(c));
	return c.json(result, 200);
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
			content: { "application/json": { schema: RolesResponseSchema } },
			description: "List of roles",
		},
	},
});

app.openapi(getRolesRoute, async (c) => {
	const result = await listRoles();
	return c.json(result, 200);
});

// ── PATCH /admin/users/approve ──
const bulkApproveRoute = createRoute({
	method: "patch",
	path: "/admin/users/approve",
	tags: ["Admin"],
	summary: "Bulk approve users and assign roles",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: { "application/json": { schema: BulkApproveSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: BulkActionResponseSchema } },
			description: "Users approved",
		},
	},
});

app.openapi(bulkApproveRoute, async (c) => {
	const authUser = c.get("user");
	const body = c.req.valid("json");
	const result = await bulkApproveUsers(authUser, body, getClientIp(c));
	return c.json(result, 200);
});

// ── PATCH /admin/users/{id}/reject ──
const rejectUserRoute = createRoute({
	method: "patch",
	path: "/admin/users/{id}/reject",
	tags: ["Admin"],
	summary: "Reject a pending user registration (Super Admin only)",
	security: [{ Bearer: [] }],
	request: {
		params: AdminParamId,
		body: {
			content: { "application/json": { schema: RejectUserSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: RejectUserResponseSchema } },
			description: "User rejected",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "User not pending",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "User not found",
		},
	},
});

app.openapi(rejectUserRoute, async (c) => {
	const authUser = c.get("user");
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");
	const result = await rejectUser(authUser, id, body, getClientIp(c));
	return c.json(result, 200);
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
			content: { "application/json": { schema: ProvisionDirectorSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: {
				"application/json": { schema: ProvisionDirectorResponseSchema },
			},
			description: "Director provisioned successfully",
		},
	},
});

app.openapi(provisionUserRoute, async (c) => {
	const authUser = c.get("user");
	const body = c.req.valid("json");
	const result = await provisionDirector(authUser, body, getClientIp(c));
	return c.json(result, 201);
});

// ── PATCH /admin/users/{id} ──
const updateSpecificUserRoute = createRoute({
	method: "patch",
	path: "/admin/users/{id}",
	tags: ["Admin"],
	summary: "Update user profile details and role (Super Admin only)",
	security: [{ Bearer: [] }],
	request: {
		params: AdminParamId,
		body: {
			content: { "application/json": { schema: UpdateUserSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: UpdateUserResponseSchema } },
			description: "User updated successfully",
		},
	},
});

app.openapi(updateSpecificUserRoute, async (c) => {
	const authUser = c.get("user");
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");
	const result = await updateUser(authUser, id, body, getClientIp(c));
	return c.json(result, 200);
});

export default app;
