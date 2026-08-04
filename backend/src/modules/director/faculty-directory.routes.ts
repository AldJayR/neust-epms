import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { FacultyDirectorySchema } from "./director.schema.js";
import { getFacultyDirectory } from "./director.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("/director/*", authMiddleware);
app.use("/director/*", requireRole(ROLE_NAMES.DIRECTOR, ROLE_NAMES.RET_CHAIR));

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
			departmentId: z.coerce
				.number()
				.int()
				.positive()
				.optional()
				.openapi({ param: { name: "departmentId", in: "query" } }),
			load: z
				.enum(["all", "none", "active"])
				.default("all")
				.openapi({ param: { name: "load", in: "query" } }),
			sort: z
				.enum(["load-desc", "load-asc", "name"])
				.default("load-desc")
				.openapi({ param: { name: "sort", in: "query" } }),
			trendMonths: z.coerce
				.number()
				.int()
				.refine((value) => value === 6 || value === 12 || value === 24, {
					message: "Trend range must be 6, 12, or 24 months",
				})
				.default(12)
				.openapi({ param: { name: "trendMonths", in: "query" } }),
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
