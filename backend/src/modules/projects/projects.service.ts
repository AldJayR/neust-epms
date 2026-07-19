import {
	and,
	count,
	desc,
	eq,
	inArray,
	isNotNull,
	isNull,
	or,
	sql,
} from "drizzle-orm";
import { db } from "@/db/client.js";
import { departments } from "@/db/schema/departments.js";
import { moas } from "@/db/schema/moas.js";
import { partners } from "@/db/schema/partners.js";
import { projectReportingMilestones } from "@/db/schema/project-reporting-milestones.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposalReviews } from "@/db/schema/proposal-reviews.js";
import { proposalSdgs } from "@/db/schema/proposal-sdgs.js";
import { proposals } from "@/db/schema/proposals.js";
import { sdgs } from "@/db/schema/sdgs.js";
import { specialOrders } from "@/db/schema/special-orders.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { captureAuditDiff } from "@/lib/audit-diff.js";
import { deriveProjectState } from "@/lib/derived-states.js";
import { ApiError } from "@/lib/errors.js";
import { getLeaderSubquery } from "@/lib/leader-subquery.js";
import { buildProposalScope } from "@/lib/scope-helpers.js";
import { supabase } from "@/lib/supabase.js";
import {
	type AuthUser,
	PROJECT_STATUS,
	PROPOSAL_STATUS,
	type ProjectStatus,
	REPORT_TYPE,
	ROLE_NAMES,
} from "@/lib/types.js";
import { getProposalExtensionServicesByProposalIds } from "@/modules/proposals/proposals.service.js";

// ── CRUD ──

export async function listProjects(
	user: AuthUser,
	opts: { page: number; limit: number; archived?: string | undefined },
) {
	const { page, limit, archived } = opts;
	const offset = (page - 1) * limit;
	const showArchived = archived === "true";

	const proposalConditions = buildProposalScope(user);

	const allowedProposals = db
		.select({ proposalId: proposals.proposalId })
		.from(proposals)
		.where(and(...proposalConditions));

	const leaderMembers = getLeaderSubquery();

	const userMemberSubquery = db
		.select({
			proposalId: proposalMembers.proposalId,
			isMember: sql<boolean>`true`.as("is_member"),
		})
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.userId, user.userId),
				isNull(proposalMembers.archivedAt),
			),
		)
		.as("user_member");

	const [rows, [totalResult]] = await Promise.all([
		db
			.select({
				projectId: projects.projectId,
				proposalId: projects.proposalId,
				moaId: projects.moaId,
				title: proposals.title,
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
			.leftJoin(
				leaderMembers,
				eq(projects.proposalId, leaderMembers.proposalId),
			)
			.leftJoin(users, eq(leaderMembers.userId, users.userId))
			.leftJoin(
				userMemberSubquery,
				eq(projects.proposalId, userMemberSubquery.proposalId),
			)
			.where(
				and(
					showArchived
						? isNotNull(projects.archivedAt)
						: isNull(projects.archivedAt),
					inArray(projects.proposalId, allowedProposals),
				),
			)
			.orderBy(desc(projects.createdAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ value: count() })
			.from(projects)
			.where(
				and(
					showArchived
						? isNotNull(projects.archivedAt)
						: isNull(projects.archivedAt),
					inArray(projects.proposalId, allowedProposals),
				),
			),
	]);

	const items = rows.map((r) => ({
		...r,
		targetStartDate: r.targetStartDate?.toISOString() ?? null,
		targetEndDate: r.targetEndDate?.toISOString() ?? null,
		actualEndDate: r.actualEndDate?.toISOString() ?? null,
		createdAt: r.createdAt.toISOString(),
		updatedAt: r.updatedAt.toISOString(),
		archivedAt: r.archivedAt?.toISOString() ?? null,
	}));
	const extensionServicesByProposal =
		await getProposalExtensionServicesByProposalIds(
			rows.map((row) => row.proposalId),
		);

	const total = Number(totalResult?.value ?? 0);

	return {
		items: items.map((item) => ({
			...item,
			extensionServices: extensionServicesByProposal.get(item.proposalId) ?? [],
		})),
		total,
	};
}

export async function getProjectDerivedState(id: string, user: AuthUser) {
	const proposalConditions = buildProposalScope(user);

	const allowedProposals = db
		.select({ proposalId: proposals.proposalId })
		.from(proposals)
		.where(and(...proposalConditions));

	const leaderMembers = getLeaderSubquery();

	const [[row], [milestone], [report]] = await Promise.all([
		db
			.select({
				projectId: projects.projectId,
				projectStatus: projects.projectStatus,
				moaId: projects.moaId,
				leaderId: leaderMembers.userId,
			})
			.from(projects)
			.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
			.leftJoin(
				leaderMembers,
				eq(projects.proposalId, leaderMembers.proposalId),
			)
			.where(
				and(
					eq(projects.projectId, id),
					isNull(projects.archivedAt),
					inArray(projects.proposalId, allowedProposals),
				),
			)
			.limit(1),
		db
			.select({ milestoneId: projectReportingMilestones.milestoneId })
			.from(projectReportingMilestones)
			.where(eq(projectReportingMilestones.projectId, id))
			.limit(1),
		db
			.select({ reportId: projectReports.reportId })
			.from(projectReports)
			.where(
				and(
					eq(projectReports.projectId, id),
					isNull(projectReports.archivedAt),
				),
			)
			.limit(1),
	]);

	if (!row) {
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	return deriveProjectState(
		{
			projectStatus: row.projectStatus as ProjectStatus,
			moaId: row.moaId,
			reportingSchedule: !!milestone,
			hasReports: !!report,
			leaderId: row.leaderId ?? undefined,
		},
		user,
	);
}

export async function getProjectDetails(id: string, user: AuthUser) {
	const leaderMembers = getLeaderSubquery();

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
		.where(
			and(
				or(eq(proposals.proposalId, id), eq(projects.projectId, id)),
				isNull(proposals.archivedAt),
				isNull(projects.archivedAt),
			),
		);

	if (!row) {
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	// Security check for Faculty / RET Chair
	if (
		user.roleName === ROLE_NAMES.FACULTY ||
		user.roleName === ROLE_NAMES.RET_CHAIR
	) {
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

	const [
		memberRows,
		documentRows,
		reviewRows,
		sdgRows,
		extensionServiceRows,
		specialOrderRows,
	] = await Promise.all([
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
			.where(
				and(
					eq(proposalMembers.proposalId, row.proposalId),
					isNull(proposalMembers.archivedAt),
				),
			),

		db
			.select({
				documentId: proposalDocuments.documentId,
				versionNum: proposalDocuments.versionNum,
				storagePath: proposalDocuments.storagePath,
				uploadedAt: proposalDocuments.uploadedAt,
			})
			.from(proposalDocuments)
			.where(eq(proposalDocuments.proposalId, row.proposalId))
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
			.where(eq(proposalReviews.proposalId, row.proposalId))
			.orderBy(desc(proposalReviews.reviewedAt)),

		db
			.select({
				sdgNumber: sdgs.sdgNumber,
				sdgTitle: sdgs.sdgTitle,
			})
			.from(proposalSdgs)
			.innerJoin(sdgs, eq(proposalSdgs.sdgId, sdgs.sdgId))
			.where(eq(proposalSdgs.proposalId, row.proposalId))
			.orderBy(sdgs.sdgNumber),

		getProposalExtensionServicesByProposalIds([row.proposalId]).then(
			(servicesByProposal) => servicesByProposal.get(row.proposalId) ?? [],
		),

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
			.innerJoin(
				proposalMembers,
				eq(specialOrders.memberId, proposalMembers.memberId),
			)
			.where(
				and(
					eq(proposalMembers.proposalId, row.proposalId),
					isNull(proposalMembers.archivedAt),
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
		const reviewVersion = matchingDoc
			? `v${matchingDoc.versionNum}`
			: `v${row.revisionNum}`;

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

	const attachments = await Promise.all(
		documentRows.map(async (doc) => {
			const { data: signedUrlData } = await supabase.storage
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

	return {
		id: row.proposalId,
		title: row.title,
		status: row.projectStatus ?? row.status,
		version: `v${row.revisionNum}`,
		bypassedRetChair: row.bypassedRetChair,
		metadata: {
			leader: {
				name: `${row.leaderFirstName ?? "N/A"} ${row.leaderLastName ?? "N/A"}`.trim(),
			},
			departmentCode: row.departmentCode,
			department: row.departmentName,
			duration,
			moaLinked: row.moaPartner || "None",
			sdgs: sdgRows.map((s) => `SDG ${s.sdgNumber}`).join(", ") || undefined,
			extensionServices: extensionServiceRows.map(
				(service) => service.serviceName,
			),
			budget: {
				total: budgetNeust + budgetPartner,
				neust: budgetNeust,
				partner: budgetPartner,
			},
		},
		members,
		history,
		attachments,
	};
}

// ── Status transitions ──

export async function validateTransition(
	project: { projectId: string; projectStatus: string; moaId: string | null },
	targetStatus: string,
) {
	// SYS-REQ-04.1: Require active MOA to transition to "Ongoing"
	if (targetStatus === PROJECT_STATUS.ONGOING) {
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

	if (targetStatus === PROJECT_STATUS.COMPLETED) {
		if (project.projectStatus !== PROJECT_STATUS.ONGOING) {
			throw new ApiError(
				400,
				"INVALID_TRANSITION",
				"Only Ongoing projects can be marked as Completed",
			);
		}
	}
}

export async function transitionProjectStatus(
	projectId: string,
	targetStatus: string,
	user: AuthUser,
	ipAddress: string,
) {
	const [project] = await db
		.select({
			projectId: projects.projectId,
			projectStatus: projects.projectStatus,
			moaId: projects.moaId,
			archivedAt: projects.archivedAt,
		})
		.from(projects)
		.where(and(eq(projects.projectId, projectId), isNull(projects.archivedAt)))
		.limit(1);

	if (!project) {
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	await validateTransition(project, targetStatus);

	const diff = captureAuditDiff(
		{ projectStatus: project.projectStatus },
		{ projectStatus: targetStatus },
		["projectStatus"],
	);

	await db.transaction(async (tx) => {
		await tx
			.update(projects)
			.set({ projectStatus: targetStatus, updatedAt: new Date() })
			.where(eq(projects.projectId, projectId));

		await insertAuditLog(
			{
				userId: user.userId,
				action: `Transitioned project ${projectId} to ${targetStatus}`,
				tableAffected: "projects",
				oldValue: diff.oldValue,
				newValue: diff.newValue,
				ipAddress,
			},
			tx,
		);
	});
}

export async function closeProject(
	projectId: string,
	user: AuthUser,
	ipAddress: string,
) {
	const [project] = await db
		.select({
			projectId: projects.projectId,
			projectStatus: projects.projectStatus,
			proposalId: projects.proposalId,
			archivedAt: projects.archivedAt,
		})
		.from(projects)
		.where(and(eq(projects.projectId, projectId), isNull(projects.archivedAt)))
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

	if (
		project.projectStatus !== PROJECT_STATUS.ONGOING &&
		project.projectStatus !== PROJECT_STATUS.PENDING_CLOSURE
	) {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Only ongoing or pending closure projects can be closed",
		);
	}

	// Verify both required reports exist
	const reports = await db
		.select({ reportType: projectReports.reportType })
		.from(projectReports)
		.where(
			and(
				eq(projectReports.projectId, projectId),
				isNull(projectReports.archivedAt),
				isNotNull(projectReports.storagePath),
			),
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

	const diff = captureAuditDiff(
		{ projectStatus: project.projectStatus },
		{ projectStatus: PROJECT_STATUS.CLOSED },
		["projectStatus"],
	);

	await db.transaction(async (tx) => {
		await tx
			.update(projects)
			.set({
				projectStatus: PROJECT_STATUS.CLOSED,
				actualEndDate: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(projects.projectId, projectId));

		await insertAuditLog(
			{
				userId: user.userId,
				action: `Closed project ${projectId}`,
				tableAffected: "projects",
				oldValue: diff.oldValue,
				newValue: diff.newValue,
				ipAddress,
			},
			tx,
		);
	});
}

export async function setProjectHold(
	projectId: string,
	onHold: boolean,
	user: AuthUser,
	ipAddress: string,
) {
	const [existing] = await db
		.select({ projectId: projects.projectId, onHold: projects.onHold })
		.from(projects)
		.where(and(eq(projects.projectId, projectId), isNull(projects.archivedAt)))
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	if (existing.onHold === onHold) return existing;

	const diff = captureAuditDiff(existing, { ...existing, onHold }, ["onHold"]);
	return db.transaction(async (tx) => {
		const [updated] = await tx
			.update(projects)
			.set({ onHold, updatedAt: new Date() })
			.where(eq(projects.projectId, projectId))
			.returning({ projectId: projects.projectId, onHold: projects.onHold });

		if (!updated) {
			throw new ApiError(500, "UPDATE_FAILED", "Failed to update project hold");
		}

		await insertAuditLog(
			{
				userId: user.userId,
				action: `${onHold ? "Placed" : "Removed"} hold on project ${projectId}`,
				tableAffected: "projects",
				oldValue: diff.oldValue,
				newValue: diff.newValue,
				ipAddress,
			},
			tx,
		);

		return updated;
	});
}

// ── Activate ──

export async function activateProject(
	id: string,
	body: {
		moaId: string;
		milestones: Array<{ reportType: string; dueAt: string }>;
	},
	user: AuthUser,
	ipAddress: string,
) {
	let project:
		| {
				projectId: string;
				projectStatus: string;
				archivedAt: Date | null;
		  }
		| undefined;

	const [existingProject] = await db
		.select({
			projectId: projects.projectId,
			projectStatus: projects.projectStatus,
			archivedAt: projects.archivedAt,
		})
		.from(projects)
		.where(
			and(
				or(eq(projects.projectId, id), eq(projects.proposalId, id)),
				isNull(projects.archivedAt),
			),
		)
		.limit(1);

	project = existingProject;

	if (!project) {
		const [proposal] = await db
			.select({ status: proposals.status })
			.from(proposals)
			.where(eq(proposals.proposalId, id))
			.limit(1);

		if (proposal && proposal.status === PROPOSAL_STATUS.APPROVED) {
			const [newProject] = await db
				.insert(projects)
				.values({
					proposalId: id,
					projectStatus: "Approved",
				})
				.returning({
					projectId: projects.projectId,
					projectStatus: projects.projectStatus,
					archivedAt: projects.archivedAt,
				});
			project = newProject;
		}
	}

	if (!project) {
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	if (project.projectStatus !== PROJECT_STATUS.APPROVED) {
		throw new ApiError(
			400,
			"INVALID_TRANSITION",
			"Only Approved projects can be activated",
		);
	}

	const members = await db
		.select({ memberId: proposalMembers.memberId })
		.from(proposalMembers)
		.innerJoin(proposals, eq(proposalMembers.proposalId, proposals.proposalId))
		.innerJoin(projects, eq(projects.proposalId, proposals.proposalId))
		.where(
			and(
				eq(projects.projectId, project.projectId),
				isNull(proposalMembers.archivedAt),
			),
		);
	if (members.length > 0) {
		const uploadedOrders = await db
			.select({ memberId: specialOrders.memberId })
			.from(specialOrders)
			.where(
				and(
					inArray(
						specialOrders.memberId,
						members.map((member) => member.memberId),
					),
					isNull(specialOrders.archivedAt),
					isNotNull(specialOrders.storagePath),
				),
			);
		if (uploadedOrders.length !== members.length) {
			throw new ApiError(
				400,
				"INCOMPLETE_SPECIAL_ORDERS",
				"Special Orders must be uploaded for every project member before activation",
			);
		}
	}

	// Validate MOA exists and is not expired
	const [moa] = await db
		.select({ moaId: moas.moaId, validUntil: moas.validUntil })
		.from(moas)
		.where(eq(moas.moaId, body.moaId))
		.limit(1);

	if (!moa) {
		throw new ApiError(404, "NOT_FOUND", "MOA not found");
	}

	if (moa.validUntil < new Date()) {
		throw new ApiError(400, "MOA_EXPIRED", "The selected MOA is expired");
	}

	await db.transaction(async (tx) => {
		// Link MOA and transition to Ongoing
		await tx
			.update(projects)
			.set({
				moaId: body.moaId,
				projectStatus: PROJECT_STATUS.ONGOING,
				updatedAt: new Date(),
			})
			.where(eq(projects.projectId, project!.projectId));

		await tx.insert(projectReportingMilestones).values(
			body.milestones.map((milestone) => ({
				projectId: project!.projectId,
				reportType: milestone.reportType,
				dueAt: new Date(milestone.dueAt),
			})),
		);

		await insertAuditLog(
			{
				userId: user.userId,
				action: `Activated project ${project!.projectId} with MOA ${body.moaId}`,
				tableAffected: "projects",
				ipAddress,
			},
			tx,
		);
	});
}

// ── Readiness & schedule ──

export async function getProjectReadiness(id: string) {
	// 1. Get project
	const [project] = await db
		.select({
			projectId: projects.projectId,
			proposalId: projects.proposalId,
			moaId: projects.moaId,
			projectStatus: projects.projectStatus,
		})
		.from(projects)
		.where(
			and(
				or(eq(projects.projectId, id), eq(projects.proposalId, id)),
				isNull(projects.archivedAt),
			),
		)
		.limit(1);

	if (!project) {
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	// 2. Fetch proposal, members, moa, and reporting schedule in parallel
	const [[proposal], pMembers, [moa], milestones] = await Promise.all([
		db
			.select({
				status: proposals.status,
				title: proposals.title,
				createdAt: proposals.createdAt,
				updatedAt: proposals.updatedAt,
			})
			.from(proposals)
			.where(eq(proposals.proposalId, project.proposalId))
			.limit(1),
		db
			.select({ memberId: proposalMembers.memberId })
			.from(proposalMembers)
			.where(
				and(
					eq(proposalMembers.proposalId, project.proposalId),
					isNull(proposalMembers.archivedAt),
				),
			),
		project.moaId
			? db
					.select({ validUntil: moas.validUntil })
					.from(moas)
					.where(and(eq(moas.moaId, project.moaId), isNull(moas.archivedAt)))
					.limit(1)
			: Promise.resolve([]),
		db
			.select({ milestoneId: projectReportingMilestones.milestoneId })
			.from(projectReportingMilestones)
			.where(eq(projectReportingMilestones.projectId, project.projectId)),
	]);

	if (!proposal) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	// Check Proposal Approved
	const isProposalApproved =
		proposal.status === PROPOSAL_STATUS.APPROVED ||
		project.projectStatus !== "Approved";
	const proposalApprovedDate = proposal.updatedAt.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	// 3. Fetch special orders and reporting dates in parallel
	const memberIds = pMembers.map((m) => m.memberId);
	const [sOrders] = await Promise.all([
		memberIds.length > 0
			? db
					.select({ memberId: specialOrders.memberId })
					.from(specialOrders)
					.where(
						and(
							inArray(specialOrders.memberId, memberIds),
							isNull(specialOrders.archivedAt),
							sql`${specialOrders.storagePath} IS NOT NULL`,
						),
					)
			: Promise.resolve([]),
	]);

	const specialOrdersUploadedCount = sOrders.length;
	const isSpecialOrdersComplete =
		pMembers.length > 0 ? specialOrdersUploadedCount === pMembers.length : true;

	// Check Valid MOA Assigned
	let isMoaValid = false;
	let moaValidUntilDate = "";
	if (moa) {
		isMoaValid = new Date(moa.validUntil) > new Date();
		moaValidUntilDate = new Date(moa.validUntil).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	// Check Reporting Schedule Established
	const reportingDatesCount = milestones.length;
	const isScheduleEstablished = reportingDatesCount > 0;

	// Construct prerequisites list
	const prerequisites = [
		{
			name: "Proposal Approved",
			complete: isProposalApproved,
			owner: "Director/Admin",
			details: isProposalApproved
				? `Proposal approved on ${proposalApprovedDate}`
				: "Awaiting proposal approval",
		},
		{
			name: "Special Orders Uploaded",
			complete: isSpecialOrdersComplete,
			owner: "Project Leader",
			details: isSpecialOrdersComplete
				? `All ${pMembers.length} Special Orders uploaded`
				: `${specialOrdersUploadedCount} of ${pMembers.length} Special Orders uploaded`,
		},
		{
			name: "Valid MOA Assigned",
			complete: isMoaValid,
			owner: "Director/Admin",
			details: isMoaValid
				? `MOA valid until ${moaValidUntilDate}`
				: project.moaId
					? "Linked MOA has expired"
					: "No MOA assigned to project",
		},
		{
			name: "Reporting Schedule Established",
			complete: isScheduleEstablished,
			owner: "Director/Admin",
			details: isScheduleEstablished
				? `Reporting schedule configured with ${reportingDatesCount} milestones`
				: "No reporting schedule configured",
		},
	];

	// The MOA and reporting schedule are configured during activation inside the wizard modal,
	// so they do not block the activation process itself.
	const activationPrerequisites = prerequisites.slice(0, 2);
	const blockerItem = activationPrerequisites.find((p) => !p.complete);
	const blocker = blockerItem ? blockerItem.name : null;
	const isReady = activationPrerequisites.every((p) => p.complete);

	return { isReady, prerequisites, blocker };
}

export async function getProjectReportingSchedule(id: string) {
	// 1. Get project
	const [project] = await db
		.select({
			projectId: projects.projectId,
		})
		.from(projects)
		.where(
			and(
				or(eq(projects.projectId, id), eq(projects.proposalId, id)),
				isNull(projects.archivedAt),
			),
		)
		.limit(1);

	if (!project) {
		throw new ApiError(404, "NOT_FOUND", "Project not found");
	}

	const milestones = await db
		.select({
			id: projectReportingMilestones.milestoneId,
			date: projectReportingMilestones.dueAt,
			reportType: projectReportingMilestones.reportType,
			completedAt: projectReportingMilestones.completedAt,
		})
		.from(projectReportingMilestones)
		.where(eq(projectReportingMilestones.projectId, project.projectId))
		.orderBy(projectReportingMilestones.dueAt);
	const reports = await db
		.select({
			milestoneId: projectReports.milestoneId,
			reportId: projectReports.reportId,
			storagePath: projectReports.storagePath,
		})
		.from(projectReports)
		.where(
			and(
				eq(projectReports.projectId, project.projectId),
				isNull(projectReports.archivedAt),
				isNotNull(projectReports.storagePath),
			),
		);

	const mappedMilestones = milestones.map((milestone) => {
		const milestoneReports = reports.filter(
			(report) => report.milestoneId === milestone.id,
		);
		const singleReport =
			milestoneReports.length === 1 ? milestoneReports[0] : null;
		return {
			id: milestone.id,
			date: milestone.date.toISOString(),
			isCompleted: Boolean(milestone.completedAt),
			completedAt: milestone.completedAt?.toISOString() ?? null,
			reportType: milestone.reportType,
			reportId: singleReport?.reportId ?? null,
			storagePath: singleReport?.storagePath ?? null,
		};
	});

	const now = new Date();
	const upcoming = mappedMilestones
		.filter((d) => !d.isCompleted && new Date(d.date) >= now)
		.map((d) => ({
			id: d.id,
			date: d.date,
			reportType: d.reportType,
		}));

	const overdue = mappedMilestones
		.filter((d) => !d.isCompleted && new Date(d.date) < now)
		.map((d) => ({
			id: d.id,
			date: d.date,
			reportType: d.reportType,
		}));

	return {
		schedule: {
			milestones: mappedMilestones,
		},
		upcoming,
		overdue,
	};
}

// ── Restore ──

export async function restoreProject(
	projectId: string,
	user: AuthUser,
	ipAddress: string,
) {
	const [updated] = await db
		.update(projects)
		.set({ archivedAt: null })
		.where(eq(projects.projectId, projectId))
		.returning();

	if (updated) {
		await insertAuditLog({
			userId: user.userId,
			action: `Restored project ${projectId}`,
			tableAffected: "projects",
			ipAddress,
		});
	}

	return updated;
}
