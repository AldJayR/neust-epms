import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema } from "@/lib/schemas.js";
import { OPERATIONAL_ROLES, ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";

import {
	PaginationQuery,
	ParamId,
	ProjectDerivedStateSchema,
	ProjectDetailsSchema,
	ProjectHoldSchema,
	ProjectListSchema,
} from "./projects.schema.js";
import {
	getProjectDerivedState,
	getProjectDetails,
	listProjects,
	restoreProject,
	setProjectHold,
} from "./projects.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("/projects", authMiddleware);
app.use("/projects/*", authMiddleware);
app.use("/projects", requireRole(...OPERATIONAL_ROLES));
app.use("/projects/:id", requireRole(...OPERATIONAL_ROLES));
app.use("/projects/:id/derived-state", requireRole(...OPERATIONAL_ROLES));
app.use("/projects/:id/restore", requireRole(ROLE_NAMES.DIRECTOR));
app.use("/projects/:id/hold", requireRole(ROLE_NAMES.SUPER_ADMIN));

// ── GET /projects ──
const listRoute = createRoute({
	method: "get",
	path: "/projects",
	tags: ["Projects"],
	summary: "List all non-archived projects",
	security: [{ Bearer: [] }],
	request: { query: PaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: ProjectListSchema } },
			description: "Project list",
		},
	},
});

app.openapi(listRoute, async (c) => {
	const user = c.get("user");
	const query = c.req.valid("query");
	const result = await listProjects(user, query);
	return c.json(result, 200);
});

// ── GET /projects/:id ──
const projectDetailsRoute = createRoute({
	method: "get",
	path: "/projects/{id}",
	tags: ["Projects"],
	summary: "Get project details by proposal ID or project ID",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
	},
	responses: {
		200: {
			content: { "application/json": { schema: ProjectDetailsSchema } },
			description: "Project details",
		},
		404: {
			description: "Project not found",
		},
	},
});

app.openapi(projectDetailsRoute, async (c) => {
	const { id } = c.req.valid("param");
	const user = c.get("user");
	const details = await getProjectDetails(id, user);
	return c.json(details, 200);
});

// ── GET /projects/:id/derived-state ──
const projectDerivedStateRoute = createRoute({
	method: "get",
	path: "/projects/{id}/derived-state",
	tags: ["Projects"],
	summary: "Get the derived Act/Wait/Watch state for a project",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: ProjectDerivedStateSchema } },
			description: "Derived state of the project",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Project not found",
		},
	},
});

app.openapi(projectDerivedStateRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	const derived = await getProjectDerivedState(id, user);
	return c.json(derived, 200);
});

const holdRoute = createRoute({
	method: "patch",
	path: "/projects/{id}/hold",
	tags: ["Projects"],
	summary: "Place or remove a retention hold on a project",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: { "application/json": { schema: ProjectHoldSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: ProjectHoldSchema } },
			description: "Project hold updated",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Project not found",
		},
	},
});

app.openapi(holdRoute, async (c) => {
	const updated = await setProjectHold(
		c.req.valid("param").id,
		c.req.valid("json").onHold,
		c.get("user"),
		getClientIp(c),
	);
	return c.json(updated, 200);
});

// ── POST /projects/:id/restore ──
app.post("/projects/:id/restore", async (c) => {
	const id = c.req.param("id");
	const updated = await restoreProject(id, c.get("user"), getClientIp(c));

	if (!updated) {
		return c.json({ error: "Project not found or could not be restored" }, 404);
	}

	return c.json({ message: "Project restored successfully", id }, 200);
});

export default app;
