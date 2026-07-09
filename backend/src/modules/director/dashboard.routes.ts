import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { installApiErrorHandler } from "@/lib/errors.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { DirectorDashboardSchema } from "./director.schema.js";
import { getDashboardStats } from "./director.service.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

app.use("/director/*", authMiddleware);
app.use(
	"/director/*",
	requireRole(
		ROLE_NAMES.SUPER_ADMIN,
		ROLE_NAMES.DIRECTOR,
		ROLE_NAMES.RET_CHAIR,
	),
);

const dashboardRoute = createRoute({
	method: "get",
	path: "/director/dashboard",
	tags: ["Director"],
	summary: "Get director dashboard summary",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: DirectorDashboardSchema } },
			description: "Director dashboard summary",
		},
	},
});

app.openapi(dashboardRoute, async (c) => {
	const user = c.get("user");
	const data = await getDashboardStats(user);
	return c.json(data, 200);
});

export default app;
