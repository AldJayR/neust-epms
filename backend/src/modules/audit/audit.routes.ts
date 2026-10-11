import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema } from "@/lib/schemas.js";
import { ROLE_NAMES } from "@/lib/types.js";
import type { AuthEnv } from "@/middleware/auth.js";
import { authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import {
	AuditLogListSchema,
	AuditStatsSchema,
	AuditFilterOptionsSchema,
	PaginationQuery,
} from "./audit.schema.js";
import { getAuditFilterOptions, getAuditStats, listAuditLogs } from "./audit.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("/audit-logs", authMiddleware);
app.use("/audit-logs/*", authMiddleware);
app.use("/audit-logs", requireRole(ROLE_NAMES.SUPER_ADMIN));
app.use("/audit-logs/*", requireRole(ROLE_NAMES.SUPER_ADMIN));

const filterOptionsRoute = createRoute({
	method: "get", path: "/audit-logs/filters", tags: ["Audit"],
	summary: "Get available audit users and modules", security: [{ Bearer: [] }],
	responses: { 200: { content: { "application/json": { schema: AuditFilterOptionsSchema } }, description: "Available filters" } },
});
app.openapi(filterOptionsRoute, async (c) => c.json(await getAuditFilterOptions(), 200));

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
	const result = await getAuditStats();
	return c.json(result, 200);
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
	const user = c.get("user");
	const query = c.req.valid("query");
	const ipAddress = getClientIp(c);
	const result = await listAuditLogs(user, query, ipAddress);
	return c.json(result, 200);
});

export default app;
