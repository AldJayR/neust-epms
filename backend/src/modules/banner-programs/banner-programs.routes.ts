import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema } from "@/lib/schemas.js";
import type { AuthEnv } from "@/middleware/auth.js";
import {
	BannerProgramListSchema,
	BannerProgramParams,
	BannerProgramSchema,
	CreateBannerProgramSchema,
	ManagedBannerProgramListSchema,
	UpdateBannerProgramSchema,
} from "./banner-programs.schema.js";
import {
	createBannerProgram,
	listActiveBannerPrograms,
	listManagedBannerPrograms,
	updateBannerProgram,
} from "./banner-programs.service.js";

const app = new OpenAPIHono<AuthEnv>();

const listRoute = createRoute({
	method: "get",
	path: "/banner-programs",
	tags: ["Banner Programs"],
	summary: "List active banner programs for the current scope",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: BannerProgramListSchema } },
			description: "Active banner programs",
		},
	},
});

app.openapi(listRoute, async (c) => {
	return c.json(await listActiveBannerPrograms(c.get("user")), 200);
});

const manageListRoute = createRoute({
	method: "get",
	path: "/banner-programs/manage",
	tags: ["Banner Programs"],
	summary: "List banner programs managed by the current RET Chair",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: {
				"application/json": { schema: ManagedBannerProgramListSchema },
			},
			description: "Scoped banner programs",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "RET Chair access required",
		},
	},
});

app.openapi(manageListRoute, async (c) => {
	return c.json(await listManagedBannerPrograms(c.get("user")), 200);
});

const createRouteDefinition = createRoute({
	method: "post",
	path: "/banner-programs",
	tags: ["Banner Programs"],
	summary: "Create a banner program for the current RET Chair scope",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CreateBannerProgramSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: BannerProgramSchema } },
			description: "Banner program created",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "RET Chair access required",
		},
	},
});

app.openapi(createRouteDefinition, async (c) => {
	const created = await createBannerProgram(
		c.get("user"),
		c.req.valid("json"),
		getClientIp(c),
	);
	return c.json(created, 201);
});

const updateRoute = createRoute({
	method: "patch",
	path: "/banner-programs/{id}",
	tags: ["Banner Programs"],
	summary: "Rename or activate/deactivate a banner program",
	security: [{ Bearer: [] }],
	request: {
		params: BannerProgramParams,
		body: {
			content: { "application/json": { schema: UpdateBannerProgramSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: BannerProgramSchema } },
			description: "Banner program updated",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "RET Chair access required",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Banner program not found",
		},
	},
});

app.openapi(updateRoute, async (c) => {
	const updated = await updateBannerProgram(
		c.get("user"),
		c.req.valid("param").id,
		c.req.valid("json"),
		getClientIp(c),
	);
	return c.json(updated, 200);
});

export default app;
