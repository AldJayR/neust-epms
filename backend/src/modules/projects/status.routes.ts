import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema, MessageSchema } from "@/lib/schemas.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";

import { ParamId, TransitionSchema } from "./projects.schema.js";
import {
	closeProject,
	transitionProjectStatus,
} from "./projects.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("/projects/:id/transition", authMiddleware);
app.use("/projects/:id/transition", requireRole(ROLE_NAMES.DIRECTOR));

app.use("/projects/:id/close", authMiddleware);
app.use("/projects/:id/close", requireRole(ROLE_NAMES.DIRECTOR));

// ── POST /projects/:id/transition ──
const transitionRoute = createRoute({
	method: "post",
	path: "/projects/{id}/transition",
	tags: ["Projects"],
	summary: "Transition project status (requires MOA for Ongoing)",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: { "application/json": { schema: TransitionSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Status transitioned",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid transition",
		},
	},
});

app.openapi(transitionRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");
	await transitionProjectStatus(id, body.status, user, getClientIp(c));
	return c.json({ message: `Project transitioned to ${body.status}` }, 200);
});

// ── POST /projects/:id/close ──
const closeProjectRoute = createRoute({
	method: "post",
	path: "/projects/{id}/close",
	tags: ["Projects"],
	summary: "Explicitly close a project (Director only)",
	description:
		"Requires both a Final Accomplishment report and a Terminal report to be submitted.",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Project closed",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Validation error (missing reports or invalid state)",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden (Director only)",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found",
		},
	},
});

app.openapi(closeProjectRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	await closeProject(id, user, getClientIp(c));
	return c.json({ message: "Project closed" }, 200);
});

export default app;
