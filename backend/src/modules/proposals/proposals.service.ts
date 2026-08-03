import {
	and,
	eq,
	ilike,
	inArray,
	isNull,
	notInArray,
	or,
	sql,
} from "drizzle-orm";
import { db } from "@/db/client.js";
import { beneficiarySectors } from "@/db/schema/beneficiary-sectors.js";
import { extensionServices } from "@/db/schema/extension-services.js";
import { projects } from "@/db/schema/projects.js";
import { proposalBeneficiaries } from "@/db/schema/proposal-beneficiaries.js";
import { proposalDepartments } from "@/db/schema/proposal-departments.js";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { proposalExtensionServices } from "@/db/schema/proposal-extension-services.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposalReviews } from "@/db/schema/proposal-reviews.js";
import { proposalSdgs } from "@/db/schema/proposal-sdgs.js";
import { proposals } from "@/db/schema/proposals.js";
import { insertAuditLog } from "@/lib/audit.js";
import { captureAuditDiff } from "@/lib/audit-diff.js";
import { ApiError } from "@/lib/errors.js";
import { type AuthUser, PROPOSAL_STATUS, ROLE_NAMES } from "@/lib/types.js";
import {
	isProjectLeader,
	PROJECT_LEADER_ROLE,
} from "@/services/auth-user.service.js";
import { validateBannerProgramForProposal } from "../banner-programs/banner-programs.service.js";
import { validateProposalCompleteness } from "./proposal-completeness.js";
import { resolveReviewPolicy } from "./proposal-review-policy.js";

// ── Shared helpers ──

export function getUserMemberSubquery(userId: string) {
	return db
		.select({
			proposalId: proposalMembers.proposalId,
			isMember: sql<boolean>`true`.as("is_member"),
		})
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.userId, userId),
				isNull(proposalMembers.archivedAt),
			),
		)
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
		bannerProgramId: number;
		projectLocale: string;
		extensionServiceIds: number[];
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
	ipAddress = "127.0.0.1",
) {
	const selectedBannerProgram = await validateBannerProgramForProposal(
		tx,
		body.bannerProgramId,
		body.campusId,
		body.departmentId,
	);
	const extensionServiceRows = await tx
		.select({ extensionServiceId: extensionServices.extensionServiceId })
		.from(extensionServices)
		.where(
			inArray(extensionServices.extensionServiceId, body.extensionServiceIds),
		);

	if (extensionServiceRows.length !== body.extensionServiceIds.length) {
		throw new ApiError(
			400,
			"INVALID_EXTENSION_SERVICES",
			"One or more selected extension services are invalid.",
		);
	}

	const [proposal] = await tx
		.insert(proposals)
		.values({
			campusId: body.campusId,
			departmentId: body.departmentId,
			title: body.title,
			bannerProgramId: selectedBannerProgram.bannerProgramId,
			bannerProgram: selectedBannerProgram.programName,
			projectLocale: body.projectLocale,
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
	if (
		memberValues.filter((member) => member.projectRole === PROJECT_LEADER_ROLE)
			.length > 1
	) {
		throw new ApiError(
			400,
			"MULTIPLE_PROJECT_LEADERS",
			"A proposal can have only one Project Leader",
		);
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

	await tx.insert(proposalExtensionServices).values(
		body.extensionServiceIds.map((extensionServiceId) => ({
			proposalId: proposal.proposalId,
			extensionServiceId,
		})),
	);

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

	await insertAuditLog(
		{
			userId: user.userId,
			action: `Created proposal ${proposal.proposalId}`,
			tableAffected: "proposals",
			ipAddress,
		},
		tx,
	);

	return proposal;
}

export async function updateProposalWithSectors(
	id: string,
	body: {
		title?: string | undefined;
		bannerProgramId?: number | undefined;
		projectLocale?: string | undefined;
		extensionServiceIds?: number[] | undefined;
		budgetPartner?: number | undefined;
		budgetNeust?: number | undefined;
		sectorNames?: string[] | undefined;
	},
	user: AuthUser,
	ipAddress = "127.0.0.1",
) {
	return db.transaction(async (tx) => {
		const [existing] = await tx
			.select()
			.from(proposals)
			.where(and(eq(proposals.proposalId, id), isNull(proposals.archivedAt)))
			.for("update")
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
				"Only Draft or Returned proposals can be updated",
			);
		}

		if (!(await isProjectLeader(id, user.userId, tx))) {
			throw new ApiError(
				403,
				"NOT_LEADER",
				"Only the project leader can update a proposal",
			);
		}

		if (body.extensionServiceIds !== undefined) {
			const serviceRows = await tx
				.select({ extensionServiceId: extensionServices.extensionServiceId })
				.from(extensionServices)
				.where(
					inArray(
						extensionServices.extensionServiceId,
						body.extensionServiceIds,
					),
				);

			if (serviceRows.length !== body.extensionServiceIds.length) {
				throw new ApiError(
					400,
					"INVALID_EXTENSION_SERVICES",
					"One or more selected extension services are invalid.",
				);
			}
		}

		const selectedBannerProgram =
			body.bannerProgramId === undefined
				? null
				: await validateBannerProgramForProposal(
						tx,
						body.bannerProgramId,
						existing.campusId,
						existing.departmentId,
					);

		const updateValues = {
			...(body.title !== undefined ? { title: body.title } : {}),
			...(selectedBannerProgram
				? {
						bannerProgramId: selectedBannerProgram.bannerProgramId,
						bannerProgram: selectedBannerProgram.programName,
					}
				: {}),
			...(body.projectLocale !== undefined
				? { projectLocale: body.projectLocale }
				: {}),
			...(body.budgetPartner !== undefined
				? { budgetPartner: body.budgetPartner.toFixed(2) }
				: {}),
			...(body.budgetNeust !== undefined
				? { budgetNeust: body.budgetNeust.toFixed(2) }
				: {}),
			updatedAt: new Date(),
		};

		const [updated] = await tx
			.update(proposals)
			.set(updateValues)
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
				409,
				"UPDATE_CONFLICT",
				"Proposal changed before it could be updated",
			);
		}

		if (body.sectorNames && body.sectorNames.length > 0) {
			const sectorNames = [
				...new Set(body.sectorNames.map((name) => name.trim()).filter(Boolean)),
			];
			if (sectorNames.length > 0) {
				await tx
					.insert(beneficiarySectors)
					.values(sectorNames.map((sectorName) => ({ sectorName })))
					.onConflictDoNothing();

				const sectors = await tx
					.select({
						sectorId: beneficiarySectors.sectorId,
						sectorName: beneficiarySectors.sectorName,
					})
					.from(beneficiarySectors)
					.where(inArray(beneficiarySectors.sectorName, sectorNames));
				const sectorIds = sectors.map((sector) => sector.sectorId);

				await tx
					.update(proposalBeneficiaries)
					.set({ archivedAt: new Date() })
					.where(
						and(
							eq(proposalBeneficiaries.proposalId, id),
							isNull(proposalBeneficiaries.archivedAt),
							notInArray(proposalBeneficiaries.sectorId, sectorIds),
						),
					);

				await tx
					.update(proposalBeneficiaries)
					.set({ archivedAt: null })
					.where(
						and(
							eq(proposalBeneficiaries.proposalId, id),
							inArray(proposalBeneficiaries.sectorId, sectorIds),
						),
					);

				const existingLinks = await tx
					.select({ sectorId: proposalBeneficiaries.sectorId })
					.from(proposalBeneficiaries)
					.where(eq(proposalBeneficiaries.proposalId, id));
				const existingIds = new Set(existingLinks.map((link) => link.sectorId));
				const newSectorIds = sectorIds.filter(
					(sectorId) => !existingIds.has(sectorId),
				);
				if (newSectorIds.length > 0) {
					await tx
						.insert(proposalBeneficiaries)
						.values(
							newSectorIds.map((sectorId) => ({ proposalId: id, sectorId })),
						);
				}
			}
		}

		if (body.extensionServiceIds !== undefined) {
			const serviceIds = [...new Set(body.extensionServiceIds)];
			await tx
				.update(proposalExtensionServices)
				.set({ archivedAt: new Date() })
				.where(
					and(
						eq(proposalExtensionServices.proposalId, id),
						isNull(proposalExtensionServices.archivedAt),
						notInArray(
							proposalExtensionServices.extensionServiceId,
							serviceIds,
						),
					),
				);

			await tx
				.update(proposalExtensionServices)
				.set({ archivedAt: null })
				.where(
					and(
						eq(proposalExtensionServices.proposalId, id),
						inArray(proposalExtensionServices.extensionServiceId, serviceIds),
					),
				);

			const existingLinks = await tx
				.select({
					extensionServiceId: proposalExtensionServices.extensionServiceId,
				})
				.from(proposalExtensionServices)
				.where(eq(proposalExtensionServices.proposalId, id));
			const existingIds = new Set(
				existingLinks.map((link) => link.extensionServiceId),
			);
			const newServiceIds = serviceIds.filter(
				(serviceId) => !existingIds.has(serviceId),
			);
			if (newServiceIds.length > 0) {
				await tx.insert(proposalExtensionServices).values(
					newServiceIds.map((extensionServiceId) => ({
						proposalId: id,
						extensionServiceId,
					})),
				);
			}
		}

		const diff = captureAuditDiff(
			existing as unknown as Record<string, unknown>,
			updated as unknown as Record<string, unknown>,
			["title", "budgetNeust", "budgetPartner", "updatedAt"],
		);
		await insertAuditLog(
			{
				userId: user.userId,
				action: `Updated proposal ${id}`,
				tableAffected: "proposals",
				oldValue: diff.oldValue,
				newValue: diff.newValue,
				ipAddress,
			},
			tx,
		);

		return updated;
	});
}

export async function getProposalExtensionServices(proposalId: string) {
	const servicesByProposal = await getProposalExtensionServicesByProposalIds([
		proposalId,
	]);
	return servicesByProposal.get(proposalId) ?? [];
}

export async function getProposalExtensionServicesByProposalIds(
	proposalIds: string[],
) {
	const servicesByProposal = new Map<
		string,
		Array<{ extensionServiceId: number; serviceName: string }>
	>();

	if (proposalIds.length === 0) return servicesByProposal;

	const rows = await db
		.select({
			proposalId: proposalExtensionServices.proposalId,
			extensionServiceId: extensionServices.extensionServiceId,
			serviceName: extensionServices.serviceName,
		})
		.from(proposalExtensionServices)
		.innerJoin(
			extensionServices,
			eq(
				proposalExtensionServices.extensionServiceId,
				extensionServices.extensionServiceId,
			),
		)
		.where(
			and(
				inArray(proposalExtensionServices.proposalId, proposalIds),
				isNull(proposalExtensionServices.archivedAt),
			),
		)
		.orderBy(extensionServices.extensionServiceId);

	for (const row of rows) {
		const services = servicesByProposal.get(row.proposalId) ?? [];
		services.push({
			extensionServiceId: row.extensionServiceId,
			serviceName: row.serviceName,
		});
		servicesByProposal.set(row.proposalId, services);
	}

	return servicesByProposal;
}

// ── Submit flow ──

export async function validateCompleteness(proposalId: string): Promise<void> {
	const [
		docs,
		members,
		sectors,
		sdgAlignments,
		extensionServiceAlignments,
		[proposalDetails],
	] = await Promise.all([
		db
			.select({ documentId: proposalDocuments.documentId })
			.from(proposalDocuments)
			.where(eq(proposalDocuments.proposalId, proposalId))
			.limit(1),
		db
			.select({
				memberId: proposalMembers.memberId,
				projectRole: proposalMembers.projectRole,
			})
			.from(proposalMembers)
			.where(
				and(
					eq(proposalMembers.proposalId, proposalId),
					isNull(proposalMembers.archivedAt),
				),
			),
		db
			.select({ sectorId: proposalBeneficiaries.sectorId })
			.from(proposalBeneficiaries)
			.where(
				and(
					eq(proposalBeneficiaries.proposalId, proposalId),
					isNull(proposalBeneficiaries.archivedAt),
				),
			)
			.limit(1),
		db
			.select({ sdgId: proposalSdgs.sdgId })
			.from(proposalSdgs)
			.where(eq(proposalSdgs.proposalId, proposalId))
			.limit(1),
		db
			.select({
				extensionServiceId: proposalExtensionServices.extensionServiceId,
			})
			.from(proposalExtensionServices)
			.where(
				and(
					eq(proposalExtensionServices.proposalId, proposalId),
					isNull(proposalExtensionServices.archivedAt),
				),
			)
			.limit(1),
		db
			.select({
				targetStartDate: proposals.targetStartDate,
				targetEndDate: proposals.targetEndDate,
				bannerProgramId: proposals.bannerProgramId,
			})
			.from(proposals)
			.where(eq(proposals.proposalId, proposalId))
			.limit(1),
	]);

	validateProposalCompleteness({
		documentCount: docs.length,
		members,
		beneficiarySectorCount: sectors.length,
		sdgAlignmentCount: sdgAlignments.length,
		extensionServiceCount: extensionServiceAlignments.length,
		targetStartDate: proposalDetails?.targetStartDate,
		targetEndDate: proposalDetails?.targetEndDate,
		bannerProgramId: proposalDetails?.bannerProgramId,
	});
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
			and(eq(proposals.proposalId, proposalId), isNull(proposals.archivedAt)),
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

	const [bypassRow] = await db
		.select({ bypassedRetChair: proposals.bypassedRetChair })
		.from(proposals)
		.where(
			and(eq(proposals.proposalId, proposalId), isNull(proposals.archivedAt)),
		)
		.limit(1);

	const reviewPolicy = resolveReviewPolicy(
		{
			roleName: user.roleName,
			status: existing.status,
			bypassedRetChair: Boolean(bypassRow?.bypassedRetChair),
		},
		body.decision,
	);

	await db.transaction(async (tx) => {
		await tx.insert(proposalReviews).values({
			proposalId: proposalId,
			reviewerId: user.userId,
			reviewStage: reviewPolicy.reviewStage,
			decision: body.decision,
			comments: body.comments ?? null,
		});

		const [updated] = await tx
			.update(proposals)
			.set({
				status: reviewPolicy.newStatus,
				revisionNum: existing.revisionNum + reviewPolicy.revisionIncrement,
				updatedAt: new Date(),
				...(reviewPolicy.isDirectorReturningEndorsed
					? { bypassedRetChair: true }
					: {}),
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

		if (reviewPolicy.newStatus === PROPOSAL_STATUS.APPROVED) {
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
				isNull(proposalMembers.archivedAt),
			),
		)
		.limit(1);
	return leader?.userId;
}
