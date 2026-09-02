import {
	and,
	asc,
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
import { sdgs } from "@/db/schema/sdgs.js";
import { users } from "@/db/schema/users.js";
import { randomUUID } from "node:crypto";
import { insertAuditLog } from "@/lib/audit.js";
import { captureAuditDiff } from "@/lib/audit-diff.js";
import { ApiError } from "@/lib/errors.js";
import { createNotification } from "@/lib/notification.helpers.js";
import { supabase } from "@/lib/supabase.js";
import {
	type AuthUser,
	PROJECT_STATUS,
	PROPOSAL_STATUS,
	ROLE_NAMES,
} from "@/lib/types.js";
import {
	isProjectLeader,
	PROJECT_LEADER_ROLE,
} from "@/services/auth-user.service.js";
import {
	hashFileSha256,
} from "@/services/file-integrity.service.js";
import {
	isPdfFile,
	sanitizeFilename,
} from "@/services/file.service.js";
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

type ProposalTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type ProposalMemberInput = {
	userId: string;
	projectRole: string;
};

async function synchronizeProposalSdgs(
	tx: ProposalTransaction,
	proposalId: string,
	sdgIds: number[],
) {
	const uniqueSdgIds = [...new Set(sdgIds)];
	if (uniqueSdgIds.length > 0) {
		const validSdgs = await tx
			.select({ sdgId: sdgs.sdgId })
			.from(sdgs)
			.where(inArray(sdgs.sdgId, uniqueSdgIds));

		if (validSdgs.length !== uniqueSdgIds.length) {
			throw new ApiError(
				400,
				"INVALID_SDGS",
				"One or more selected SDGs are invalid.",
			);
		}
	}

	await tx.delete(proposalSdgs).where(eq(proposalSdgs.proposalId, proposalId));

	if (uniqueSdgIds.length > 0) {
		await tx
			.insert(proposalSdgs)
			.values(uniqueSdgIds.map((sdgId) => ({ proposalId, sdgId })));
	}
}

async function synchronizeProposalMembers(
	tx: ProposalTransaction,
	proposalId: string,
	members: ProposalMemberInput[],
	currentUserId: string,
) {
	const normalizedMembers = members.map((member) => ({
		userId: member.userId,
		projectRole: member.projectRole.trim(),
	}));
	const userIds = normalizedMembers.map((member) => member.userId);

	if (userIds.length === 0) {
		throw new ApiError(
			400,
			"INVALID_MEMBERS",
			"A proposal must have at least one team member.",
		);
	}

	if (new Set(userIds).size !== userIds.length) {
		throw new ApiError(
			400,
			"DUPLICATE_MEMBERS",
			"Team members must not be duplicated.",
		);
	}

	const leaderCount = normalizedMembers.filter(
		(member) => member.projectRole === PROJECT_LEADER_ROLE,
	).length;
	if (leaderCount !== 1) {
		throw new ApiError(
			400,
			"INVALID_PROJECT_LEADER",
			"A proposal must have exactly one Project Leader.",
		);
	}

	const currentUserMember = normalizedMembers.find(
		(member) => member.userId === currentUserId,
	);
	if (
		!currentUserMember ||
		currentUserMember.projectRole !== PROJECT_LEADER_ROLE
	) {
		throw new ApiError(
			400,
			"PROJECT_LEADER_REQUIRED",
			"The current project leader must remain the Project Leader.",
		);
	}

	const validUsers = await tx
		.select({ userId: users.userId })
		.from(users)
		.where(
			and(
				inArray(users.userId, userIds),
				eq(users.isActive, true),
				isNull(users.archivedAt),
			),
		);

	if (validUsers.length !== userIds.length) {
		throw new ApiError(
			400,
			"INVALID_MEMBERS",
			"One or more selected team members are unavailable.",
		);
	}

	const existingMembers = await tx
		.select({
			memberId: proposalMembers.memberId,
			userId: proposalMembers.userId,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.proposalId, proposalId));
	const existingByUserId = new Map(
		existingMembers.map((member) => [member.userId, member]),
	);

	await tx
		.update(proposalMembers)
		.set({ archivedAt: new Date() })
		.where(
			and(
				eq(proposalMembers.proposalId, proposalId),
				isNull(proposalMembers.archivedAt),
				notInArray(proposalMembers.userId, userIds),
			),
		);

	for (const member of normalizedMembers) {
		const existingMember = existingByUserId.get(member.userId);
		if (existingMember) {
			await tx
				.update(proposalMembers)
				.set({ projectRole: member.projectRole, archivedAt: null })
				.where(eq(proposalMembers.memberId, existingMember.memberId));
		} else {
			await tx.insert(proposalMembers).values({
				proposalId,
				userId: member.userId,
				projectRole: member.projectRole,
			});
		}
	}
}

export async function getProposalEditData(proposalId: string) {
	const [sdgRows, sectorRows, documentRows, memberRows] = await Promise.all([
		db
			.select({ sdgId: proposalSdgs.sdgId })
			.from(proposalSdgs)
			.where(eq(proposalSdgs.proposalId, proposalId))
			.orderBy(asc(proposalSdgs.sdgId)),
		db
			.select({ sectorName: beneficiarySectors.sectorName })
			.from(proposalBeneficiaries)
			.innerJoin(
				beneficiarySectors,
				eq(proposalBeneficiaries.sectorId, beneficiarySectors.sectorId),
			)
			.where(
				and(
					eq(proposalBeneficiaries.proposalId, proposalId),
					isNull(proposalBeneficiaries.archivedAt),
				),
			)
			.orderBy(asc(beneficiarySectors.sectorName)),
		db
			.select({ documentId: proposalDocuments.documentId })
			.from(proposalDocuments)
			.where(eq(proposalDocuments.proposalId, proposalId))
			.limit(1),
		db
			.select({
				userId: proposalMembers.userId,
				projectRole: proposalMembers.projectRole,
				name: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
			})
			.from(proposalMembers)
			.innerJoin(users, eq(proposalMembers.userId, users.userId))
			.where(
				and(
					eq(proposalMembers.proposalId, proposalId),
					isNull(proposalMembers.archivedAt),
				),
			)
			.orderBy(asc(users.firstName), asc(users.lastName)),
	]);

	return {
		sdgIds: sdgRows.map((row) => row.sdgId),
		beneficiarySectors: sectorRows.map((row) => row.sectorName),
		hasProposalDocument: documentRows.length > 0,
		members: memberRows,
	};
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
		sdgIds?: number[] | undefined;
		members?: ProposalMemberInput[] | undefined;
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

		if (body.sdgIds !== undefined) {
			await synchronizeProposalSdgs(tx, id, body.sdgIds);
		}

		if (body.members !== undefined) {
			await synchronizeProposalMembers(tx, id, body.members, user.userId);
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

export async function recordInstitutionalApproval(
	user: AuthUser,
	proposalId: string,
	file: File,
	ipAddress: string,
) {
	if (user.roleName !== ROLE_NAMES.DIRECTOR) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Only the Director can record institutional approval",
		);
	}

	const [proposal] = await db
		.select({
			proposalId: proposals.proposalId,
			title: proposals.title,
			status: proposals.status,
		})
		.from(proposals)
		.where(
			and(eq(proposals.proposalId, proposalId), isNull(proposals.archivedAt)),
		)
		.limit(1);

	if (!proposal) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	if (proposal.status !== PROPOSAL_STATUS.APPROVED) {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Proposal must be in Approved status before recording institutional approval",
		);
	}

	if (!isPdfFile(file)) {
		throw new ApiError(
			422,
			"INVALID_FILE_TYPE",
			"The uploaded file must be a valid PDF document",
		);
	}

	const sanitizedFilename = sanitizeFilename(file.name);
	const storagePath = `proposals/${proposalId}/institutional_approval_${Date.now()}_${randomUUID()}_${sanitizedFilename}`;
	const contentHash = await hashFileSha256(file);

	const { error: uploadError } = await supabase.storage
		.from("documents")
		.upload(storagePath, file, {
			contentType: file.type,
			upsert: false,
		});

	if (uploadError) {
		throw new ApiError(
			400,
			"UPLOAD_FAILED",
			`Supabase storage upload failed: ${uploadError.message}`,
		);
	}

	await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(proposals)
			.set({
				status: PROPOSAL_STATUS.INSTITUTIONALLY_APPROVED,
				institutionalApprovalDocPath: storagePath,
				institutionalApprovalHash: contentHash,
				institutionalApprovedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(proposals.proposalId, proposalId),
					eq(proposals.status, PROPOSAL_STATUS.APPROVED),
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

		const [existingProject] = await tx
			.select({ projectId: projects.projectId })
			.from(projects)
			.where(eq(projects.proposalId, proposalId))
			.limit(1);

		if (!existingProject) {
			await tx.insert(projects).values({
				proposalId: proposalId,
				projectStatus: PROJECT_STATUS.APPROVED,
			});
		}

		await insertAuditLog(
			{
				userId: user.userId,
				action: `Recorded institutional approval for proposal ${proposalId}`,
				tableAffected: "proposals",
				oldValue: { status: PROPOSAL_STATUS.APPROVED },
				newValue: {
					status: PROPOSAL_STATUS.INSTITUTIONALLY_APPROVED,
					storagePath,
					contentHash,
				},
				ipAddress,
			},
			tx,
		);
	});

	const leaderUserId = await getLeaderUserId(proposalId);
	if (leaderUserId) {
		await createNotification({
			recipientId: leaderUserId,
			type: "proposal",
			title: "Institutional Approval Recorded",
			message: `Your proposal "${proposal.title}" has received final institutional approval and is now ready for project activation.`,
			sendEmail: true,
		}).catch((err) => {
			console.error(
				"[notification] Failed to create institutional approval notification:",
				err,
			);
		});
	}

	return {
		message: "Institutional approval recorded successfully",
		proposalId,
		status: PROPOSAL_STATUS.INSTITUTIONALLY_APPROVED,
		storagePath,
	};
}
