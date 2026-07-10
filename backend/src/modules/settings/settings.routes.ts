import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema } from "@/lib/schemas.js";
import type { AuthEnv } from "@/middleware/auth.js";
import { authMiddleware } from "@/middleware/auth.js";
import {
	PaginationQuery,
	SettingListSchema,
	SettingSchema,
	UpsertSettingSchema,
} from "./settings.schema.js";
import { listSettings, upsertSetting } from "./settings.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("/settings/*", authMiddleware);
app.use("/settings", authMiddleware);

// ── GET /settings ──
const listRoute = createRoute({
	method: "get",
	path: "/settings",
	tags: ["Settings"],
	summary: "List all system settings",
	security: [{ Bearer: [] }],
	request: { query: PaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: SettingListSchema } },
			description: "All settings",
		},
	},
});

app.openapi(listRoute, async (c) => {
	const query = c.req.valid("query");
	const result = await listSettings(query);
	return c.json(result, 200);
});

// ── PUT /settings ──
const upsertRoute = createRoute({
	method: "put",
	path: "/settings",
	tags: ["Settings"],
	summary: "Create or update a system setting (Super Admin only)",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: { "application/json": { schema: UpsertSettingSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: SettingSchema } },
			description: "Setting upserted",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
		},
	},
});

app.openapi(upsertRoute, async (c) => {
	const user = c.get("user");
	const body = c.req.valid("json");
	const ipAddress = getClientIp(c);
	const result = await upsertSetting(user, body, ipAddress);
	return c.json(result, 200);
});

export default app;
