import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, desc, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { moas } from "../db/schema/moas.js";
import { projectReports } from "../db/schema/project-reports.js";
import { projects } from "../db/schema/projects.js";
import { proposals } from "../db/schema/proposals.js";
import { users } from "../db/schema/users.js";
import { createClient } from "@supabase/supabase-js";
import { departments } from "../db/schema/departments.js";
import { partners } from "../db/schema/partners.js";
import { proposalDocuments } from "../db/schema/proposal-documents.js";
import { proposalMembers } from "../db/schema/proposal-members.js";
import { proposalReviews } from "../db/schema/proposal-reviews.js";
import { proposalSdgs } from "../db/schema/proposal-sdgs.js";
import { sdgs } from "../db/schema/sdgs.js";
import { specialOrders } from "../db/schema/special-orders.js";
import { env } from "../env.js";
import { insertAuditLog } from "../lib/audit.js";
import { getClientIp } from "../lib/client-ip.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import {
	PROJECT_STATUS,
	PROPOSAL_STATUS,
	REPORT_TYPE,
	ROLE_NAMES,
} from "../lib/types.js";
import { type AuthEnv, authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──
const ProjectSchema = z
	.object({
		projectId: z.string().uuid(),
		proposalId: z.string().uuid(),
		moaId: z.string().uuid().nullable(),
		title: z.string().optional(),
		extensionCategory: z.string().optional(),
		targetStartDate: z.string().nullable(),
		targetEndDate: z.string().nullable(),
		actualEndDate: z.string().nullable(),
		projectStatus: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		archivedAt: z.string().nullable(),
		leaderFirstName: z.string().nullable().optional(),
		leaderLastName: z.string().nullable().optional(),
		leaderAcademicRank: z.string().nullable().optional(),
		isMember: z.boolean().optional(),
	})
	.openapi("Project");

const ProjectListSchema = z
	.object({ items: z.array(ProjectSchema), total: z.number() })
	.openapi("ProjectList");

const CreateProjectSchema = z
	.object({
		proposalId: z.string(),
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

// Project lifecycle mutations are Director-only.
// GET /projects remains accessible to all authenticated roles (scoped per-role
// in the handler). These run after authMiddleware, so c.var.user is populated.
const directorOnly = requireRole(ROLE_NAMES.DIRECTOR);
app.use("/projects", async (c, next) => {
	// Only guard the POST (create); GET passes through.
	if (c.req.method === "POST") {
		return directorOnly(c, next);
	}
	return next();
});
app.use("/projects/:id/link-moa", directorOnly);
app.use("/projects/:id/transition", directorOnly);
app.use("/projects/:id/close", directorOnly);

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

	const leaderMembers = db
		.select({
			proposalId: proposalMembers.proposalId,
			userId: proposalMembers.userId,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.projectRole, "Project Leader"))
		.as("leader_members");

	const userMemberSubquery = db
		.select({
			proposalId: proposalMembers.proposalId,
			isMember: sql<boolean>`true`.as("is_member"),
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.userId, user.userId))
		.as("user_member");

	const rows = await db
		.select({
			projectId: projects.projectId,
			proposalId: projects.proposalId,
			moaId: projects.moaId,
			title: proposals.title,
			extensionCategory: proposals.extensionCategory,
			targetStartDate: proposals.targetStartDate,
			targetEndDate: proposals.targetEndDate,
			actualEndDate: projects.actualEndDate,
			projectStatus: projects.projectStatus,
			createdAt: projects.createdAt,
			updatedAt: projects.updatedAt,
			archivedAt: projects.archivedAt,
			leaderFirstName: users.firstName,
			leaderLastName: users.lastName,
			leaderAcademicRank: users.academicRank,
			isMember: sql<boolean>`COALESCE(${userMemberSubquery.isMember}, false)`,
		})
		.from(projects)
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.leftJoin(leaderMembers, eq(projects.proposalId, leaderMembers.proposalId))
		.leftJoin(users, eq(leaderMembers.userId, users.userId))
		.leftJoin(
			userMemberSubquery,
			eq(projects.proposalId, userMemberSubquery.proposalId),
		)
		.where(
			and(
				isNull(projects.archivedAt),
				inArray(projects.proposalId, allowedProposals),
			),
		)
		.orderBy(desc(projects.createdAt))
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) => ({
		...r,
		targetStartDate: r.targetStartDate?.toISOString() ?? null,
		targetEndDate: r.targetEndDate?.toISOString() ?? null,
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
			.select({
				status: proposals.status,
				targetStartDate: proposals.targetStartDate,
				targetEndDate: proposals.targetEndDate,
			})
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
				ipAddress: getClientIp(c),
			},
			tx,
		);

		return {
			...createdProject,
			targetStartDate: proposal.targetStartDate,
			targetEndDate: proposal.targetEndDate,
		};
	});

	return c.json(
		{
			...created,
			targetStartDate: created.targetStartDate?.toISOString() ?? null,
			targetEndDate: created.targetEndDate?.toISOString() ?? null,
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
				ipAddress: getClientIp(c),
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
				ipAddress: getClientIp(c),
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
				ipAddress: getClientIp(c),
			},
			tx,
		);
	});

	return c.json({ message: "Project closed" }, 200);
});

// ── Project Details Endpoint ──

const ProjectDetailsMemberSchema = z.object({
	memberId: z.string(),
	userId: z.string(),
	name: z.string(),
	role: z.string(),
	avatarUrl: z.string().nullable().optional(),
	specialOrder: z
		.object({
			specialOrderId: z.string(),
			soNumber: z.string(),
			storagePath: z.string().nullable(),
			dateIssued: z.string().nullable(),
			status: z.string(),
		})
		.nullable()
		.optional(),
});

const ProjectDetailsHistoryItemSchema = z.object({
	id: z.string(),
	version: z.string(),
	status: z.string(),
	actorName: z.string(),
	date: z.string(),
	comment: z.string().optional(),
});

const ProjectDetailsAttachmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	url: z.string(),
	version: z.string(),
});

const ProjectDetailsSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: z.string(),
	version: z.string(),
	bypassedRetChair: z.boolean(),
	metadata: z.object({
		leader: z.object({
			name: z.string(),
		}),
		department: z.string(),
		duration: z.string(),
		moaLinked: z.string(),
		sdgs: z.string().optional(),
		budget: z.object({
			total: z.number(),
			neust: z.number(),
			partner: z.number(),
		}),
	}),
	members: z.array(ProjectDetailsMemberSchema),
	history: z.array(ProjectDetailsHistoryItemSchema),
	attachments: z.array(ProjectDetailsAttachmentSchema),
});

const projectDetailsRoute = createRoute({
	method: "get",
	path: "/projects/{proposalId}",
	tags: ["Projects"],
	summary: "Get project details by proposal ID",
	security: [{ Bearer: [] }],
	request: {
		params: z.object({
			proposalId: z
				.string()
				.uuid()
				.openapi({ param: { name: "proposalId", in: "path" } }),
		}),
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
	const { proposalId } = c.req.valid("param");
	const user = c.get("user");

	const leaderMembers = db
		.select({
			proposalId: proposalMembers.proposalId,
			userId: proposalMembers.userId,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.projectRole, "Project Leader"))
		.as("leader_members");

	const [row] = await db
		.select({
			proposalId: proposals.proposalId,
			campusId: proposals.campusId,
			departmentId: proposals.departmentId,
			title: proposals.title,
			status: proposals.status,
			revisionNum: proposals.revisionNum,
			bypassedRetChair: proposals.bypassedRetChair,
			budgetNeust: proposals.budgetNeust,
			budgetPartner: proposals.budgetPartner,
			leaderFirstName: users.firstName,
			leaderLastName: users.lastName,
			departmentCode: departments.departmentCode,
			departmentName: departments.departmentName,
			projectStatus: projects.projectStatus,
			targetStartDate: proposals.targetStartDate,
			targetEndDate: proposals.targetEndDate,
			moaPartner: partners.partnerName,
		})
		.from(proposals)
		.innerJoin(
			leaderMembers,
			eq(proposals.proposalId, leaderMembers.proposalId),
		)
		.innerJoin(users, eq(leaderMembers.userId, users.userId))
		.innerJoin(
			departments,
			eq(proposals.departmentId, departments.departmentId),
		)
		.leftJoin(projects, eq(proposals.proposalId, projects.proposalId))
		.leftJoin(moas, eq(projects.moaId, moas.moaId))
		.leftJoin(partners, eq(moas.partnerId, partners.partnerId))
		.where(eq(proposals.proposalId, proposalId));

	if (!row) {
		return c.json({ error: { message: "Project not found" } }, 404);
	}

	// Security check for Faculty / RET Chair
	if (user.roleName === ROLE_NAMES.FACULTY || user.roleName === ROLE_NAMES.RET_CHAIR) {
		const isMainCampus = user.isMainCampus;

		if (isMainCampus && user.departmentId !== null) {
			if (row.departmentId !== user.departmentId) {
				throw new ApiError(
					403,
					"FORBIDDEN",
					"You do not have access to this proposal",
				);
			}
		} else {
			if (row.campusId !== user.campusId) {
				throw new ApiError(
					403,
					"FORBIDDEN",
					"You do not have access to this proposal",
				);
			}
		}
	}

	const [memberRows, documentRows, reviewRows, sdgRows, specialOrderRows] = await Promise.all([
		db
			.select({
				userId: users.userId,
				firstName: users.firstName,
				lastName: users.lastName,
				role: proposalMembers.projectRole,
				memberId: proposalMembers.memberId,
				avatarUrl: users.avatarUrl,
			})
			.from(proposalMembers)
			.innerJoin(users, eq(proposalMembers.userId, users.userId))
			.where(eq(proposalMembers.proposalId, proposalId)),

		db
			.select({
				documentId: proposalDocuments.documentId,
				versionNum: proposalDocuments.versionNum,
				storagePath: proposalDocuments.storagePath,
				uploadedAt: proposalDocuments.uploadedAt,
			})
			.from(proposalDocuments)
			.where(eq(proposalDocuments.proposalId, proposalId))
			.orderBy(desc(proposalDocuments.versionNum)),

		db
			.select({
				reviewId: proposalReviews.reviewId,
				decision: proposalReviews.decision,
				comments: proposalReviews.comments,
				reviewedAt: proposalReviews.reviewedAt,
				reviewerFirstName: users.firstName,
				reviewerLastName: users.lastName,
			})
			.from(proposalReviews)
			.innerJoin(users, eq(proposalReviews.reviewerId, users.userId))
			.where(eq(proposalReviews.proposalId, proposalId))
			.orderBy(desc(proposalReviews.reviewedAt)),

		db
			.select({
				sdgNumber: sdgs.sdgNumber,
				sdgTitle: sdgs.sdgTitle,
			})
			.from(proposalSdgs)
			.innerJoin(sdgs, eq(proposalSdgs.sdgId, sdgs.sdgId))
			.where(eq(proposalSdgs.proposalId, proposalId))
			.orderBy(sdgs.sdgNumber),

		db
			.select({
				memberId: specialOrders.memberId,
				specialOrderId: specialOrders.specialOrderId,
				soNumber: specialOrders.soNumber,
				storagePath: specialOrders.storagePath,
				dateIssued: specialOrders.dateIssued,
				status: specialOrders.status,
			})
			.from(specialOrders)
			.innerJoin(proposalMembers, eq(specialOrders.memberId, proposalMembers.memberId))
			.where(
				and(
					eq(proposalMembers.proposalId, proposalId),
					isNull(specialOrders.archivedAt),
				),
			)
			.orderBy(desc(specialOrders.createdAt)),
	]);

	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	let duration = "Not yet started";
	if (row.targetStartDate && row.targetEndDate) {
		duration = `${months[row.targetStartDate.getMonth()]} ${row.targetStartDate.getFullYear()} - ${months[row.targetEndDate.getMonth()]} ${row.targetEndDate.getFullYear()}`;
	}

	const budgetNeust = Number(row.budgetNeust ?? 0);
	const budgetPartner = Number(row.budgetPartner ?? 0);

	const specialOrderMap = new Map<
		string,
		{
			specialOrderId: string;
			soNumber: string;
			storagePath: string | null;
			dateIssued: string | null;
			status: string;
		}
	>();
	for (const so of specialOrderRows) {
		specialOrderMap.set(so.memberId, {
			specialOrderId: so.specialOrderId,
			soNumber: so.soNumber,
			storagePath: so.storagePath,
			dateIssued: so.dateIssued?.toISOString() ?? null,
			status: so.status,
		});
	}

	const members = memberRows.map((m) => ({
		memberId: m.memberId,
		userId: m.userId,
		name: `${m.firstName} ${m.lastName}`,
		role: m.role,
		avatarUrl: m.avatarUrl,
		specialOrder: specialOrderMap.get(m.memberId) ?? null,
	}));

	const history: Array<{
		id: string;
		version: string;
		status: string;
		actorName: string;
		date: string;
		comment?: string;
	}> = [];

	documentRows.forEach((doc) => {
		history.push({
			id: doc.documentId,
			version: `v${doc.versionNum}`,
			status:
				doc.versionNum === documentRows[0]?.versionNum ? "Current" : "Previous",
			actorName: "System",
			date: doc.uploadedAt.toISOString(),
		});
	});

	reviewRows.forEach((review) => {
		const matchingDoc = documentRows.find(
			(doc) => doc.uploadedAt.getTime() <= review.reviewedAt.getTime(),
		);
		const reviewVersion = matchingDoc ? `v${matchingDoc.versionNum}` : `v${row.revisionNum}`;

		history.push({
			id: review.reviewId,
			version: reviewVersion,
			status:
				review.decision === "Returned"
					? "Returned"
					: review.decision === "Approved"
						? "Approved"
						: review.decision,
			actorName: `${review.reviewerFirstName} ${review.reviewerLastName}`,
			date: review.reviewedAt.toISOString(),
			...(review.comments ? { comment: review.comments } : {}),
		});
	});

	history.sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);

	const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

	const attachments = await Promise.all(
		documentRows.map(async (doc) => {
			const { data: signedUrlData } = await supabaseClient.storage
				.from("documents")
				.createSignedUrl(doc.storagePath, 3600);

			const rawName = doc.storagePath.split("/").pop() || doc.storagePath;
			const cleanName = rawName.replace(/^v\d+_\d+_[a-f0-9-]+_/, "");

			return {
				id: doc.documentId,
				name: cleanName,
				type: "pdf",
				url: signedUrlData?.signedUrl ?? "",
				version: `v${doc.versionNum}`,
			};
		}),
	);

	return c.json(
		{
			id: row.proposalId,
			title: row.title,
			status: row.projectStatus || row.status,
			version: `v${row.revisionNum}`,
			bypassedRetChair: row.bypassedRetChair,
			metadata: {
				leader: {
					name: `${row.leaderFirstName} ${row.leaderLastName}`,
				},
				departmentCode: row.departmentCode,
				department: row.departmentName,
				duration,
				moaLinked: row.moaPartner || "None",
				sdgs: sdgRows.map((s) => `SDG ${s.sdgNumber}`).join(", ") || undefined,
				budget: {
					total: budgetNeust + budgetPartner,
					neust: budgetNeust,
					partner: budgetPartner,
				},
			},
			members,
			history,
			attachments,
		},
		200,
	);
});

export default app;
