import {
	and,
	eq,
	ilike,
	isNull,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "@/db/client.js";
import { beneficiarySectors } from "@/db/schema/beneficiary-sectors.js";
import { projects } from "@/db/schema/projects.js";
import { proposalBeneficiaries } from "@/db/schema/proposal-beneficiaries.js";
import { proposalDepartments } from "@/db/schema/proposal-departments.js";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposalReviews } from "@/db/schema/proposal-reviews.js";
import { proposalSdgs } from "@/db/schema/proposal-sdgs.js";
import { proposals } from "@/db/schema/proposals.js";
import { ApiError } from "@/lib/errors.js";
import {
	PROPOSAL_STATUS,
	REVIEW_DECISION,
	REVIEW_STAGE,
	ROLE_NAMES,
	type AuthUser,
} from "@/lib/types.js";
import {
	isProjectLeader,
	PROJECT_LEADER_ROLE,
} from "@/services/auth-user.service.js";

// ── Shared helpers ──

export function buildProposalScopeConditions(user: AuthUser): SQL[] {
	const conditions: SQL[] = [];
	if (user.roleName === ROLE_NAMES.FACULTY) {
		if (user.departmentId !== null) {
			conditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			conditions.push(eq(proposals.campusId, user.campusId));
		}
	} else if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			conditions.push(eq(proposals.departmentId, user.departmentId));
		} else {
			conditions.push(eq(proposals.campusId, user.campusId));
		}
	}
	return conditions;
}

export function getLeaderSubquery() {
	return db
		.select({
			proposalId: proposalMembers.proposalId,
			userId: proposalMembers.userId,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.projectRole, "Project Leader"))
		.as("leader_members");
}

export function getUserMemberSubquery(userId: string) {
	return db
		.select({
			proposalId: proposalMembers.proposalId,
			isMember: sql<boolean>`true`.as("is_member"),
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.userId, userId))
		.as("user_member");
}

// ── CRUD operations ──

export async function checkDuplicateTitle(title: string): Promise<boolean> {
	const [duplicate] = await db
		.select({ proposalId: proposals.proposalId })
		.from(proposals)
		.where(ilike(proposals.title, title))
		.limit(1);
	return !!duplicate;
}

export async function createProposalInTransaction(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	body: {
		campusId: number;
		departmentId: number;
		title: string;
		bannerProgram: string;
		projectLocale: string;
		extensionCategory: string;
		budgetPartner?: number | undefined;
		budgetNeust?: number | undefined;
		targetStartDate?: string | undefined;
		targetEndDate?: string | undefined;
		departmentIds?: number[] | undefined;
		sectorIds?: number[] | undefined;
		sectorNames?: string[] | undefined;
		sdgIds?: number[] | undefined;
		members?: { userId: string; projectRole: string }[] | undefined;
	},
	user: AuthUser,
) {
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
			bypassedRetChair: user.roleName === ROLE_NAMES.RET_CHAIR,
			status: PROPOSAL_STATUS.DRAFT,
		})
		.returning();

	if (!proposal) {
		throw new ApiError(500, "INSERT_FAILED", "Failed to create proposal");
	}

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

	if (body.departmentIds && body.departmentIds.length > 0) {
		await tx.insert(proposalDepartments).values(
			body.departmentIds.map((deptId) => ({
				proposalId: proposal.proposalId,
				departmentId: deptId,
			})),
		);
	}

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

	if (body.sdgIds && body.sdgIds.length > 0) {
		await tx.insert(proposalSdgs).values(
			body.sdgIds.map((sdgId) => ({
				proposalId: proposal.proposalId,
				sdgId,
			})),
		);
	}

	return proposal;
}

export async function updateProposalWithSectors(
	id: string,
	body: {
		title?: string | undefined;
		bannerProgram?: string | undefined;
		projectLocale?: string | undefined;
		extensionCategory?: string | undefined;
		budgetPartner?: number | undefined;
		budgetNeust?: number | undefined;
		sectorNames?: string[] | undefined;
	},
	existing: { status: string },
	user: AuthUser,
) {
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

			const [existingSector] = await db
				.select({ sectorId: beneficiarySectors.sectorId })
				.from(beneficiarySectors)
				.where(eq(beneficiarySectors.sectorName, trimmed))
				.limit(1);

			if (existingSector) {
				sectorIds.push(existingSector.sectorId);
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

	return updated;
}

// ── Submit flow ──

export async function validateCompleteness(proposalId: string): Promise<void> {
	const docs = await db
		.select({ documentId: proposalDocuments.documentId })
		.from(proposalDocuments)
		.where(eq(proposalDocuments.proposalId, proposalId))
		.limit(1);
	if (docs.length === 0) {
		throw new ApiError(
			400,
			"INCOMPLETE_PROPOSAL",
			"At least one proposal PDF document must be uploaded.",
		);
	}

	const members = await db
		.select({
			memberId: proposalMembers.memberId,
			projectRole: proposalMembers.projectRole,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.proposalId, proposalId));
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

	const sectors = await db
		.select({ sectorId: proposalBeneficiaries.sectorId })
		.from(proposalBeneficiaries)
		.where(eq(proposalBeneficiaries.proposalId, proposalId))
		.limit(1);
	if (sectors.length === 0) {
		throw new ApiError(
			400,
			"INCOMPLETE_PROPOSAL",
			"At least one target beneficiary sector must be specified.",
		);
	}

	const sdgAlignments = await db
		.select({ sdgId: proposalSdgs.sdgId })
		.from(proposalSdgs)
		.where(eq(proposalSdgs.proposalId, proposalId))
		.limit(1);
	if (sdgAlignments.length === 0) {
		throw new ApiError(
			400,
			"INCOMPLETE_PROPOSAL",
			"At least one Sustainable Development Goal (SDG) alignment must be specified.",
		);
	}

	const [proposalDetails] = await db
		.select({
			targetStartDate: proposals.targetStartDate,
			targetEndDate: proposals.targetEndDate,
		})
		.from(proposals)
		.where(eq(proposals.proposalId, proposalId))
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
}

// ── Review state machine ──

export async function processReview(
	user: AuthUser,
	proposalId: string,
	body: { decision: string; comments?: string | undefined },
): Promise<{ decision: string }> {
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
		.where(
			and(
				eq(proposals.proposalId, proposalId),
				isNull(proposals.archivedAt),
			),
		)
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	if (await isProjectLeader(proposalId, user.userId)) {
		throw new ApiError(
			403,
			"CONFLICT_OF_INTEREST",
			"You cannot review your own proposal (EC-01)",
		);
	}

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

	let reviewStage: string;
	let newStatus: string;

	const [bypassRow] = await db
		.select({ bypassedRetChair: proposals.bypassedRetChair })
		.from(proposals)
		.where(
			and(
				eq(proposals.proposalId, proposalId),
				isNull(proposals.archivedAt),
			),
		)
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

	const revisionIncrement = newStatus === PROPOSAL_STATUS.RETURNED ? 1 : 0;

	const isDirectorReturningEndorsed =
		user.roleName === ROLE_NAMES.DIRECTOR &&
		existing.status === PROPOSAL_STATUS.ENDORSED &&
		newStatus === PROPOSAL_STATUS.RETURNED;

	await db.transaction(async (tx) => {
		await tx.insert(proposalReviews).values({
			proposalId: proposalId,
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
					eq(proposals.proposalId, proposalId),
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
				.where(eq(projects.proposalId, proposalId))
				.limit(1);

			if (!existingProject) {
				await tx.insert(projects).values({
					proposalId: proposalId,
					projectStatus: "Approved",
				});
			}
		}
	});

	return { decision: body.decision };
}

export async function getLeaderUserId(
	proposalId: string,
): Promise<string | undefined> {
	const [leader] = await db
		.select({ userId: proposalMembers.userId })
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.proposalId, proposalId),
				eq(proposalMembers.projectRole, PROJECT_LEADER_ROLE),
			),
		)
		.limit(1);
	return leader?.userId;
}
