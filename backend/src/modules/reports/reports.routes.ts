import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema } from "@/lib/schemas.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import {
	CreateReportSchema,
	PaginationQuery,
	ReportListSchema,
	ReportSchema,
	ReportStatsSchema,
} from "./reports.schema.js";
import {
	createReport,
	getReportStats,
	listReports,
} from "./reports.service.js";

const app = new OpenAPIHono<AuthEnv>();
app.use("/reports/*", authMiddleware);
app.use("/reports", authMiddleware);

const listRoute = createRoute({
	method: "get",
	path: "/reports",
	tags: ["Reports"],
	summary: "List all non-archived project reports",
	security: [{ Bearer: [] }],
	request: { query: PaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: ReportListSchema } },
			description: "Report list",
		},
	},
});
app.openapi(listRoute, async (c) => {
	const user = c.get("user");
	const query = c.req.valid("query");
	return c.json(await listReports(user, query), 200);
});

const statsRoute = createRoute({
	method: "get",
	path: "/reports/stats",
	tags: ["Reports"],
	summary: "Get report counts without fetching full list",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: ReportStatsSchema } },
			description: "Report statistics",
		},
	},
});
app.openapi(statsRoute, async (c) => {
	const user = c.get("user");
	return c.json(await getReportStats(user), 200);
});

const createReportRoute = createRoute({
	method: "post",
	path: "/reports",
	tags: ["Reports"],
	summary: "Submit a project report for a project",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CreateReportSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: ReportSchema } },
			description: "Report created",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not a project member",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Project not found",
		},
	},
});
app.openapi(createReportRoute, async (c) => {
	const user = c.get("user");
	const body = c.req.valid("json");
	const ipAddress = getClientIp(c);
	return c.json(await createReport(user, body, ipAddress), 201);
});

export default app;
