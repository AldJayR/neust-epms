import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
	and,
	eq,
	inArray,
	isNull,
} from "drizzle-orm";
import { db } from "@/db/client.js";
import { projects } from "@/db/schema/projects.js";
import { proposals } from "@/db/schema/proposals.js";
import { projectReportingSchedules } from "@/db/schema/project-reporting-schedules.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { deriveProjectState } from "@/lib/derived-states.js";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema } from "@/lib/schemas.js";
import { type ProjectStatus } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { ROLE_NAMES } from "@/lib/types.js";
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
	buildUserProjectScope,
	getLeaderSubquery,
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

	const proposalConditions = buildUserProjectScope(user);

	const allowedProposals = db
		.select({ proposalId: proposals.proposalId })
		.from(proposals)
		.where(and(...proposalConditions));

	const leaderMembers = getLeaderSubquery();

	const [row] = await db
		.select({
			projectId: projects.projectId,
			projectStatus: projects.projectStatus,
			moaId: projects.moaId,
			leaderId: leaderMembers.userId,
		})
		.from(projects)
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.leftJoin(leaderMembers, eq(projects.proposalId, leaderMembers.proposalId))
		.where(
			and(
				eq(projects.projectId, id),
				isNull(projects.archivedAt),
				inArray(projects.proposalId, allowedProposals),
			),
		)
		.limit(1);

	if (!row) {
		const { ApiError } = await import("@/lib/errors.js");
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	const [schedule] = await db
		.select({ scheduleId: projectReportingSchedules.scheduleId })
		.from(projectReportingSchedules)
		.where(eq(projectReportingSchedules.projectId, id))
		.limit(1);

	const [report] = await db
		.select({ reportId: projectReports.reportId })
		.from(projectReports)
		.where(
			and(eq(projectReports.projectId, id), isNull(projectReports.archivedAt)),
		)
		.limit(1);

	const derived = deriveProjectState(
		{
			projectStatus: row.projectStatus as ProjectStatus,
			moaId: row.moaId,
			reportingSchedule: !!schedule,
			hasReports: !!report,
			leaderId: row.leaderId ?? undefined,
		},
		user,
	);

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
