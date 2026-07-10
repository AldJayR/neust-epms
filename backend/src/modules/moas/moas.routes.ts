import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";

import { ErrorSchema, MessageSchema, ParamId } from "@/lib/schemas.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import {
	MoaDetailSchema,
	MoaLinkedProjectSchema,
	MoaListSchema,
	MoaPaginationQuery,
	MoaSchema,
	UpdateMoaSchema,
} from "./moas.schema.js";
import {
	getLinkedProjects,
	getMoaById,
	listMoas,
	restoreMoa,
	updateMoa,
	uploadMoaDocument,
} from "./moas.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("/moas/*", authMiddleware);
app.use("/moas", authMiddleware);

// ── GET /moas ──

const listRoute = createRoute({
	method: "get",
	path: "/moas",
	tags: ["MOAs"],
	summary: "List all non-archived MOAs (RET Chair / Director only)",
	security: [{ Bearer: [] }],
	request: { query: MoaPaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: MoaListSchema } },
			description: "List of MOAs",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
		},
	},
});

app.openapi(listRoute, async (c) => {
	const user = c.get("user");
	const query = c.req.valid("query");
	const result = await listMoas({ ...query, user });
	return c.json(result, 200);
});

// ── GET /moas/:id ──

const getRoute = createRoute({
	method: "get",
	path: "/moas/{id}",
	tags: ["MOAs"],
	summary: "Get a MOA by ID",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
	},
	responses: {
		200: {
			content: { "application/json": { schema: MoaDetailSchema } },
			description: "MOA detail",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found",
		},
	},
});

app.openapi(getRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	const result = await getMoaById(id, user);
	return c.json(result, 200);
});

// ── GET /moas/:id/projects ──

const linkedProjectsRoute = createRoute({
	method: "get",
	path: "/moas/{id}/projects",
	tags: ["MOAs"],
	summary: "Get projects linked to a MOA",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: MoaLinkedProjectSchema.array(),
				},
			},
			description: "Linked projects",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "MOA not found",
		},
	},
});

app.openapi(linkedProjectsRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	const result = await getLinkedProjects(id, user);
	return c.json(result, 200);
});

// ── POST /moas/upload ──

const uploadMoaRoute = createRoute({
	method: "post",
	path: "/moas/upload",
	tags: ["MOAs"],
	summary: "Upload a MOA document PDF and create partner/MOA record",
	security: [{ Bearer: [] }],
	responses: {
		201: {
			content: { "application/json": { schema: MoaSchema } },
			description: "MOA created",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid request",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
		},
		500: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Internal server error",
		},
	},
});

app.openapi(uploadMoaRoute, async (c) => {
	const user = c.get("user");
	const contentLength = Number(c.req.header("content-length") ?? 0);
	const formData = await c.req.formData();
	const result = await uploadMoaDocument(
		formData,
		user,
		getClientIp(c),
		contentLength,
	);
	return c.json(result, 201);
});

// ── PATCH /moas/:id ──

const updateRoute = createRoute({
	method: "patch",
	path: "/moas/{id}",
	tags: ["MOAs"],
	summary: "Update a MOA",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: { "application/json": { schema: UpdateMoaSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: MoaSchema } },
			description: "MOA updated",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Validation error",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found",
		},
	},
});

app.openapi(updateRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");
	const result = await updateMoa(id, body, user, getClientIp(c));
	return c.json(result, 200);
});

// ── POST /moas/:id/restore ──

const restoreRoute = createRoute({
	method: "post",
	path: "/moas/{id}/restore",
	tags: ["MOAs"],
	summary: "Restore an archived MOA",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
	},
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "MOA restored",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found",
		},
	},
});

app.openapi(restoreRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	const result = await restoreMoa(id, user, getClientIp(c));
	return c.json(result, 200);
});

export default app;
