import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { installApiErrorHandler } from "@/lib/errors.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { FacultyDirectorySchema } from "./director.schema.js";
import { getFacultyDirectory } from "./director.service.js";

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

const facultyDirectoryRoute = createRoute({
	method: "get",
	path: "/director/faculty",
	tags: ["Director"],
	summary: "Get faculty directory with involvement metrics",
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
			college: z
				.string()
				.optional()
				.openapi({ param: { name: "college", in: "query" } }),
			status: z
				.string()
				.optional()
				.openapi({ param: { name: "status", in: "query" } }),
		}),
	},
	responses: {
		200: {
			content: { "application/json": { schema: FacultyDirectorySchema } },
			description: "Faculty directory with involvement metrics",
		},
	},
});

app.openapi(facultyDirectoryRoute, async (c) => {
	const query = c.req.valid("query");
	const user = c.get("user");
	const data = await getFacultyDirectory(query, user);
	return c.json(data, 200);
});

export default app;
