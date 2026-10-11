import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ApiError } from "@/lib/errors.js";
import { ErrorSchema, MessageSchema } from "@/lib/schemas.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { MAX_PDF_UPLOAD_BYTES } from "@/services/file.service.js";

import { closeProject } from "./project-closure.service.js";
import {
	CloseProjectSchema,
	ParamId,
	TransitionSchema,
} from "./projects.schema.js";
import { transitionProjectStatus } from "./projects.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("/projects/:id/transition", authMiddleware);
app.use("/projects/:id/transition", requireRole(ROLE_NAMES.DIRECTOR));

app.use("/projects/:id/close", authMiddleware);
app.use("/projects/:id/close", requireRole(ROLE_NAMES.DIRECTOR));
app.use("/projects/:id/close", async (c, next) => {
	if (Number(c.req.header("content-length") ?? 0) > MAX_PDF_UPLOAD_BYTES) {
		throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Upload exceeds the 50MB limit");
	}
	await next();
});

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
		"Requires a complete terminal package and the Director's uploaded PDF scan of the signed terminal report.",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: { "multipart/form-data": { schema: CloseProjectSchema } },
			required: true,
		},
	},
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
		409: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Project changed during closure",
		},
		413: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Signed report exceeds the upload limit",
		},
		422: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Signed report is not a valid PDF",
		},
	},
});

app.openapi(
	closeProjectRoute,
	async (c) => {
		const user = c.get("user");
		const { id } = c.req.valid("param");
		const { file } = c.req.valid("form");
		await closeProject(id, user, file, getClientIp(c));
		return c.json({ message: "Project closed" }, 200);
	},
	(result) => {
		if (!result.success && result.target === "form") {
			throw new ApiError(
				400,
				"MISSING_SIGNED_TERMINAL_REPORT",
				"Upload the signed terminal report as a PDF before closing the project",
			);
		}
		return undefined;
	},
);

export default app;
