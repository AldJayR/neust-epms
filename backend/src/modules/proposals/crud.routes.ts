import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
	and,
	count,
	desc,
	eq,
	ilike,
	isNotNull,
	isNull,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "@/db/client.js";
import { beneficiarySectors } from "@/db/schema/beneficiary-sectors.js";
import { projects } from "@/db/schema/projects.js";
import { proposalReviews } from "@/db/schema/proposal-reviews.js";
import { proposals } from "@/db/schema/proposals.js";
import { sdgs } from "@/db/schema/sdgs.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { captureAuditDiff } from "@/lib/audit-diff.js";
import { getClientIp } from "@/lib/client-ip.js";
import { deriveProposalState } from "@/lib/derived-states.js";
import { ApiError } from "@/lib/errors.js";
import { getLeaderSubquery } from "@/lib/leader-subquery.js";
import { createNotification } from "@/lib/notification.helpers.js";
import { ErrorSchema, MessageSchema } from "@/lib/schemas.js";
import {
	buildProposalScope,
	buildProposalScopeClause,
} from "@/lib/scope-helpers.js";
import {
	PROPOSAL_STATUS,
	type ProposalStatus,
	ROLE_NAMES,
} from "@/lib/types.js";
import type { AuthEnv } from "@/middleware/auth.js";
import { PROJECT_LEADER_ROLE } from "@/services/auth-user.service.js";
import {
	CreateProposalSchema,
	DerivedStateSchema,
	ParamId,
	ProposalListSchema,
	ProposalPaginationQuery,
	ProposalSchema,
	RETDashboardStatsSchema,
	UpdateProposalSchema,
} from "./proposals.schema.js";
import {
	checkDuplicateTitle,
	createProposalInTransaction,
	getUserMemberSubquery,
	updateProposalWithSectors,
} from "./proposals.service.js";

const app = new OpenAPIHono<AuthEnv>();

// ── GET /proposals ──
const listRoute = createRoute({
	method: "get",
	path: "/proposals",
	tags: ["Proposals"],
	summary: "List all non-archived proposals",
	security: [{ Bearer: [] }],
	request: { query: ProposalPaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: ProposalListSchema } },
			description: "List of proposals",
		},
	},
});

app.openapi(listRoute, async (c) => {
	const user = c.get("user");
	const { page, limit, search, archived } = c.req.valid("query");
	const offset = (page - 1) * limit;
	const showArchived = archived === "true";

	const whereConditions: SQL[] = [
		showArchived
			? isNotNull(proposals.archivedAt)
			: isNull(proposals.archivedAt),
	];

	if (search) {
		whereConditions.push(ilike(proposals.title, `%${search}%`));
	}

	const scopeClause = buildProposalScopeClause(user);
	if (scopeClause) whereConditions.push(scopeClause);

	const leaderSubquery = getLeaderSubquery();
	const userMemberSubquery = getUserMemberSubquery(user.userId);

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

	const whereConditions: SQL[] = [...buildProposalScope(user)];

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
		...buildProposalScope(user),
	];

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
		...buildProposalScope(user),
	];

	const leaderSubquery = getLeaderSubquery();

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

	if (await checkDuplicateTitle(body.title)) {
		throw new ApiError(
			409,
			"DUPLICATE_TITLE",
			"A proposal with this title already exists",
		);
	}

	const created = await db.transaction(async (tx) => {
		return createProposalInTransaction(tx, body, user);
	});

	await insertAuditLog({
		userId: user.userId,
		action: `Created and submitted proposal ${created.proposalId}`,
		tableAffected: "proposals",
		ipAddress: getClientIp(c),
	});

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

	const updated = await updateProposalWithSectors(id, body, existing, user);

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

// ── POST /proposals/:id/restore ──
const restoreRoute = createRoute({
	method: "post",
	path: "/proposals/{id}/restore",
	tags: ["Proposals"],
	summary: "Restore an archived proposal",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Proposal restored",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found",
		},
	},
});

app.openapi(restoreRoute, async (c) => {
	const { id } = c.req.valid("param");

	const [updated] = await db
		.update(proposals)
		.set({ archivedAt: null, updatedAt: new Date() })
		.where(eq(proposals.proposalId, id))
		.returning();

	if (!updated) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	return c.json({ message: "Proposal restored successfully" }, 200);
});

export default app;
