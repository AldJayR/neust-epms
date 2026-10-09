import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import {
	FacultyDashboardQuery,
	FacultyDashboardSchema,
} from "./dashboard.schema.js";
import { getFacultyDashboard } from "./dashboard.service.js";

const app = new OpenAPIHono<AuthEnv>();
app.use("/dashboard/*", authMiddleware);
app.use("/dashboard/faculty", requireRole(ROLE_NAMES.FACULTY));
app.openapi(
	createRoute({
		method: "get",
		path: "/dashboard/faculty",
		tags: ["Dashboard"],
		security: [{ Bearer: [] }],
		request: { query: FacultyDashboardQuery },
		responses: {
			200: {
				content: { "application/json": { schema: FacultyDashboardSchema } },
				description: "Personal scheduled-period summary and paginated records",
			},
		},
	}),
	async (c) =>
		c.json(await getFacultyDashboard(c.get("user"), c.req.valid("query")), 200),
);
export default app;
