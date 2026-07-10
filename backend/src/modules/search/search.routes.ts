import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { SearchQuerySchema, SearchResponseSchema } from "./search.schema.js";
import { searchEntities } from "./search.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("*", authMiddleware);

const getSearchRoute = createRoute({
	method: "get",
	path: "/search",
	tags: ["Search"],
	summary: "Global full-text search across entities",
	security: [{ Bearer: [] }],
	request: { query: SearchQuerySchema },
	responses: {
		200: {
			content: { "application/json": { schema: SearchResponseSchema } },
			description: "Search results grouped by entity type",
		},
	},
});

app.openapi(getSearchRoute, async (c) => {
	const query = c.req.valid("query");
	const user = c.get("user");
	const result = await searchEntities(user, query);
	return c.json(result, 200);
});

export default app;
