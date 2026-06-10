import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { moas } from "../db/schema/moas.js";
import { projectReports } from "../db/schema/project-reports.js";
import { projects } from "../db/schema/projects.js";
import { proposals } from "../db/schema/proposals.js";
import { insertAuditLog } from "../lib/audit.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import {
	PROJECT_STATUS,
	PROPOSAL_STATUS,
	REPORT_TYPE,
	ROLE_NAMES,
} from "../lib/types.js";
import { type AuthEnv, authMiddleware } from "../middleware/auth.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──
const ProjectSchema = z
	.object({
		projectId: z.string().uuid(),
		proposalId: z.string().uuid(),
		moaId: z.string().uuid().nullable(),
		startDate: z.string().nullable(),
		targetEnd: z.string().nullable(),
		actualEndDate: z.string().nullable(),
		projectStatus: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		archivedAt: z.string().nullable(),
	})
	.openapi("Project");

const ProjectListSchema = z
	.object({ items: z.array(ProjectSchema), total: z.number() })
	.openapi("ProjectList");

const CreateProjectSchema = z
	.object({
		proposalId: z.string(),
		startDate: z.string().datetime().optional(),
		targetEnd: z.string().datetime().optional(),
	})
	.openapi("CreateProject");

const LinkMoaSchema = z.object({ moaId: z.string() }).openapi("LinkMoa");

const TransitionSchema = z
	.object({ status: z.enum(["Ongoing", "Completed"]) })
	.openapi("TransitionProject");

const ErrorSchema = z
	.object({
		error: z.object({ code: z.string(), message: z.string() }),
	})
	.openapi("ProjectError");

const MessageSchema = z
	.object({ message: z.string() })
	.openapi("ProjectMessage");

const ParamId = z.object({
	id: z
		.string()
		.uuid()
		.openapi({ param: { name: "id", in: "path" } }),
});

const PaginationQuery = z.object({
	page: z.coerce
		.number()
		.int()
		.min(1)
		.default(1)
		.openapi({
			param: { name: "page", in: "query" },
		}),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(50)
		.openapi({
			param: { name: "limit", in: "query" },
		}),
});

app.use("/projects/*", authMiddleware);

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
	const { page, limit } = c.req.valid("query");
	const offset = (page - 1) * limit;

	const proposalConditions: SQL[] = [isNull(proposals.archivedAt)];

	if (user.roleName === ROLE_NAMES.FACULTY) {
		if (user.departmentId !== null) {
			proposalConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			proposalConditions.push(eq(proposals.campusId, user.campusId));
		}
	} else if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			proposalConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			proposalConditions.push(eq(proposals.campusId, user.campusId));
		}
	}

	const allowedProposals = db
		.select({ proposalId: proposals.proposalId })
		.from(proposals)
		.where(and(...proposalConditions));

	const rows = await db
		.select({
			projectId: projects.projectId,
			proposalId: projects.proposalId,
			moaId: projects.moaId,
			startDate: projects.startDate,
			targetEnd: projects.targetEnd,
			actualEndDate: projects.actualEndDate,
			projectStatus: projects.projectStatus,
			createdAt: projects.createdAt,
			updatedAt: projects.updatedAt,
			archivedAt: projects.archivedAt,
		})
		.from(projects)
		.where(
			and(
				isNull(projects.archivedAt),
				inArray(projects.proposalId, allowedProposals),
			),
		)
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) => ({
		...r,
		startDate: r.startDate?.toISOString() ?? null,
		targetEnd: r.targetEnd?.toISOString() ?? null,
		actualEndDate: r.actualEndDate?.toISOString() ?? null,
		createdAt: r.createdAt.toISOString(),
		updatedAt: r.updatedAt.toISOString(),
		archivedAt: r.archivedAt?.toISOString() ?? null,
	}));

	const [totalResult] = await db
		.select({ value: count() })
		.from(projects)
		.where(
			and(
				isNull(projects.archivedAt),
				inArray(projects.proposalId, allowedProposals),
			),
		);
	const total = Number(totalResult?.value ?? 0);

	return c.json({ items, total }, 200);
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

	const created = await db.transaction(async (tx) => {
		// Verify proposal is approved
		const [proposal] = await tx
			.select({ status: proposals.status })
			.from(proposals)
			.where(eq(proposals.proposalId, body.proposalId))
			.limit(1);

		if (!proposal) {
			throw new ApiError(404, "NOT_FOUND", "Proposal not found");
		}

		if (proposal.status !== PROPOSAL_STATUS.APPROVED) {
			throw new ApiError(
				400,
				"NOT_APPROVED",
				"Only approved proposals can become projects",
			);
		}

		// Check if a project already exists for this proposal (1:1)
		const [existing] = await tx
			.select({ projectId: projects.projectId })
			.from(projects)
			.where(eq(projects.proposalId, body.proposalId))
			.limit(1);

		if (existing) {
			throw new ApiError(
				409,
				"DUPLICATE",
				"A project already exists for this proposal",
			);
		}

		const [createdProject] = await tx
			.insert(projects)
			.values({
				proposalId: body.proposalId,
				startDate: body.startDate ? new Date(body.startDate) : null,
				targetEnd: body.targetEnd ? new Date(body.targetEnd) : null,
			})
			.returning();

		if (!createdProject) {
			throw new ApiError(500, "INSERT_FAILED", "Failed to create project");
		}

		await insertAuditLog(
			{
				userId: user.userId,
				action: `Created project ${createdProject.projectId} from proposal ${body.proposalId}`,
				tableAffected: "projects",
				ipAddress: c.req.header("x-forwarded-for") ?? null,
			},
			tx,
		);

		return createdProject;
	});

	return c.json(
		{
			...created,
			startDate: created.startDate?.toISOString() ?? null,
			targetEnd: created.targetEnd?.toISOString() ?? null,
			actualEndDate: created.actualEndDate?.toISOString() ?? null,
			createdAt: created.createdAt.toISOString(),
			updatedAt: created.updatedAt.toISOString(),
			archivedAt: created.archivedAt?.toISOString() ?? null,
		},
		201,
	);
});

// ── POST /projects/:id/link-moa ──
const linkMoaRoute = createRoute({
	method: "post",
	path: "/projects/{id}/link-moa",
	tags: ["Projects"],
	summary: "Link a MOA to a project (SYS-REQ-04.1)",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: { "application/json": { schema: LinkMoaSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "MOA linked",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "MOA expired or invalid",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found",
		},
	},
});

app.openapi(linkMoaRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");

	const [project] = await db
		.select({ projectId: projects.projectId, archivedAt: projects.archivedAt })
		.from(projects)
		.where(and(eq(projects.projectId, id), isNull(projects.archivedAt)))
		.limit(1);

	if (!project) {
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	const [moa] = await db
		.select({
			moaId: moas.moaId,
			validUntil: moas.validUntil,
			archivedAt: moas.archivedAt,
		})
		.from(moas)
		.where(and(eq(moas.moaId, body.moaId), isNull(moas.archivedAt)))
		.limit(1);

	if (!moa) {
		throw new ApiError(404, "MOA_NOT_FOUND", "MOA not found");
	}

	if (moa.validUntil < new Date()) {
		throw new ApiError(400, "MOA_EXPIRED", "Cannot link an expired MOA");
	}

	await db.transaction(async (tx) => {
		await tx
			.update(projects)
			.set({ moaId: body.moaId, updatedAt: new Date() })
			.where(eq(projects.projectId, id));

		await insertAuditLog(
			{
				userId: user.userId,
				action: `Linked MOA ${body.moaId} to project ${id}`,
				tableAffected: "projects",
				ipAddress: c.req.header("x-forwarded-for") ?? null,
			},
			tx,
		);
	});

	return c.json({ message: "MOA linked to project" }, 200);
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

	const [project] = await db
		.select({
			projectId: projects.projectId,
			projectStatus: projects.projectStatus,
			moaId: projects.moaId,
			archivedAt: projects.archivedAt,
		})
		.from(projects)
		.where(and(eq(projects.projectId, id), isNull(projects.archivedAt)))
		.limit(1);

	if (!project) {
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	// SYS-REQ-04.1: Require active MOA to transition to "Ongoing"
	if (body.status === PROJECT_STATUS.ONGOING) {
		if (project.projectStatus !== PROJECT_STATUS.APPROVED) {
			throw new ApiError(
				400,
				"INVALID_TRANSITION",
				"Only Approved projects can transition to Ongoing",
			);
		}

		if (!project.moaId) {
			throw new ApiError(
				400,
				"MOA_REQUIRED",
				"An active MOA must be linked before transitioning to Ongoing (SYS-REQ-04.1)",
			);
		}

		// Verify linked MOA is not expired
		const [moa] = await db
			.select({ moaId: moas.moaId, validUntil: moas.validUntil })
			.from(moas)
			.where(eq(moas.moaId, project.moaId))
			.limit(1);

		if (!moa || moa.validUntil < new Date()) {
			throw new ApiError(
				400,
				"MOA_EXPIRED",
				"The linked MOA is expired. Link a valid MOA first.",
			);
		}
	}

	if (body.status === PROJECT_STATUS.COMPLETED) {
		if (project.projectStatus !== PROJECT_STATUS.ONGOING) {
			throw new ApiError(
				400,
				"INVALID_TRANSITION",
				"Only Ongoing projects can be marked as Completed",
			);
		}
	}

	await db.transaction(async (tx) => {
		await tx
			.update(projects)
			.set({ projectStatus: body.status, updatedAt: new Date() })
			.where(eq(projects.projectId, id));

		await insertAuditLog(
			{
				userId: user.userId,
				action: `Transitioned project ${id} to ${body.status}`,
				tableAffected: "projects",
				ipAddress: c.req.header("x-forwarded-for") ?? null,
			},
			tx,
		);
	});

	return c.json({ message: `Project transitioned to ${body.status}` }, 200);
});

// ── POST /projects/:id/close ──
const closeProjectRoute = createRoute({
	method: "post",
	path: "/projects/{id}/close",
	tags: ["Projects"],
	summary: "Explicitly close a project (project leader only)",
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
			description: "Forbidden (not project leader)",
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

	const [project] = await db
		.select({
			projectId: projects.projectId,
			projectStatus: projects.projectStatus,
			proposalId: projects.proposalId,
			archivedAt: projects.archivedAt,
		})
		.from(projects)
		.where(and(eq(projects.projectId, id), isNull(projects.archivedAt)))
		.limit(1);

	if (!project) {
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	if (
		project.projectStatus === PROJECT_STATUS.CLOSED ||
		project.projectStatus === PROJECT_STATUS.COMPLETED
	) {
		throw new ApiError(
			400,
			"ALREADY_CLOSED",
			"Project is already closed or completed",
		);
	}

	if (project.projectStatus !== PROJECT_STATUS.ONGOING) {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Only ongoing projects can be closed",
		);
	}

	// Verify both required reports exist
	const reports = await db
		.select({ reportType: projectReports.reportType })
		.from(projectReports)
		.where(
			and(eq(projectReports.projectId, id), isNull(projectReports.archivedAt)),
		);

	const hasFinalAccomplishment = reports.some(
		(r) => r.reportType === REPORT_TYPE.FINAL_ACCOMPLISHMENT,
	);
	const hasTerminal = reports.some(
		(r) => r.reportType === REPORT_TYPE.TERMINAL,
	);

	if (!hasFinalAccomplishment) {
		throw new ApiError(
			400,
			"MISSING_FINAL_ACCOMPLISHMENT_REPORT",
			"A Final Accomplishment report must be submitted before closing",
		);
	}

	if (!hasTerminal) {
		throw new ApiError(
			400,
			"MISSING_TERMINAL_REPORT",
			"A Terminal report must be submitted before closing",
		);
	}

	await db.transaction(async (tx) => {
		await tx
			.update(projects)
			.set({ projectStatus: PROJECT_STATUS.CLOSED, updatedAt: new Date() })
			.where(eq(projects.projectId, id));

		await insertAuditLog(
			{
				userId: user.userId,
				action: `Closed project ${id}`,
				tableAffected: "projects",
				ipAddress: c.req.header("x-forwarded-for") ?? null,
			},
			tx,
		);
	});

	return c.json({ message: "Project closed" }, 200);
});

export default app;
