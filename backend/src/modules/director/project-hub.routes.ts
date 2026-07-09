import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { installApiErrorHandler } from "@/lib/errors.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { HubProjectListSchema, HubQuerySchema } from "./director.schema.js";
import { getHubProjects } from "./director.service.js";

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

const projectHubRoute = createRoute({
	method: "get",
	path: "/director/hub/projects",
	tags: ["Director"],
	summary: "Get unified project hub list (Proposals + Projects)",
	security: [{ Bearer: [] }],
	request: { query: HubQuerySchema },
	responses: {
		200: {
			content: { "application/json": { schema: HubProjectListSchema } },
			description: "Unified project hub list",
		},
	},
});

app.openapi(projectHubRoute, async (c) => {
	const query = c.req.valid("query");
	const user = c.get("user");
	const data = await getHubProjects(query, user);
	return c.json(data, 200);
});

export default app;
