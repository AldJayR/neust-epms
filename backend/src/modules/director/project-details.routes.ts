import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { ProjectDetailsSchema } from "./director.schema.js";
import { getProjectDetails } from "./director.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("/director/*", authMiddleware);
app.use(
	"/director/*",
	requireRole(
		ROLE_NAMES.SUPER_ADMIN,
		ROLE_NAMES.DIRECTOR,
		ROLE_NAMES.RET_CHAIR,
	),
);

const projectDetailsRoute = createRoute({
	method: "get",
	path: "/director/projects/{proposalId}",
	tags: ["Director"],
	summary: "Get project details by proposal ID",
	security: [{ Bearer: [] }],
	request: {
		params: z.object({
			proposalId: z
				.string()
				.uuid()
				.openapi({ param: { name: "proposalId", in: "path" } }),
		}),
	},
	responses: {
		200: {
			content: { "application/json": { schema: ProjectDetailsSchema } },
			description: "Project details",
		},
		404: {
			description: "Project not found",
		},
	},
});

app.openapi(projectDetailsRoute, async (c) => {
	const { proposalId } = c.req.valid("param");
	const user = c.get("user");
	const data = await getProjectDetails(proposalId, user);
	return c.json(data, 200);
});

export default app;
