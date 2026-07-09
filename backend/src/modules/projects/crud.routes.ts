import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema } from "@/lib/schemas.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { installApiErrorHandler } from "@/lib/errors.js";
import {
	ProjectSchema,
	ProjectListSchema,
	ProjectDerivedStateSchema,
	ProjectDetailsSchema,
	ParamId,
	PaginationQuery,
	CreateProjectSchema,
} from "./projects.schema.js";
import {
	listProjects,
	createProjectFromProposal,
	getProjectDetails,
	getProjectDerivedState,
	restoreProject,
} from "./projects.service.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

app.use("/*", authMiddleware);

// POST /projects is Director-only; GET passes through to all roles.
const directorOnly = requireRole(ROLE_NAMES.DIRECTOR);
app.use("/projects", async (c, next) => {
	if (c.req.method === "POST") {
		return directorOnly(c, next);
	}
	return next();
});

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

// ── POST /projects ──
const createProjectRoute = createRoute({
	method: "post",
	path: "/projects",
	tags: ["Projects"],
	summary: "Create a project from an approved proposal",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CreateProjectSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: ProjectSchema } },
			description: "Project created",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Validation error",
		},
	},
});

app.openapi(createProjectRoute, async (c) => {
	const user = c.get("user");
	const body = c.req.valid("json");
	const created = await createProjectFromProposal(body.proposalId, user, getClientIp(c));
	return c.json(created, 201);
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

// ── POST /:id/restore ──
app.post("/:id/restore", async (c) => {
	const id = c.req.param("id");
	const updated = await restoreProject(id);

	if (!updated) {
		return c.json({ error: "Project not found or could not be restored" }, 404);
	}

	return c.json({ message: "Project restored successfully", id }, 200);
});

export default app;
