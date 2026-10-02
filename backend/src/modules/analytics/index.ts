import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { db } from "@/db/client.js";
import { OPERATIONAL_ROLES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import {
	AnalyticsParams,
	AnalyticsQuery,
	AnalyticsResponse,
} from "./analytics.schema.js";
import { exportAnalytics, getAnalytics } from "./analytics.service.js";

const app = new OpenAPIHono<AuthEnv>();
app.use("/analytics/*", authMiddleware, requireRole(...OPERATIONAL_ROLES));
app.openapi(
	createRoute({
		method: "get",
		path: "/analytics/{view}/export",
		tags: ["Analytics"],
		security: [{ Bearer: [] }],
		request: { params: AnalyticsParams, query: AnalyticsQuery },
		responses: {
			200: {
				content: { "text/csv": { schema: z.string() } },
				description: "Complete filtered CSV export",
			},
		},
	}),
	async (c) => {
		const view = c.req.valid("param").view;
		c.header("Content-Type", "text/csv; charset=utf-8");
		c.header(
			"Content-Disposition",
			`attachment; filename="extension-${view}.csv"`,
		);
		return c.body(
			await exportAnalytics(c.get("user"), c.req.valid("query"), view),
			200,
		);
	},
);
app.openapi(
	createRoute({
		method: "get",
		path: "/analytics/{view}",
		tags: ["Analytics"],
		security: [{ Bearer: [] }],
		request: { params: AnalyticsParams, query: AnalyticsQuery },
		responses: {
			200: {
				content: { "application/json": { schema: AnalyticsResponse } },
				description: "Role-scoped extension analytics",
			},
		},
	}),
	async (c) =>
		c.json(
			await db.transaction(
				(tx) =>
					getAnalytics(
						c.get("user"),
						c.req.valid("query"),
						c.req.valid("param").view,
						tx,
					),
				{ isolationLevel: "repeatable read", accessMode: "read only" },
			),
			200,
		),
);
export default app;
