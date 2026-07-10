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
import { projectReportingDates } from "@/db/schema/project-reporting-dates.js";
import { projectReportingSchedules } from "@/db/schema/project-reporting-schedules.js";
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
				showArchived
					? isNotNull(projects.archivedAt)
					: isNull(projects.archivedAt),
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
				showArchived
					? isNotNull(projects.archivedAt)
					: isNull(projects.archivedAt),
				inArray(projects.proposalId, allowedProposals),
			),
		);
	const total = Number(totalResult?.value ?? 0);

	return { items, total };
}

export async function getProjectDerivedState(id: string, user: AuthUser) {
	const proposalConditions = buildProposalScope(user);

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

	return deriveProjectState(
		{
			projectStatus: row.projectStatus as ProjectStatus,
			moaId: row.moaId,
			reportingSchedule: !!schedule,
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
		.where(or(eq(proposals.proposalId, id), eq(projects.projectId, id)));

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

	const [memberRows, documentRows, reviewRows, sdgRows, specialOrderRows] =
		await Promise.all([
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
				.where(eq(proposalMembers.proposalId, row.proposalId)),

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
			and(
				eq(projectReports.projectId, projectId),
				isNull(projectReports.archivedAt),
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
			.set({ projectStatus: PROJECT_STATUS.CLOSED, updatedAt: new Date() })
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

// ── Activate ──

export async function activateProject(
	id: string,
	body: {
		moaId: string;
		reportingFrequency: string;
		dueDates: Array<{ reportType: string; dueDate: string }>;
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

		// Create reporting schedule
		const [schedule] = await tx
			.insert(projectReportingSchedules)
			.values({ projectId: project!.projectId })
			.returning();

		// Create reporting dates
		if (body.dueDates.length > 0 && schedule) {
			await tx.insert(projectReportingDates).values(
				body.dueDates.map((dd) => ({
					scheduleId: schedule!.scheduleId,
					reportingDate: new Date(dd.dueDate),
					isCompleted: false,
				})),
			);
		}

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
	const [[proposal], pMembers, [moa], [schedule]] = await Promise.all([
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
			.where(eq(proposalMembers.proposalId, project.proposalId)),
		project.moaId
			? db
					.select({ validUntil: moas.validUntil })
					.from(moas)
					.where(and(eq(moas.moaId, project.moaId), isNull(moas.archivedAt)))
					.limit(1)
			: Promise.resolve([]),
		db
			.select({ scheduleId: projectReportingSchedules.scheduleId })
			.from(projectReportingSchedules)
			.where(eq(projectReportingSchedules.projectId, id))
			.limit(1),
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
	const [sOrders, dates] = await Promise.all([
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
		schedule
			? db
					.select({ id: projectReportingDates.id })
					.from(projectReportingDates)
					.where(eq(projectReportingDates.scheduleId, schedule.scheduleId))
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
	const reportingDatesCount = dates.length;
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

	// 2. Get schedule
	const [scheduleRow] = await db
		.select({ scheduleId: projectReportingSchedules.scheduleId })
		.from(projectReportingSchedules)
		.where(eq(projectReportingSchedules.projectId, project.projectId))
		.limit(1);

	if (!scheduleRow) {
		return {
			schedule: { frequency: "None", dueDates: [] },
			upcoming: [],
			overdue: [],
		};
	}

	// 3. Get due dates (sorted chronologically)
	const dueDatesList = await db
		.select({
			id: projectReportingDates.id,
			reportingDate: projectReportingDates.reportingDate,
			isCompleted: projectReportingDates.isCompleted,
			completedAt: projectReportingDates.completedAt,
		})
		.from(projectReportingDates)
		.where(eq(projectReportingDates.scheduleId, scheduleRow.scheduleId))
		.orderBy(projectReportingDates.reportingDate);

	// 4. Get submitted reports (sorted chronologically)
	const reportsList = await db
		.select({
			reportId: projectReports.reportId,
			reportType: projectReports.reportType,
			submittedAt: projectReports.submittedAt,
			storagePath: projectReports.storagePath,
		})
		.from(projectReports)
		.where(
			and(eq(projectReports.projectId, id), isNull(projectReports.archivedAt)),
		)
		.orderBy(projectReports.submittedAt);

	// 5. Map completed due dates to reports chronologically
	const mappedDueDates = dueDatesList.map((dueDate, idx) => {
		let resolvedType =
			idx === dueDatesList.length - 1 ? "Terminal" : "Progress";
		let resolvedReportId: string | null = null;
		let resolvedStoragePath: string | null = null;

		if (dueDate.isCompleted) {
			const completedIndex = dueDatesList
				.slice(0, idx)
				.filter((d) => d.isCompleted).length;

			const correspondingReport = reportsList[completedIndex];
			if (correspondingReport) {
				resolvedType = correspondingReport.reportType;
				resolvedReportId = correspondingReport.reportId;
				resolvedStoragePath = correspondingReport.storagePath;
			}
		}

		return {
			id: dueDate.id,
			date: dueDate.reportingDate.toISOString(),
			isCompleted: dueDate.isCompleted,
			completedAt: dueDate.completedAt
				? dueDate.completedAt.toISOString()
				: null,
			reportType: resolvedType,
			reportId: resolvedReportId,
			storagePath: resolvedStoragePath,
		};
	});

	const now = new Date();
	const upcoming = mappedDueDates
		.filter((d) => !d.isCompleted && new Date(d.date) >= now)
		.map((d) => ({
			id: d.id,
			date: d.date,
			reportType: d.reportType,
		}));

	const overdue = mappedDueDates
		.filter((d) => !d.isCompleted && new Date(d.date) < now)
		.map((d) => ({
			id: d.id,
			date: d.date,
			reportType: d.reportType,
		}));

	return {
		schedule: {
			frequency: "Scheduled",
			dueDates: mappedDueDates,
		},
		upcoming,
		overdue,
	};
}

// ── Restore ──

export async function restoreProject(projectId: string) {
	const [updated] = await db
		.update(projects)
		.set({ archivedAt: null })
		.where(eq(projects.projectId, projectId))
		.returning();

	return updated;
}
