import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth.js";
import {
	SectorSearchQuerySchema,
	SectorSearchResponseSchema,
} from "./beneficiary-sectors.schema.js";
import { searchSectors } from "./beneficiary-sectors.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.openapi(
	createRoute({
		method: "get",
		path: "/beneficiary-sectors/search",
		tags: ["Beneficiary Sectors"],
		summary: "Find existing beneficiary sectors, including similar spellings",
		security: [{ Bearer: [] }],
		request: { query: SectorSearchQuerySchema },
		responses: {
			200: {
				description:
					"Up to ten matching sector labels; similarity does not imply equivalence",
				content: { "application/json": { schema: SectorSearchResponseSchema } },
			},
		},
	}),
	async (c) => c.json(await searchSectors(c.req.valid("query").q), 200),
);

export default app;
