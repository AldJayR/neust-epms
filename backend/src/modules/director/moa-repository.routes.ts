import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { installApiErrorHandler } from "@/lib/errors.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { MoaRepositorySchema } from "./director.schema.js";
import { getMoaRepository, getActiveMoas } from "./director.service.js";

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

const moaRepositoryRoute = createRoute({
	method: "get",
	path: "/director/moas",
	tags: ["Director"],
	summary: "Get MOA repository with metrics",
	security: [{ Bearer: [] }],
	request: {
		query: z.object({
			page: z.coerce
				.number()
				.int()
				.min(1)
				.default(1)
				.openapi({ param: { name: "page", in: "query" } }),
			limit: z.coerce
				.number()
				.int()
				.min(1)
				.max(100)
				.default(10)
				.openapi({ param: { name: "limit", in: "query" } }),
			search: z
				.string()
				.optional()
				.openapi({ param: { name: "search", in: "query" } }),
			status: z
				.string()
				.optional()
				.openapi({ param: { name: "status", in: "query" } }),
		}),
	},
	responses: {
		200: {
			content: { "application/json": { schema: MoaRepositorySchema } },
			description: "MOA repository with metrics",
		},
	},
});

app.openapi(moaRepositoryRoute, async (c) => {
	const query = c.req.valid("query");
	const data = await getMoaRepository(query);
	return c.json(data, 200);
});

const activeMoasRoute = createRoute({
	method: "get",
	path: "/director/moas/active",
	tags: ["Director"],
	summary: "List active MOAs with partner names (for project activation)",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			description: "List of active MOAs",
		},
	},
});

app.openapi(activeMoasRoute, async (c) => {
	const data = await getActiveMoas();
	return c.json(data, 200);
});

export default app;
