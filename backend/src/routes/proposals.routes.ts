import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	and,
	count,
	desc,
	eq,
	ilike,
	isNull,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "../db/client.js";
import { beneficiarySectors } from "../db/schema/beneficiary-sectors.js";
import { projects } from "../db/schema/projects.js";
import { proposalBeneficiaries } from "../db/schema/proposal-beneficiaries.js";
import { proposalComments } from "../db/schema/proposal-comments.js";
import { proposalDepartments } from "../db/schema/proposal-departments.js";
import { proposalDocuments } from "../db/schema/proposal-documents.js";
import { proposalMembers } from "../db/schema/proposal-members.js";
import { proposalReviews } from "../db/schema/proposal-reviews.js";
import { proposalSdgs } from "../db/schema/proposal-sdgs.js";
import { proposals } from "../db/schema/proposals.js";
import { roles } from "../db/schema/roles.js";
import { sdgs } from "../db/schema/sdgs.js";
import { users } from "../db/schema/users.js";
import { insertAuditLog } from "../lib/audit.js";
import { captureAuditDiff } from "../lib/audit-diff.js";
import { getClientIp } from "../lib/client-ip.js";
import { deriveProposalState } from "../lib/derived-states.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import { createNotification } from "../lib/notification.helpers.js";
import {
	PROPOSAL_STATUS,
	REVIEW_DECISION,
	REVIEW_STAGE,
	type ProposalStatus,
	ROLE_NAMES,
} from "../lib/types.js";
import type { AuthEnv } from "../middleware/auth.js";

const PROJECT_LEADER_ROLE = "Project Leader";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

async function isProjectLeader(
	proposalId: string,
	userId: string,
): Promise<boolean> {
	const [member] = await db
		.select({ memberId: proposalMembers.memberId })
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.proposalId, proposalId),
				eq(proposalMembers.userId, userId),
				eq(proposalMembers.projectRole, PROJECT_LEADER_ROLE),
			),
		)
		.limit(1);
	return !!member;
}

// ── Schemas ──
const ProposalSchema = z
	.object({
		proposalId: z.string().uuid(),
		campusId: z.number(),
		departmentId: z.number().nullable(),
		title: z.string(),
		bannerProgram: z.string(),
		projectLocale: z.string(),
		extensionCategory: z.string(),
		budgetPartner: z.string().nullable(),
		budgetNeust: z.string().nullable(),
		status: z.string(),
		bypassedRetChair: z.boolean(),
		revisionNum: z.number(),
		targetStartDate: z.string().nullable().optional(),
		targetEndDate: z.string().nullable().optional(),
		createdAt: z.string(),
		updatedAt: z.string(),
		archivedAt: z.string().nullable(),
		leaderFirstName: z.string().nullable().optional(),
		leaderLastName: z.string().nullable().optional(),
		leaderAcademicRank: z.string().nullable().optional(),
		isMember: z.boolean().optional(),
	})
	.openapi("Proposal");

const ProposalListSchema = z
	.object({ items: z.array(ProposalSchema), total: z.number() })
	.openapi("ProposalList");

const RETDashboardStatsSchema = z
	.object({
		pendingReview: z.number(),
		approvedProjects: z.number(),
		deniedProjects: z.number(),
	})
	.openapi("RETDashboardStats");

const CreateProposalSchema = z
	.object({
		campusId: z.number().int().positive(),
		departmentId: z.number().int().positive(),
		title: z.string().min(1),
		bannerProgram: z.string().min(1),
		projectLocale: z.string().min(1),
		extensionCategory: z.string().min(1),
		budgetPartner: z.coerce.number().nonnegative().finite().optional(),
		budgetNeust: z.coerce.number().nonnegative().finite().optional(),
		targetStartDate: z.string().datetime().optional(),
		targetEndDate: z.string().datetime().optional(),
		departmentIds: z.array(z.number().int().positive()).optional(),
		sectorIds: z.array(z.number().int().positive()).optional(),
		sectorNames: z.array(z.string().min(1)).optional(),
		sdgIds: z.array(z.number().int().positive()).optional(),
		members: z
			.array(
				z.object({
					userId: z.string().uuid(),
					projectRole: z.string().min(1),
				}),
			)
			.optional(),
	})
	.openapi("CreateProposal");

const UpdateProposalSchema = z
	.object({
		title: z.string().min(1).optional(),
		bannerProgram: z.string().min(1).optional(),
		projectLocale: z.string().min(1).optional(),
		extensionCategory: z.string().min(1).optional(),
		budgetPartner: z.coerce.number().nonnegative().finite().optional(),
		budgetNeust: z.coerce.number().nonnegative().finite().optional(),
		sectorNames: z.array(z.string().min(1)).optional(),
	})
	.openapi("UpdateProposal");

const ReviewProposalSchema = z
	.object({
		decision: z.enum([
			REVIEW_DECISION.ENDORSED,
			REVIEW_DECISION.APPROVED,
			REVIEW_DECISION.RETURNED,
			REVIEW_DECISION.REJECTED,
		]),
		comments: z.string().optional(),
	})
	.openapi("ReviewProposal");

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
	search: z
		.string()
		.optional()
		.openapi({
			param: { name: "search", in: "query" },
		}),
});

const ErrorSchema = z
	.object({
		error: z.object({ code: z.string(), message: z.string() }),
	})
	.openapi("ProposalError");

const MessageSchema = z
	.object({ message: z.string() })
	.openapi("ProposalMessage");

// Auth for /proposals/* is registered once at the root app (see app.ts).

// ── GET /proposals ──
const listRoute = createRoute({
	method: "get",
	path: "/proposals",
	tags: ["Proposals"],
	summary: "List all non-archived proposals",
	security: [{ Bearer: [] }],
	request: { query: PaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: ProposalListSchema } },
			description: "List of proposals",
		},
	},
});

app.openapi(listRoute, async (c) => {
	const user = c.get("user");
	const { page, limit, search } = c.req.valid("query");
	const offset = (page - 1) * limit;

	const whereConditions: SQL[] = [isNull(proposals.archivedAt)];

	if (search) {
		whereConditions.push(ilike(proposals.title, `%${search}%`));
	}

	if (user.roleName === ROLE_NAMES.FACULTY) {
		if (user.departmentId !== null) {
			whereConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(proposals.campusId, user.campusId));
		}
	} else if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			whereConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(proposals.campusId, user.campusId));
		}
	}

	const leaderSubquery = db
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
			proposalId: proposals.proposalId,
			campusId: proposals.campusId,
			departmentId: proposals.departmentId,
			title: proposals.title,
			bannerProgram: proposals.bannerProgram,
			projectLocale: proposals.projectLocale,
			extensionCategory: proposals.extensionCategory,
			budgetPartner: proposals.budgetPartner,
			budgetNeust: proposals.budgetNeust,
			status: sql<string>`COALESCE(${projects.projectStatus}, ${proposals.status})`,
			bypassedRetChair: proposals.bypassedRetChair,
			revisionNum: proposals.revisionNum,
			targetStartDate: proposals.targetStartDate,
			targetEndDate: proposals.targetEndDate,
			createdAt: proposals.createdAt,
			updatedAt: proposals.updatedAt,
			archivedAt: proposals.archivedAt,
			leaderFirstName: users.firstName,
			leaderLastName: users.lastName,
			leaderAcademicRank: users.academicRank,
			isMember: sql<boolean>`COALESCE(${userMemberSubquery.isMember}, false)`,
		})
		.from(proposals)
		.leftJoin(projects, eq(proposals.proposalId, projects.proposalId))
		.leftJoin(
			leaderSubquery,
			eq(proposals.proposalId, leaderSubquery.proposalId),
		)
		.leftJoin(users, eq(leaderSubquery.userId, users.userId))
		.leftJoin(
			userMemberSubquery,
			eq(proposals.proposalId, userMemberSubquery.proposalId),
		)
		.where(and(...whereConditions))
		.orderBy(desc(proposals.createdAt))
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) => ({
		...r,
		createdAt: r.createdAt.toISOString(),
		updatedAt: r.updatedAt.toISOString(),
		archivedAt: r.archivedAt?.toISOString() ?? null,
		targetStartDate: r.targetStartDate?.toISOString() ?? null,
		targetEndDate: r.targetEndDate?.toISOString() ?? null,
	}));

	const [totalResult] = await db
		.select({ value: count() })
		.from(proposals)
		.where(and(...whereConditions));
	const total = Number(totalResult?.value ?? 0);

	return c.json({ items, total }, 200);
});

// ── GET /proposals/ret/dashboard-stats ──
const retStatsRoute = createRoute({
	method: "get",
	path: "/proposals/ret/dashboard-stats",
	tags: ["Proposals"],
	summary: "Get dashboard stats for RET Chair",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: RETDashboardStatsSchema } },
			description: "RET Chair dashboard stats",
		},
	},
});

app.openapi(retStatsRoute, async (c) => {
	const user = c.get("user");

	if (user.roleName !== ROLE_NAMES.RET_CHAIR) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Only RET Chair can access these stats",
		);
	}

	const whereConditions: SQL[] = [isNull(proposals.archivedAt)];
	if (user.isMainCampus && user.departmentId !== null) {
		whereConditions.push(eq(proposals.departmentId, user.departmentId));
	} else {
		whereConditions.push(eq(proposals.campusId, user.campusId));
	}

	const [pending, approved, denied] = await Promise.all([
		db
			.select({ value: count() })
			.from(proposals)
			.where(
				and(
					...whereConditions,
					eq(proposals.status, PROPOSAL_STATUS.PENDING_REVIEW),
				),
			),
		db
			.select({ value: count() })
			.from(proposals)
			.where(
				and(...whereConditions, eq(proposals.status, PROPOSAL_STATUS.APPROVED)),
			),
		db
			.select({ value: count() })
			.from(proposals)
			.where(
				and(...whereConditions, eq(proposals.status, PROPOSAL_STATUS.REJECTED)),
			),
	]);

	return c.json(
		{
			pendingReview: Number(pending[0]?.value ?? 0),
			approvedProjects: Number(approved[0]?.value ?? 0),
			deniedProjects: Number(denied[0]?.value ?? 0),
		},
		200,
	);
});

// ── GET /proposals/:id ──
const getRoute = createRoute({
	method: "get",
	path: "/proposals/{id}",
	tags: ["Proposals"],
	summary: "Get a proposal by ID",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: ProposalSchema } },
			description: "Proposal detail",
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

	const whereConditions: SQL[] = [
		eq(proposals.proposalId, id),
		isNull(proposals.archivedAt),
	];

	if (user.roleName === ROLE_NAMES.FACULTY) {
		if (user.departmentId !== null) {
			whereConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(proposals.campusId, user.campusId));
		}
	} else if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			whereConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(proposals.campusId, user.campusId));
		}
	}

	const [row] = await db
		.select({
			proposalId: proposals.proposalId,
			campusId: proposals.campusId,
			departmentId: proposals.departmentId,
			title: proposals.title,
			bannerProgram: proposals.bannerProgram,
			projectLocale: proposals.projectLocale,
			extensionCategory: proposals.extensionCategory,
			budgetPartner: proposals.budgetPartner,
			budgetNeust: proposals.budgetNeust,
			status: proposals.status,
			bypassedRetChair: proposals.bypassedRetChair,
			revisionNum: proposals.revisionNum,
			targetStartDate: proposals.targetStartDate,
			targetEndDate: proposals.targetEndDate,
			createdAt: proposals.createdAt,
			updatedAt: proposals.updatedAt,
			archivedAt: proposals.archivedAt,
		})
		.from(proposals)
		.where(and(...whereConditions))
		.limit(1);

	if (!row) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	return c.json(
		{
			...row,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			archivedAt: row.archivedAt?.toISOString() ?? null,
			targetStartDate: row.targetStartDate?.toISOString() ?? null,
			targetEndDate: row.targetEndDate?.toISOString() ?? null,
		},
		200,
	);
});

// ── GET /proposals/:id/derived-state ──
const DerivedStateSchema = z
	.object({
		state: z.enum(["ACT", "WAIT", "WATCH"]),
		owner: z.string(),
		reason: z.string(),
		nextTransition: z.string(),
	})
	.openapi("DerivedState");

const derivedStateRoute = createRoute({
	method: "get",
	path: "/proposals/{id}/derived-state",
	tags: ["Proposals"],
	summary: "Get the derived Act/Wait/Watch state for a proposal",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: DerivedStateSchema } },
			description: "Derived state of the proposal",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Proposal not found",
		},
	},
});

app.openapi(derivedStateRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");

	const whereConditions: SQL[] = [
		eq(proposals.proposalId, id),
		isNull(proposals.archivedAt),
	];

	if (user.roleName === ROLE_NAMES.FACULTY) {
		if (user.departmentId !== null) {
			whereConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(proposals.campusId, user.campusId));
		}
	} else if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			whereConditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			whereConditions.push(eq(proposals.campusId, user.campusId));
		}
	}

	const leaderSubquery = db
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
			status: proposals.status,
			bypassedRetChair: proposals.bypassedRetChair,
			leaderId: leaderSubquery.userId,
			campusId: proposals.campusId,
			departmentId: proposals.departmentId,
		})
		.from(proposals)
		.leftJoin(
			leaderSubquery,
			eq(proposals.proposalId, leaderSubquery.proposalId),
		)
		.where(and(...whereConditions))
		.limit(1);

	if (!row) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	// Fetch whether the user has reviewed this proposal
	const [review] = await db
		.select({ reviewId: proposalReviews.reviewId })
		.from(proposalReviews)
		.where(
			and(
				eq(proposalReviews.proposalId, id),
				eq(proposalReviews.reviewerId, user.userId),
			),
		)
		.limit(1);

	const derived = deriveProposalState(
		{
			status: row.status as ProposalStatus,
			bypassedRetChair: row.bypassedRetChair,
			leaderId: row.leaderId ?? undefined,
			campusId: row.campusId,
			departmentId: row.departmentId,
		},
		user,
		{
			isRtChair: user.roleName === ROLE_NAMES.RET_CHAIR,
			isDirector: user.roleName === ROLE_NAMES.DIRECTOR,
			hasReviewed: !!review,
		},
	);

	return c.json(derived, 200);
});

// ── POST /proposals ──
const createProposalRoute = createRoute({
	method: "post",
	path: "/proposals",
	tags: ["Proposals"],
	summary:
		"Create a new proposal with optional departments, beneficiaries, and SDGs",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CreateProposalSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: ProposalSchema } },
			description: "Proposal created",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Validation error",
		},
	},
});

app.openapi(createProposalRoute, async (c) => {
	const user = c.get("user");
	const body = c.req.valid("json");

	// Scope check: campusId/departmentId must match the creator's own campus/department
	if (
		user.roleName === ROLE_NAMES.FACULTY ||
		user.roleName === ROLE_NAMES.RET_CHAIR
	) {
		if (body.campusId !== user.campusId) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"You can only create proposals for your own campus",
			);
		}
		if (user.departmentId !== null && body.departmentId !== user.departmentId) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"You can only create proposals for your own department",
			);
		}
	}

	// DFD 4.1: Check for duplicate title (case-insensitive)
	const [duplicate] = await db
		.select({ proposalId: proposals.proposalId, title: proposals.title })
		.from(proposals)
		.where(ilike(proposals.title, body.title))
		.limit(1);

	if (duplicate) {
		throw new ApiError(
			409,
			"DUPLICATE_TITLE",
			"A proposal with this title already exists",
		);
	}

	const created = await db.transaction(async (tx) => {
		const [proposal] = await tx
			.insert(proposals)
			.values({
				campusId: body.campusId,
				departmentId: body.departmentId,
				title: body.title,
				bannerProgram: body.bannerProgram,
				projectLocale: body.projectLocale,
				extensionCategory: body.extensionCategory,
				budgetPartner: (body.budgetPartner ?? 0).toFixed(2),
				budgetNeust: (body.budgetNeust ?? 0).toFixed(2),
				targetStartDate: body.targetStartDate
					? new Date(body.targetStartDate)
					: null,
				targetEndDate: body.targetEndDate ? new Date(body.targetEndDate) : null,
				// DFD 6.1: RET Chair submissions bypass endorsement, route directly to Director
				bypassedRetChair: user.roleName === ROLE_NAMES.RET_CHAIR,
				status: PROPOSAL_STATUS.DRAFT,
			})
			.returning();

		if (!proposal) {
			throw new ApiError(500, "INSERT_FAILED", "Failed to create proposal");
		}

		// Add team members (including the creator as Project Leader if not already specified)
		const memberValues = (body.members ?? []).map((m) => ({
			proposalId: proposal.proposalId,
			userId: m.userId,
			projectRole: m.projectRole,
		}));

		if (!memberValues.some((m) => m.userId === user.userId)) {
			memberValues.push({
				proposalId: proposal.proposalId,
				userId: user.userId,
				projectRole: PROJECT_LEADER_ROLE,
			});
		}

		await tx.insert(proposalMembers).values(memberValues);

		// Insert collaborating departments
		if (body.departmentIds && body.departmentIds.length > 0) {
			await tx.insert(proposalDepartments).values(
				body.departmentIds.map((deptId) => ({
					proposalId: proposal.proposalId,
					departmentId: deptId,
				})),
			);
		}

		// Insert beneficiary sectors
		let sectorIdsToInsert = body.sectorIds || [];

		if (
			sectorIdsToInsert.length === 0 &&
			body.sectorNames &&
			body.sectorNames.length > 0
		) {
			for (const name of body.sectorNames) {
				const trimmed = name.trim();
				if (!trimmed) continue;

				const [existing] = await tx
					.select({ sectorId: beneficiarySectors.sectorId })
					.from(beneficiarySectors)
					.where(eq(beneficiarySectors.sectorName, trimmed))
					.limit(1);

				if (existing) {
					sectorIdsToInsert.push(existing.sectorId);
				} else {
					const [created] = await tx
						.insert(beneficiarySectors)
						.values({ sectorName: trimmed })
						.returning({ sectorId: beneficiarySectors.sectorId });
					if (created) {
						sectorIdsToInsert.push(created.sectorId);
					}
				}
			}
		}
		if (sectorIdsToInsert.length === 0) {
			const [firstSector] = await tx
				.select({ sectorId: beneficiarySectors.sectorId })
				.from(beneficiarySectors)
				.limit(1);
			if (firstSector) {
				sectorIdsToInsert = [firstSector.sectorId];
			}
		}

		if (sectorIdsToInsert.length > 0) {
			await tx.insert(proposalBeneficiaries).values(
				sectorIdsToInsert.map((sectorId) => ({
					proposalId: proposal.proposalId,
					sectorId,
				})),
			);
		}

		// Insert SDG alignments
		if (body.sdgIds && body.sdgIds.length > 0) {
			await tx.insert(proposalSdgs).values(
				body.sdgIds.map((sdgId) => ({
					proposalId: proposal.proposalId,
					sdgId,
				})),
			);
		}

		return proposal;
	});

	await insertAuditLog({
		userId: user.userId,
		action: `Created and submitted proposal ${created.proposalId}`,
		tableAffected: "proposals",
		ipAddress: getClientIp(c),
	});

	// DFD 4.3: Send submission acknowledgment to project leader
	const leaderMember = (body.members ?? []).find(
		(m) => m.projectRole === PROJECT_LEADER_ROLE,
	);
	const leaderId = leaderMember?.userId ?? user.userId;
	await createNotification({
		recipientId: leaderId,
		type: "proposal",
		title: "Submission Received",
		message: `Your proposal "${created.title}" has been received and is pending review.`,
	}).catch((err) => {
		console.error(
			"[notification] Failed to send submission acknowledgment:",
			err,
		);
	});

	return c.json(
		{
			...created,
			createdAt: created.createdAt.toISOString(),
			updatedAt: created.updatedAt.toISOString(),
			archivedAt: created.archivedAt?.toISOString() ?? null,
		},
		201,
	);
});

// ── PATCH /proposals/:id ──
const updateRoute = createRoute({
	method: "patch",
	path: "/proposals/{id}",
	tags: ["Proposals"],
	summary:
		"Update a proposal (Draft, Returned, Pending Review, or Endorsed; project leader only)",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: { "application/json": { schema: UpdateProposalSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: ProposalSchema } },
			description: "Proposal updated",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Validation error",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not project leader",
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

	const [existing] = await db
		.select()
		.from(proposals)
		.where(and(eq(proposals.proposalId, id), isNull(proposals.archivedAt)))
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	if (
		existing.status !== PROPOSAL_STATUS.DRAFT &&
		existing.status !== PROPOSAL_STATUS.RETURNED &&
		existing.status !== PROPOSAL_STATUS.PENDING_REVIEW &&
		existing.status !== PROPOSAL_STATUS.ENDORSED
	) {
		throw new ApiError(
			400,
			"INVALID_STATUS",
			"Only Draft, Returned, Pending Review, or Endorsed proposals can be updated",
		);
	}

	if (!(await isProjectLeader(id, user.userId))) {
		throw new ApiError(
			403,
			"NOT_LEADER",
			"Only the project leader can update a proposal",
		);
	}

	const updateValues = {
		...(body.title !== undefined ? { title: body.title } : {}),
		...(body.bannerProgram !== undefined
			? { bannerProgram: body.bannerProgram }
			: {}),
		...(body.projectLocale !== undefined
			? { projectLocale: body.projectLocale }
			: {}),
		...(body.extensionCategory !== undefined
			? { extensionCategory: body.extensionCategory }
			: {}),
		...(body.budgetPartner !== undefined
			? { budgetPartner: body.budgetPartner.toFixed(2) }
			: {}),
		...(body.budgetNeust !== undefined
			? { budgetNeust: body.budgetNeust.toFixed(2) }
			: {}),
		updatedAt: new Date(),
	};

	const [updated] = await db
		.update(proposals)
		.set(updateValues)
		.where(
			and(
				eq(proposals.proposalId, id),
				or(
					eq(proposals.status, PROPOSAL_STATUS.DRAFT),
					eq(proposals.status, PROPOSAL_STATUS.RETURNED),
					eq(proposals.status, PROPOSAL_STATUS.PENDING_REVIEW),
					eq(proposals.status, PROPOSAL_STATUS.ENDORSED),
				),
			),
		)
		.returning();

	if (!updated) {
		throw new ApiError(500, "UPDATE_FAILED", "Failed to update proposal");
	}

	if (body.sectorNames && body.sectorNames.length > 0) {
		const sectorIds: number[] = [];
		for (const name of body.sectorNames) {
			const trimmed = name.trim();
			if (!trimmed) continue;

			const [existing] = await db
				.select({ sectorId: beneficiarySectors.sectorId })
				.from(beneficiarySectors)
				.where(eq(beneficiarySectors.sectorName, trimmed))
				.limit(1);

			if (existing) {
				sectorIds.push(existing.sectorId);
			} else {
				const [created] = await db
					.insert(beneficiarySectors)
					.values({ sectorName: trimmed })
					.returning({ sectorId: beneficiarySectors.sectorId });
				if (created) {
					sectorIds.push(created.sectorId);
				}
			}
		}

		if (sectorIds.length > 0) {
			await db
				.delete(proposalBeneficiaries)
				.where(eq(proposalBeneficiaries.proposalId, id));
			await db.insert(proposalBeneficiaries).values(
				sectorIds.map((sectorId) => ({
					proposalId: id,
					sectorId,
				})),
			);
		}
	}

	const diff = captureAuditDiff(
		existing as unknown as Record<string, unknown>,
		updated as unknown as Record<string, unknown>,
		[
			"title",
			"budgetNeust",
			"budgetPartner",
			"targetStartDate",
			"targetEndDate",
		],
	);

	await insertAuditLog({
		userId: user.userId,
		action: `Updated proposal ${id}`,
		tableAffected: "proposals",
		oldValue: diff.oldValue,
		newValue: diff.newValue,
		ipAddress: getClientIp(c),
	});

	return c.json(
		{
			...updated,
			createdAt: updated.createdAt.toISOString(),
			updatedAt: updated.updatedAt.toISOString(),
			archivedAt: updated.archivedAt?.toISOString() ?? null,
		},
		200,
	);
});

// ── POST /proposals/:id/submit ──
const submitRoute = createRoute({
	method: "post",
	path: "/proposals/{id}/submit",
	tags: ["Proposals"],
	summary: "Submit a draft proposal for endorsement (project leader only)",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Proposal submitted",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid state transition",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not project leader",
		},
	},
});

app.openapi(submitRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");

	const [existing] = await db
		.select({ proposalId: proposals.proposalId, status: proposals.status })
		.from(proposals)
		.where(and(eq(proposals.proposalId, id), isNull(proposals.archivedAt)))
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	if (
		existing.status !== PROPOSAL_STATUS.DRAFT &&
		existing.status !== PROPOSAL_STATUS.RETURNED
	) {
		throw new ApiError(
			400,
			"INVALID_STATUS",
			"Only Draft or Returned proposals can be submitted",
		);
	}

	if (!(await isProjectLeader(id, user.userId))) {
		throw new ApiError(403, "NOT_LEADER", "Only the project leader can submit");
	}

	// ── Completeness Checks ──
	// 1. Documents check
	const docs = await db
		.select({ documentId: proposalDocuments.documentId })
		.from(proposalDocuments)
		.where(eq(proposalDocuments.proposalId, id))
		.limit(1);
	if (docs.length === 0) {
		throw new ApiError(
			400,
			"INCOMPLETE_PROPOSAL",
			"At least one proposal PDF document must be uploaded.",
		);
	}

	// 2. Members check
	const members = await db
		.select({
			memberId: proposalMembers.memberId,
			projectRole: proposalMembers.projectRole,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.proposalId, id));
	if (members.length === 0) {
		throw new ApiError(
			400,
			"INCOMPLETE_PROPOSAL",
			"At least one team member must be assigned.",
		);
	}
	if (!members.some((m) => m.projectRole === "Project Leader")) {
		throw new ApiError(
			400,
			"INCOMPLETE_PROPOSAL",
			"At least one team member must have the Project Leader role.",
		);
	}

	// 3. Beneficiary sectors check
	const sectors = await db
		.select({ sectorId: proposalBeneficiaries.sectorId })
		.from(proposalBeneficiaries)
		.where(eq(proposalBeneficiaries.proposalId, id))
		.limit(1);
	if (sectors.length === 0) {
		throw new ApiError(
			400,
			"INCOMPLETE_PROPOSAL",
			"At least one target beneficiary sector must be specified.",
		);
	}

	// 4. SDGs check
	const sdgAlignments = await db
		.select({ sdgId: proposalSdgs.sdgId })
		.from(proposalSdgs)
		.where(eq(proposalSdgs.proposalId, id))
		.limit(1);
	if (sdgAlignments.length === 0) {
		throw new ApiError(
			400,
			"INCOMPLETE_PROPOSAL",
			"At least one Sustainable Development Goal (SDG) alignment must be specified.",
		);
	}

	// 5. Check proposal details: dates
	const [proposalDetails] = await db
		.select({
			targetStartDate: proposals.targetStartDate,
			targetEndDate: proposals.targetEndDate,
		})
		.from(proposals)
		.where(eq(proposals.proposalId, id))
		.limit(1);
	if (!proposalDetails?.targetStartDate || !proposalDetails?.targetEndDate) {
		throw new ApiError(
			400,
			"INCOMPLETE_PROPOSAL",
			"Target start and end dates are required.",
		);
	}
	if (
		new Date(proposalDetails.targetStartDate) >
		new Date(proposalDetails.targetEndDate)
	) {
		throw new ApiError(
			400,
			"INCOMPLETE_PROPOSAL",
			"Target end date must be on or after target start date.",
		);
	}

	const [updated] = await db
		.update(proposals)
		.set({
			status: PROPOSAL_STATUS.PENDING_REVIEW,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(proposals.proposalId, id),
				or(
					eq(proposals.status, PROPOSAL_STATUS.DRAFT),
					eq(proposals.status, PROPOSAL_STATUS.RETURNED),
				),
			),
		)
		.returning();

	if (!updated) {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Proposal state changed since last read",
		);
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Submitted proposal ${id}`,
		tableAffected: "proposals",
		ipAddress: getClientIp(c),
	});

	// DFD 4.3: Send submission acknowledgment to project leader
	const [submitLeader] = await db
		.select({ userId: proposalMembers.userId })
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.proposalId, id),
				eq(proposalMembers.projectRole, PROJECT_LEADER_ROLE),
			),
		)
		.limit(1);

	if (submitLeader?.userId) {
		await createNotification({
			recipientId: submitLeader.userId,
			type: "proposal",
			title: "Submission Received",
			message: `Your proposal has been submitted and is pending review.`,
		}).catch((err) => {
			console.error(
				"[notification] Failed to send submission acknowledgment:",
				err,
			);
		});
	}

	return c.json({ message: "Proposal submitted for endorsement" }, 200);
});

// ── POST /proposals/:id/review ──
const reviewRoute = createRoute({
	method: "post",
	path: "/proposals/{id}/review",
	tags: ["Proposals"],
	summary: "Endorse or Approve a proposal (RET Chair / Director)",
	description:
		"EC-01: Prevents conflict of interest. EC-05: Stacked rejections preserved.",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: { "application/json": { schema: ReviewProposalSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Review recorded",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid transition",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Conflict of interest or wrong role",
		},
	},
});

app.openapi(reviewRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");

	const [existing] = await db
		.select({
			proposalId: proposals.proposalId,
			title: proposals.title,
			status: proposals.status,
			revisionNum: proposals.revisionNum,
			campusId: proposals.campusId,
			departmentId: proposals.departmentId,
		})
		.from(proposals)
		.where(and(eq(proposals.proposalId, id), isNull(proposals.archivedAt)))
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	const [leader] = await db
		.select({ userId: proposalMembers.userId })
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.proposalId, id),
				eq(proposalMembers.projectRole, PROJECT_LEADER_ROLE),
			),
		)
		.limit(1);

	// EC-01: Conflict of interest — reviewer cannot be the project leader
	if (await isProjectLeader(id, user.userId)) {
		throw new ApiError(
			403,
			"CONFLICT_OF_INTEREST",
			"You cannot review your own proposal (EC-01)",
		);
	}

	// Scope check: RET Chair can only review proposals within their scope
	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			if (existing.departmentId !== user.departmentId) {
				throw new ApiError(
					403,
					"FORBIDDEN",
					"You can only review proposals from your department",
				);
			}
		} else {
			if (existing.campusId !== user.campusId) {
				throw new ApiError(
					403,
					"FORBIDDEN",
					"You can only review proposals from your campus",
				);
			}
		}
	}

	// Determine the review stage and validate role/status
	let reviewStage: string;
	let newStatus: string;

	// Fetch bypassedRetChair flag for routing decisions
	const [bypassRow] = await db
		.select({ bypassedRetChair: proposals.bypassedRetChair })
		.from(proposals)
		.where(and(eq(proposals.proposalId, id), isNull(proposals.archivedAt)))
		.limit(1);

	if (
		user.roleName === ROLE_NAMES.RET_CHAIR &&
		existing.status === PROPOSAL_STATUS.PENDING_REVIEW
	) {
		if (bypassRow?.bypassedRetChair) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"RET Chair review is bypassed for this proposal",
			);
		}
		reviewStage = REVIEW_STAGE.ENDORSEMENT;
		if (body.decision === REVIEW_DECISION.ENDORSED) {
			newStatus = PROPOSAL_STATUS.ENDORSED;
		} else if (body.decision === REVIEW_DECISION.RETURNED) {
			newStatus = PROPOSAL_STATUS.RETURNED;
		} else if (body.decision === REVIEW_DECISION.REJECTED) {
			newStatus = PROPOSAL_STATUS.REJECTED;
		} else {
			throw new ApiError(
				400,
				"INVALID_DECISION",
				"RET Chair can only Endorse, Return, or Reject at this stage",
			);
		}
	} else if (
		user.roleName === ROLE_NAMES.DIRECTOR &&
		existing.status === PROPOSAL_STATUS.ENDORSED
	) {
		// SYS-REQ-02.3: Director can only approve after endorsement
		reviewStage = REVIEW_STAGE.APPROVAL;
		if (body.decision === REVIEW_DECISION.APPROVED) {
			newStatus = PROPOSAL_STATUS.APPROVED;
		} else if (body.decision === REVIEW_DECISION.RETURNED) {
			newStatus = PROPOSAL_STATUS.RETURNED;
		} else if (body.decision === REVIEW_DECISION.REJECTED) {
			newStatus = PROPOSAL_STATUS.REJECTED;
		} else {
			throw new ApiError(
				400,
				"INVALID_DECISION",
				"Director can only Approve, Return, or Reject at this stage",
			);
		}
	} else if (
		user.roleName === ROLE_NAMES.DIRECTOR &&
		existing.status === PROPOSAL_STATUS.PENDING_REVIEW &&
		bypassRow?.bypassedRetChair
	) {
		// Bypassed RET Chair: Director can approve a Pending Review proposal directly
		// when the proposal previously cleared endorsement but was returned by Director
		reviewStage = REVIEW_STAGE.APPROVAL;
		if (body.decision === REVIEW_DECISION.APPROVED) {
			newStatus = PROPOSAL_STATUS.APPROVED;
		} else if (body.decision === REVIEW_DECISION.RETURNED) {
			newStatus = PROPOSAL_STATUS.RETURNED;
		} else if (body.decision === REVIEW_DECISION.REJECTED) {
			newStatus = PROPOSAL_STATUS.REJECTED;
		} else {
			throw new ApiError(
				400,
				"INVALID_DECISION",
				"Director can only Approve, Return, or Reject at this stage",
			);
		}
	} else {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Cannot review proposal in its current state with your role",
		);
	}

	// EC-04: When returned, increment revision number (docs are preserved)
	const revisionIncrement = newStatus === PROPOSAL_STATUS.RETURNED ? 1 : 0;

	// DFD 6.1: When Director returns an Endorsed proposal, set bypassedRetChair
	// so subsequent resubmissions route directly to Director (skip RET Chair)
	const isDirectorReturningEndorsed =
		user.roleName === ROLE_NAMES.DIRECTOR &&
		existing.status === PROPOSAL_STATUS.ENDORSED &&
		newStatus === PROPOSAL_STATUS.RETURNED;

	await db.transaction(async (tx) => {
		// EC-05: Always insert a new review entry (never overwrite)
		await tx.insert(proposalReviews).values({
			proposalId: id,
			reviewerId: user.userId,
			reviewStage,
			decision: body.decision,
			comments: body.comments ?? null,
		});

		const [updated] = await tx
			.update(proposals)
			.set({
				status: newStatus,
				revisionNum: existing.revisionNum + revisionIncrement,
				updatedAt: new Date(),
				...(isDirectorReturningEndorsed ? { bypassedRetChair: true } : {}),
			})
			.where(
				and(
					eq(proposals.proposalId, id),
					eq(proposals.status, existing.status),
				),
			)
			.returning();

		if (!updated) {
			throw new ApiError(
				400,
				"INVALID_STATE",
				"Proposal state changed since last read",
			);
		}

		if (newStatus === PROPOSAL_STATUS.APPROVED) {
			const [existingProject] = await tx
				.select({ projectId: projects.projectId })
				.from(projects)
				.where(eq(projects.proposalId, id))
				.limit(1);

			if (!existingProject) {
				await tx.insert(projects).values({
					proposalId: id,
					projectStatus: "Approved",
				});
			}
		}
	});

	await insertAuditLog({
		userId: user.userId,
		action: `Reviewed proposal ${id}: ${body.decision}`,
		tableAffected: "proposal_reviews",
		ipAddress: getClientIp(c),
	});

	if (leader?.userId) {
		let title = "Proposal Update";
		let message = `Your proposal "${existing.title}" status has been updated to ${newStatus}.`;

		if (newStatus === PROPOSAL_STATUS.ENDORSED) {
			title = "Proposal Endorsed";
			message = `Your proposal "${existing.title}" has been endorsed by the RET Chair and forwarded to the Director for approval.`;
		} else if (newStatus === PROPOSAL_STATUS.APPROVED) {
			title = "Proposal Approved";
			message = `Your proposal "${existing.title}" has been approved by the Director.`;
		} else if (newStatus === PROPOSAL_STATUS.RETURNED) {
			title = "Proposal Returned";
			message = `Your proposal "${existing.title}" has been returned by the ${user.roleName} for revisions. Comments: ${body.comments || "No comments left."}`;
		} else if (newStatus === PROPOSAL_STATUS.REJECTED) {
			title = "Proposal Rejected";
			message = `Your proposal "${existing.title}" has been rejected. Comments: ${body.comments || "No comments left."}`;
		}

		await createNotification({
			recipientId: leader.userId,
			type: "proposal",
			title,
			message,
			sendEmail: true,
		}).catch((err) => {
			console.error(
				"[notification] Failed to create evaluation notification:",
				err,
			);
		});
	}

	return c.json({ message: `Proposal ${body.decision.toLowerCase()}` }, 200);
});

// ── GET /proposals/metadata/sdgs ──
const listSdgsRoute = createRoute({
	method: "get",
	path: "/proposals/metadata/sdgs",
	tags: ["Proposals"],
	summary: "List all SDGs",
	responses: {
		200: {
			description: "SDG list",
		},
	},
});

app.openapi(listSdgsRoute, async (c) => {
	const rows = await db
		.select({
			sdgId: sdgs.sdgId,
			sdgName: sdgs.sdgTitle,
		})
		.from(sdgs)
		.orderBy(sdgs.sdgId);

	return c.json(rows, 200);
});

// ── GET /proposals/metadata/sectors ──
const listSectorsRoute = createRoute({
	method: "get",
	path: "/proposals/metadata/sectors",
	tags: ["Proposals"],
	summary: "List all beneficiary sectors",
	responses: {
		200: {
			description: "Sectors list",
		},
	},
});

app.openapi(listSectorsRoute, async (c) => {
	const rows = await db
		.select({
			sectorId: beneficiarySectors.sectorId,
			sectorName: beneficiarySectors.sectorName,
		})
		.from(beneficiarySectors)
		.orderBy(beneficiarySectors.sectorName);

	return c.json(rows, 200);
});

// ── GET /proposals/metadata/requirements ──
const listRequirementsRoute = createRoute({
	method: "get",
	path: "/proposals/metadata/requirements",
	tags: ["Proposals"],
	summary: "List proposal submission checklist requirements",
	responses: {
		200: {
			description: "Requirements checklist metadata",
		},
	},
});

app.openapi(listRequirementsRoute, (c) => {
	const requirements = {
		documents: [
			{
				type: "proposal_pdf",
				label: "Project Proposal PDF",
				required: true,
				description: "Official project proposal document in PDF format.",
			},
		],
		members: {
			required: true,
			description:
				"At least one team member with Project Leader role is required.",
		},
		sectors: {
			required: true,
			description: "At least one target beneficiary sector must be specified.",
		},
		sdgs: {
			required: true,
			description:
				"At least one Sustainable Development Goal (SDG) alignment is required.",
		},
		budget: {
			required: true,
			description:
				"Budget values for partner and university share must be non-negative.",
		},
		dates: {
			required: true,
			description:
				"Target start and end dates are required. End date must be on or after start date.",
		},
	};

	return c.json(requirements, 200);
});

// ── Comments API Endpoints ──

// --- Comments Schemas ---
const CommentParams = z.object({
	id: z
		.string()
		.uuid()
		.openapi({ param: { name: "id", in: "path" } }),
	docId: z
		.string()
		.uuid()
		.openapi({ param: { name: "docId", in: "path" } }),
});

const CreateCommentSchema = z
	.object({
		content: z.string().min(1),
		annotationJson: z
			.object({
				x: z.number(),
				y: z.number(),
				width: z.number(),
				height: z.number(),
				page: z.number(),
			})
			.nullable()
			.optional(),
	})
	.openapi("CreateComment");

const CommentUserSchema = z.object({
	userId: z.string().uuid(),
	name: z.string(),
	email: z.string(),
	roleName: z.string(),
});

const CommentResponseSchema = z
	.object({
		commentId: z.string().uuid(),
		proposalId: z.string().uuid(),
		documentId: z.string().uuid(),
		userId: z.string().uuid(),
		content: z.string(),
		annotationJson: z
			.object({
				x: z.number(),
				y: z.number(),
				width: z.number(),
				height: z.number(),
				page: z.number(),
			})
			.nullable(),
		createdAt: z.string(),
		user: CommentUserSchema,
	})
	.openapi("CommentResponse");

const CommentListSchema = z.array(CommentResponseSchema).openapi("CommentList");

// --- Comments Routes ---
const createCommentRoute = createRoute({
	method: "post",
	path: "/proposals/{id}/documents/{docId}/comments",
	tags: ["Proposals"],
	summary: "Add a spatial comment/annotation to a document",
	security: [{ Bearer: [] }],
	request: {
		params: CommentParams,
		body: {
			content: { "application/json": { schema: CreateCommentSchema } },
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: CommentResponseSchema } },
			description: "Comment created",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Proposal or document not found",
		},
	},
});

const listCommentsRoute = createRoute({
	method: "get",
	path: "/proposals/{id}/documents/{docId}/comments",
	tags: ["Proposals"],
	summary: "Get all comments/annotations for a document",
	security: [{ Bearer: [] }],
	request: {
		params: CommentParams,
	},
	responses: {
		200: {
			content: { "application/json": { schema: CommentListSchema } },
			description: "List of comments",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Document not found",
		},
	},
});

app.openapi(createCommentRoute, async (c) => {
	const user = c.get("user");
	const { id: proposalId, docId: documentId } = c.req.valid("param");
	const { content, annotationJson } = c.req.valid("json");

	// Verify the proposal exists
	const [proposal] = await db
		.select({
			proposalId: proposals.proposalId,
			bypassedRetChair: proposals.bypassedRetChair,
		})
		.from(proposals)
		.where(eq(proposals.proposalId, proposalId))
		.limit(1);

	if (!proposal) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	if (user.roleName === ROLE_NAMES.RET_CHAIR && proposal.bypassedRetChair) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"RET Chair review is bypassed for this proposal",
		);
	}

	const [newComment] = await db
		.insert(proposalComments)
		.values({
			documentId,
			userId: user.userId,
			content,
			annotationJson: annotationJson ?? null,
		})
		.returning();

	if (!newComment) {
		throw new ApiError(500, "INSERT_FAILED", "Failed to create comment");
	}

	return c.json(
		{
			commentId: newComment.commentId,
			proposalId,
			documentId: newComment.documentId,
			userId: newComment.userId,
			content: newComment.content,
			annotationJson: newComment.annotationJson,
			createdAt: newComment.createdAt.toISOString(),
			user: {
				userId: user.userId,
				name: `${user.firstName} ${user.lastName}`.trim(),
				email: user.email,
				roleName: user.roleName,
			},
		},
		201,
	);
});

app.openapi(listCommentsRoute, async (c) => {
	const { docId: documentId } = c.req.valid("param");

	const rows = await db
		.select({
			commentId: proposalComments.commentId,
			proposalId: proposalDocuments.proposalId,
			documentId: proposalComments.documentId,
			userId: proposalComments.userId,
			content: proposalComments.content,
			annotationJson: proposalComments.annotationJson,
			createdAt: proposalComments.createdAt,
			userFirstName: users.firstName,
			userLastName: users.lastName,
			userEmail: users.email,
			userRoleName: roles.roleName,
		})
		.from(proposalComments)
		.innerJoin(
			proposalDocuments,
			eq(proposalComments.documentId, proposalDocuments.documentId),
		)
		.innerJoin(users, eq(proposalComments.userId, users.userId))
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.where(eq(proposalComments.documentId, documentId))
		.orderBy(desc(proposalComments.createdAt));

	return c.json(
		rows.map((row) => ({
			commentId: row.commentId,
			proposalId: row.proposalId,
			documentId: row.documentId,
			userId: row.userId,
			content: row.content,
			annotationJson: row.annotationJson,
			createdAt: row.createdAt.toISOString(),
			user: {
				userId: row.userId,
				name: `${row.userFirstName} ${row.userLastName}`.trim(),
				email: row.userEmail,
				roleName: row.userRoleName,
			},
		})),
		200,
	);
});

export default app;
