import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { DashboardYearQuery } from "../dashboard/dashboard.schema.js";
import {
	DirectorOverviewSchema,
	OverviewQuerySchema,
	WorkQueueQuerySchema,
	WorkQueueResponseSchema,
} from "./dashboard-overview.schema.js";
import {
	getDirectorOverview,
	getDirectorWorkQueue,
} from "./dashboard-overview.service.js";
import { DirectorDashboardSchema } from "./director.schema.js";
import { getDashboardStats } from "./director.service.js";
import {
	MilestonesQuerySchema,
	MilestonesResponseSchema,
} from "./milestones.schema.js";
import { getDirectorMilestones } from "./milestones.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("/director/*", authMiddleware);
app.use("/director/*", requireRole(ROLE_NAMES.DIRECTOR, ROLE_NAMES.RET_CHAIR));

const dashboardRoute = createRoute({
	method: "get",
	path: "/director/dashboard",
	tags: ["Director"],
	summary: "Get director dashboard summary",
	security: [{ Bearer: [] }],
	request: { query: DashboardYearQuery },
	responses: {
		200: {
			content: { "application/json": { schema: DirectorDashboardSchema } },
			description: "Director dashboard summary",
		},
	},
});

app.openapi(dashboardRoute, async (c) => {
	const user = c.get("user");
	const data = await getDashboardStats(user, c.req.valid("query").year);
	return c.json(data, 200);
});

app.use("/director/overview", requireRole(ROLE_NAMES.DIRECTOR));
app.use("/director/work-queues", requireRole(ROLE_NAMES.DIRECTOR));
app.use("/director/milestones", requireRole(ROLE_NAMES.DIRECTOR));

app.openapi(
	createRoute({
		method: "get",
		path: "/director/milestones",
		tags: ["Director"],
		security: [{ Bearer: [] }],
		request: { query: MilestonesQuerySchema },
		responses: {
			200: {
				content: { "application/json": { schema: MilestonesResponseSchema } },
				description: "Recent workflow milestones across all project years",
			},
		},
	}),
	async (c) =>
		c.json(
			await getDirectorMilestones(c.get("user"), c.req.valid("query")),
			200,
		),
);

app.openapi(
	createRoute({
		method: "get",
		path: "/director/overview",
		tags: ["Director"],
		security: [{ Bearer: [] }],
		request: { query: OverviewQuerySchema },
		responses: {
			200: {
				content: { "application/json": { schema: DirectorOverviewSchema } },
				description: "Filtered institutional overview",
			},
		},
	}),
	async (c) =>
		c.json(await getDirectorOverview(c.get("user"), c.req.valid("query")), 200),
);

app.openapi(
	createRoute({
		method: "get",
		path: "/director/work-queues",
		tags: ["Director"],
		security: [{ Bearer: [] }],
		request: { query: WorkQueueQuerySchema },
		responses: {
			200: {
				content: { "application/json": { schema: WorkQueueResponseSchema } },
				description:
					"Institution-wide current decisions and terminal report obligations",
			},
		},
	}),
	async (c) => c.json(await getDirectorWorkQueue(c.req.valid("query")), 200),
);

export default app;
