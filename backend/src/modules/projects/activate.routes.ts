import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema, MessageSchema } from "@/lib/schemas.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";

import { ActivateSchema, ParamId } from "./projects.schema.js";
import { activateProject } from "./projects.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("/projects/:id/activate", authMiddleware);
app.use("/projects/:id/activate", requireRole(ROLE_NAMES.DIRECTOR));

// ── POST /projects/:id/activate ──
const activateRoute = createRoute({
	method: "post",
	path: "/projects/{id}/activate",
	tags: ["Projects"],
	summary:
		"Activate a project by linking MOA, setting reporting schedule, and transitioning to Ongoing",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: { "application/json": { schema: ActivateSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Project activated",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid activation request",
		},
	},
});

app.openapi(activateRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");
	await activateProject(id, body, user, getClientIp(c));
	return c.json({ message: "Project activated successfully" }, 200);
});

export default app;
