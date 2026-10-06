import { randomUUID } from "node:crypto";
import type { z } from "@hono/zod-openapi";
import {
	and,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNotNull,
	isNull,
	lt,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "@/db/client.js";
import { departments } from "@/db/schema/departments.js";
import { projectReportingMilestones } from "@/db/schema/project-reporting-milestones.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { reportAttachments } from "@/db/schema/report-attachments.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { captureAuditDiff } from "@/lib/audit-diff.js";
import { ApiError } from "@/lib/errors.js";
import { escapeHtml } from "@/lib/html.js";
import {
	createNotification,
	getUserIdsByRole,
} from "@/lib/notification.helpers.js";
import { buildProposalScope } from "@/lib/scope-helpers.js";
import { supabase } from "@/lib/supabase.js";
import {
	ATTACHMENT_TYPE,
	type AuthUser,
	MILESTONE_TYPE,
	PROJECT_STATUS,
	REPORT_TYPE,
	ROLE_NAMES,
} from "@/lib/types.js";
import { isPdfFile, sanitizeFilename } from "@/services/file.service.js";
import { hashFileSha256 } from "@/services/file-integrity.service.js";
import {
	PROGRESS_REPORT_TYPES,
	TERMINAL_REPORT_TYPES,
} from "./report-metrics.js";
import type { CreateReportSchema, PaginationQuery } from "./reports.schema.js";
import {
	finalizeTerminalPackage,
	notifyTerminalReady,
} from "./terminal-package.js";

type CreateReportBody = z.infer<typeof CreateReportSchema>;
type Pagination = z.infer<typeof PaginationQuery>;

function serializeReport(report: {
	reportId: string;
	projectId: string;
	milestoneId: string;
	projectTitle: string;
	leaderFirstName: string;
	leaderLastName: string;
	leaderAcademicRank: string | null;
	leaderAvatarUrl: string | null;
	departmentName: string | null;
	reportType: string;
	submittedAt: Date | null;
	traineeCount?: number | null;
	packageCompletedAt?: Date | null;
	storagePath: string | null;
	remarks: string | null;
	archivedAt: Date | null;
}) {
	return {
		reportId: report.reportId,
		projectId: report.projectId,
		milestoneId: report.milestoneId,
		project: report.projectTitle,
		leader: `${report.leaderFirstName} ${report.leaderLastName}`,
		academicRank: report.leaderAcademicRank,
		avatarUrl: report.leaderAvatarUrl,
		department: report.departmentName,
		reportType: report.reportType,
		submitted: report.submittedAt?.toISOString() ?? null,
		traineeCount: report.traineeCount ?? null,
		packageCompletedAt: report.packageCompletedAt?.toISOString() ?? null,
		storagePath: report.storagePath,
		remarks: report.remarks,
		archivedAt: report.archivedAt?.toISOString() ?? null,
	};
}

const reportSelection = {
	reportId: projectReports.reportId,
	projectId: projectReports.projectId,
	milestoneId: projectReports.milestoneId,
	projectTitle: proposals.title,
	leaderFirstName: users.firstName,
	leaderLastName: users.lastName,
	leaderAcademicRank: users.academicRank,
	leaderAvatarUrl: users.avatarUrl,
	departmentName: departments.departmentName,
	reportType: projectReports.reportType,
	submittedAt: projectReports.submittedAt,
	traineeCount: projectReports.traineeCount,
	packageCompletedAt: projectReports.packageCompletedAt,
	storagePath: projectReports.storagePath,
	remarks: projectReports.remarks,
	archivedAt: projectReports.archivedAt,
};

export async function listReports(user: AuthUser, query: Pagination) {
	const { page, limit, search } = query;
	const whereConditions: SQL[] = [
		isNull(projectReports.archivedAt),
		isNull(projects.archivedAt),
		isNotNull(projectReports.storagePath),
		...buildProposalScope(user),
	];
	if (search) {
		const searchCondition = or(
			ilike(proposals.title, `%${search}%`),
			ilike(projectReports.reportType, `%${search}%`),
		);
		if (searchCondition) whereConditions.push(searchCondition);
	}
	const rows = await db
		.select(reportSelection)
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.innerJoin(users, eq(projectReports.submittedById, users.userId))
		.leftJoin(departments, eq(proposals.departmentId, departments.departmentId))
		.where(and(...whereConditions))
		.orderBy(desc(projectReports.submittedAt))
		.limit(limit)
		.offset((page - 1) * limit);
	const [totalRow] = await db
		.select({ value: count() })
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(and(...whereConditions));
	return { items: rows.map(serializeReport), total: totalRow?.value ?? 0 };
}

export async function getReportStats(user: AuthUser) {
	const whereConditions: SQL[] = [
		isNull(projectReports.archivedAt),
		isNull(projects.archivedAt),
		isNotNull(projectReports.storagePath),
		...buildProposalScope(user),
	];
	const [stats] = await db
		.select({
			total: sql<number>`count(*)::int`,
			progress: sql<number>`count(*) filter (where ${inArray(projectReports.reportType, PROGRESS_REPORT_TYPES)})::int`,
			terminal: sql<number>`count(*) filter (where ${inArray(projectReports.reportType, TERMINAL_REPORT_TYPES)})::int`,
		})
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(and(...whereConditions));
	return {
		total: Number(stats?.total ?? 0),
		progress: Number(stats?.progress ?? 0),
		terminal: Number(stats?.terminal ?? 0),
	};
}

export async function getReportSignedUrl(
	user: AuthUser,
	reportId: string,
	ipAddress: string,
) {
	const [report] = await db
		.select({
			reportId: projectReports.reportId,
			storagePath: projectReports.storagePath,
			submittedById: projectReports.submittedById,
			packageCompletedAt: projectReports.packageCompletedAt,
		})
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(
			and(
				eq(projectReports.reportId, reportId),
				isNull(projectReports.archivedAt),
				isNull(projects.archivedAt),
				...buildProposalScope(user),
			),
		)
		.limit(1);

	if (!report) throw new ApiError(404, "NOT_FOUND", "Report not found");
	if (!report.storagePath) {
		throw new ApiError(404, "NO_FILE", "No file uploaded for this report");
	}

	const { data, error } = await supabase.storage
		.from("documents")
		.createSignedUrl(report.storagePath, 3600);
	if (error || !data) {
		throw new ApiError(500, "URL_FAILED", "Failed to generate signed URL");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Accessed signed URL for project report ${reportId}`,
		tableAffected: "project_reports",
		ipAddress,
	});

	return { url: data.signedUrl };
}

export async function createReport(
	user: AuthUser,
	body: CreateReportBody,
	ipAddress: string,
) {
	const reportType =
		body.reportType === REPORT_TYPE.PROGRESS_REPORT
			? REPORT_TYPE.PROGRESS
			: body.reportType;
	const [milestone] = await db
		.select({
			milestoneId: projectReportingMilestones.milestoneId,
			projectId: projectReportingMilestones.projectId,
			reportType: projectReportingMilestones.reportType,
			dueAt: projectReportingMilestones.dueAt,
			projectStatus: projects.projectStatus,
			proposalId: projects.proposalId,
			completedAt: projectReportingMilestones.completedAt,
		})
		.from(projectReportingMilestones)
		.innerJoin(
			projects,
			eq(projectReportingMilestones.projectId, projects.projectId),
		)
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(
			and(
				eq(projectReportingMilestones.milestoneId, body.milestoneId),
				isNull(projects.archivedAt),
				...buildProposalScope(user),
			),
		)
		.limit(1);
	if (!milestone)
		throw new ApiError(404, "NOT_FOUND", "Reporting milestone not found");
	if (
		milestone.projectStatus !== PROJECT_STATUS.ONGOING &&
		milestone.projectStatus !== PROJECT_STATUS.OVERDUE
	) {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Reports can only be submitted for ongoing or overdue projects",
		);
	}
	const [membership] = await db
		.select({ memberId: proposalMembers.memberId })
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.proposalId, milestone.proposalId),
				eq(proposalMembers.userId, user.userId),
				isNull(proposalMembers.archivedAt),
			),
		)
		.limit(1);
	if (!membership)
		throw new ApiError(
			403,
			"NOT_MEMBER",
			"Only project members can submit reports for this project",
		);
	const isValidReportType =
		((milestone.reportType === REPORT_TYPE.PROGRESS ||
			milestone.reportType === REPORT_TYPE.PROGRESS_REPORT) &&
			(body.reportType === REPORT_TYPE.PROGRESS ||
				body.reportType === REPORT_TYPE.PROGRESS_REPORT)) ||
		((milestone.reportType === "Terminal Report" ||
			milestone.reportType === "Project Closure") &&
			(body.reportType === REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL ||
				body.reportType === REPORT_TYPE.TERMINAL ||
				body.reportType === REPORT_TYPE.FINAL_ACCOMPLISHMENT));
	if (!isValidReportType) {
		throw new ApiError(
			400,
			"REPORT_TYPE_MISMATCH",
			"The report type does not match the selected milestone",
		);
	}
	if (reportType === REPORT_TYPE.PROGRESS && milestone.completedAt)
		throw new ApiError(
			409,
			"ALREADY_SUBMITTED",
			"This progress report has already been submitted",
		);

	const [priorIncompleteMilestone] = await db
		.select({ milestoneId: projectReportingMilestones.milestoneId })
		.from(projectReportingMilestones)
		.where(
			and(
				eq(projectReportingMilestones.projectId, milestone.projectId),
				isNull(projectReportingMilestones.completedAt),
				lt(projectReportingMilestones.dueAt, milestone.dueAt),
			),
		)
		.limit(1);
	if (priorIncompleteMilestone) {
		throw new ApiError(
			400,
			"PREVIOUS_MILESTONES_INCOMPLETE",
			"Previous progress reports must be submitted before this report",
		);
	}
	const [existing] = await db
		.select({
			reportId: projectReports.reportId,
			storagePath: projectReports.storagePath,
			submittedById: projectReports.submittedById,
			packageCompletedAt: projectReports.packageCompletedAt,
			traineeCount: projectReports.traineeCount,
		})
		.from(projectReports)
		.where(
			and(
				eq(projectReports.milestoneId, milestone.milestoneId),
				inArray(
					projectReports.reportType,
					reportType === REPORT_TYPE.PROGRESS
						? [REPORT_TYPE.PROGRESS, REPORT_TYPE.PROGRESS_REPORT]
						: [reportType],
				),
				isNull(projectReports.archivedAt),
			),
		)
		.limit(1);
	if (existing && existing.submittedById !== user.userId) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Only the draft owner can resume this report",
		);
	}
	if (
		existing?.packageCompletedAt ||
		(existing?.storagePath &&
			body.reportType !== REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL)
	) {
		throw new ApiError(
			409,
			"ALREADY_SUBMITTED",
			"This reporting milestone is already submitted",
		);
	}
	let packageFinalized = false;
	const created = await db.transaction(async (tx) => {
		const [parent] = await tx
			.select({ status: projects.projectStatus })
			.from(projects)
			.where(
				and(
					eq(projects.projectId, milestone.projectId),
					isNull(projects.archivedAt),
				),
			)
			.for("update");
		if (
			!parent ||
			![PROJECT_STATUS.ONGOING, PROJECT_STATUS.OVERDUE].includes(
				parent.status as "Ongoing" | "Overdue",
			)
		)
			throw new ApiError(
				400,
				"INVALID_STATE",
				"This project is no longer accepting reports",
			);
		let saved: typeof projectReports.$inferSelect;
		if (existing) {
			const [current] = await tx
				.select()
				.from(projectReports)
				.where(eq(projectReports.reportId, existing.reportId))
				.for("update");
			if (
				!current ||
				current.archivedAt ||
				current.submittedById !== user.userId
			)
				throw new ApiError(403, "FORBIDDEN", "You can't edit this submission");
			if (
				current.packageCompletedAt ||
				(current.storagePath &&
					body.reportType !== REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL)
			)
				throw new ApiError(
					409,
					"ALREADY_SUBMITTED",
					"This report has already been submitted",
				);
			const [updated] = await tx
				.update(projectReports)
				.set({
					remarks: body.remarks ?? null,
					traineeCount: body.traineeCount ?? null,
				})
				.where(eq(projectReports.reportId, existing.reportId))
				.returning();
			if (!updated)
				throw new ApiError(
					500,
					"UPDATE_FAILED",
					"Failed to update report draft",
				);
			saved = updated;
		} else {
			const [report] = await tx
				.insert(projectReports)
				.values({
					projectId: milestone.projectId,
					milestoneId: milestone.milestoneId,
					submittedById: user.userId,
					reportType,
					remarks: body.remarks ?? null,
					traineeCount: body.traineeCount ?? null,
					storagePath: null,
					submittedAt: null,
				})
				.onConflictDoNothing()
				.returning();
			if (!report)
				throw new ApiError(
					409,
					"SUBMISSION_CONFLICT",
					"A report was just created for this milestone. Reload to continue it.",
				);
			saved = report;
		}

		await insertAuditLog(
			{
				userId: user.userId,
				action: `${existing ? "Updated" : "Created"} report draft ${saved.reportId}`,
				tableAffected: "project_reports",
				newValue: {
					reportType: body.reportType,
					traineeCount: body.traineeCount ?? null,
				},
				...(existing
					? { oldValue: { traineeCount: existing.traineeCount } }
					: {}),
				ipAddress,
			},
			tx,
		);
		if (body.reportType === REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL) {
			packageFinalized = await finalizeTerminalPackage(
				tx,
				saved.reportId,
				user,
				ipAddress,
			);
		}

		return saved;
	});
	if (packageFinalized) await notifyTerminalReady(created.reportId);
	const [enriched] = await db
		.select(reportSelection)
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.innerJoin(users, eq(projectReports.submittedById, users.userId))
		.leftJoin(departments, eq(proposals.departmentId, departments.departmentId))
		.where(eq(projectReports.reportId, created.reportId))
		.limit(1);
	if (!enriched)
		throw new ApiError(
			500,
			"ENRICH_FAILED",
			"Failed to retrieve created report",
		);
	return serializeReport(enriched);
}

export async function uploadReportDocument(
	user: AuthUser,
	reportId: string,
	file: File,
	ipAddress: string,
) {
	const [report] = await db
		.select({
			reportId: projectReports.reportId,
			projectId: projectReports.projectId,
			milestoneId: projectReports.milestoneId,
			submittedById: projectReports.submittedById,
			storagePath: projectReports.storagePath,
			reportType: projectReports.reportType,
			proposalTitle: proposals.title,
		})
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(
			and(
				eq(projectReports.reportId, reportId),
				isNull(projectReports.archivedAt),
				isNull(projects.archivedAt),
				...buildProposalScope(user),
			),
		)
		.limit(1);

	if (!report) throw new ApiError(404, "NOT_FOUND", "Report not found");
	if (report.submittedById !== user.userId) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Only the report submitter can upload its document",
		);
	}
	if (report.storagePath) {
		throw new ApiError(
			409,
			"ALREADY_SUBMITTED",
			"This report document is already uploaded",
		);
	}

	const storagePath = `reports/${report.projectId}/${reportId}_${Date.now()}_${randomUUID()}_${sanitizeFilename(file.name)}`;
	const contentHash = await hashFileSha256(file);
	const { error: uploadError } = await supabase.storage
		.from("documents")
		.upload(storagePath, file, { contentType: file.type, upsert: false });
	if (uploadError) {
		console.error("[upload] Report document upload failed:", uploadError);
		throw new ApiError(
			400,
			"UPLOAD_FAILED",
			"We couldn't upload the report PDF. Please try again.",
		);
	}

	let committed = false;
	let packageFinalized = false;
	try {
		const updated = await db.transaction(async (tx) => {
			await tx
				.select({ id: projects.projectId })
				.from(projects)
				.where(eq(projects.projectId, report.projectId))
				.for("update");
			const [current] = await tx
				.select({
					reportId: projectReports.reportId,
					submittedById: projectReports.submittedById,
					storagePath: projectReports.storagePath,
					projectStatus: projects.projectStatus,
				})
				.from(projectReports)
				.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
				.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
				.where(
					and(
						eq(projectReports.reportId, reportId),
						isNull(projectReports.archivedAt),
						isNull(projects.archivedAt),
						...buildProposalScope(user),
					),
				)
				.for("update")
				.limit(1);

			if (!current) {
				throw new ApiError(404, "NOT_FOUND", "Report not found");
			}
			if (current.submittedById !== user.userId) {
				throw new ApiError(
					403,
					"FORBIDDEN",
					"Only the report submitter can upload its document",
				);
			}
			if (current.storagePath) {
				throw new ApiError(
					409,
					"ALREADY_SUBMITTED",
					"This report document is already uploaded",
				);
			}
			if (
				[REPORT_TYPE.PROGRESS, REPORT_TYPE.PROGRESS_REPORT].includes(
					report.reportType as "Progress" | "Progress Report",
				)
			) {
				const [milestone] = await tx
					.select({ completedAt: projectReportingMilestones.completedAt })
					.from(projectReportingMilestones)
					.where(
						eq(projectReportingMilestones.milestoneId, report.milestoneId),
					);
				if (milestone?.completedAt)
					throw new ApiError(
						409,
						"ALREADY_SUBMITTED",
						"This progress report has already been submitted",
					);
			}
			if (
				current.projectStatus !== PROJECT_STATUS.ONGOING &&
				current.projectStatus !== PROJECT_STATUS.OVERDUE
			) {
				throw new ApiError(
					400,
					"INVALID_STATE",
					"Reports can only be uploaded for ongoing or overdue projects",
				);
			}

			const [saved] = await tx
				.update(projectReports)
				.set({
					storagePath,
					contentHash,
					uploadedBy: user.userId,
					sourceIp: ipAddress,
					submittedAt: new Date(),
				})
				.where(
					and(
						eq(projectReports.reportId, reportId),
						isNull(projectReports.storagePath),
					),
				)
				.returning({
					reportId: projectReports.reportId,
					storagePath: projectReports.storagePath,
				});
			if (!saved)
				throw new ApiError(
					500,
					"UPDATE_FAILED",
					"Failed to record report document",
				);
			const milestoneReports = await tx
				.select({ reportType: projectReports.reportType })
				.from(projectReports)
				.where(
					and(
						eq(projectReports.milestoneId, report.milestoneId),
						isNull(projectReports.archivedAt),
						isNotNull(projectReports.storagePath),
					),
				);
			const [milestone] = await tx
				.select({ reportType: projectReportingMilestones.reportType })
				.from(projectReportingMilestones)
				.where(eq(projectReportingMilestones.milestoneId, report.milestoneId))
				.limit(1);
			const hasFinalAccomplishment = milestoneReports.some(
				(item) => item.reportType === REPORT_TYPE.FINAL_ACCOMPLISHMENT,
			);
			const hasTerminal = milestoneReports.some(
				(item) => item.reportType === REPORT_TYPE.TERMINAL,
			);
			const isClosureCompleted =
				(milestone?.reportType === "Terminal Report" ||
					milestone?.reportType === "Project Closure" ||
					milestone?.reportType === MILESTONE_TYPE.CLOSURE) &&
				hasFinalAccomplishment &&
				hasTerminal;
			const milestoneComplete =
				milestone?.reportType === REPORT_TYPE.PROGRESS ||
				milestone?.reportType === REPORT_TYPE.PROGRESS_REPORT ||
				milestone?.reportType === MILESTONE_TYPE.PROGRESS ||
				isClosureCompleted;
			if (milestoneComplete) {
				await tx
					.update(projectReportingMilestones)
					.set({ completedAt: new Date() })
					.where(
						and(
							eq(projectReportingMilestones.milestoneId, report.milestoneId),
							isNull(projectReportingMilestones.completedAt),
						),
					);
			}
			const [projectStatusRow] = await tx
				.select({
					projectStatus: projects.projectStatus,
				})
				.from(projects)
				.where(eq(projects.projectId, report.projectId))
				.limit(1);

			if (report.reportType === REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL) {
				packageFinalized = await finalizeTerminalPackage(
					tx,
					reportId,
					user,
					ipAddress,
				);
			} else if (isClosureCompleted) {
				if (
					projectStatusRow?.projectStatus === PROJECT_STATUS.ONGOING ||
					projectStatusRow?.projectStatus === PROJECT_STATUS.OVERDUE
				) {
					const diff = captureAuditDiff(
						{ projectStatus: projectStatusRow.projectStatus },
						{ projectStatus: PROJECT_STATUS.PENDING_CLOSURE },
						["projectStatus"],
					);
					const [transitioned] = await tx
						.update(projects)
						.set({
							projectStatus: PROJECT_STATUS.PENDING_CLOSURE,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(projects.projectId, report.projectId),
								or(
									eq(projects.projectStatus, PROJECT_STATUS.ONGOING),
									eq(projects.projectStatus, PROJECT_STATUS.OVERDUE),
								),
							),
						)
						.returning({ projectId: projects.projectId });
					if (transitioned) {
						await insertAuditLog(
							{
								userId: user.userId,
								action: `Transitioned project ${report.projectId} to Pending Closure (all closure reports submitted)`,
								tableAffected: "projects",
								oldValue: diff.oldValue,
								newValue: diff.newValue,
								ipAddress,
							},
							tx,
						);
					}
				}
			} else if (projectStatusRow?.projectStatus === PROJECT_STATUS.OVERDUE) {
				const remainingOverdueMilestones = await tx
					.select({ milestoneId: projectReportingMilestones.milestoneId })
					.from(projectReportingMilestones)
					.where(
						and(
							eq(projectReportingMilestones.projectId, report.projectId),
							lt(projectReportingMilestones.dueAt, new Date()),
							isNull(projectReportingMilestones.completedAt),
						),
					);

				if (remainingOverdueMilestones.length === 0) {
					const diff = captureAuditDiff(
						{ projectStatus: PROJECT_STATUS.OVERDUE },
						{ projectStatus: PROJECT_STATUS.ONGOING },
						["projectStatus"],
					);
					const [cleared] = await tx
						.update(projects)
						.set({
							projectStatus: PROJECT_STATUS.ONGOING,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(projects.projectId, report.projectId),
								eq(projects.projectStatus, PROJECT_STATUS.OVERDUE),
							),
						)
						.returning({ projectId: projects.projectId });
					if (cleared) {
						await insertAuditLog(
							{
								userId: user.userId,
								action: `Cleared overdue status for project ${report.projectId} (all overdue reports completed)`,
								tableAffected: "projects",
								oldValue: diff.oldValue,
								newValue: diff.newValue,
								ipAddress,
							},
							tx,
						);
					}
				}
			}
			await insertAuditLog(
				{
					userId: user.userId,
					action: `Uploaded document for project report ${reportId}`,
					tableAffected: "project_reports",
					newValue: { contentHash, uploadedBy: user.userId },
					ipAddress,
				},
				tx,
			);
			await insertAuditLog(
				{
					userId: user.userId,
					action: `Submitted project report ${report.reportId}`,
					tableAffected: "project_reports",
					ipAddress,
				},
				tx,
			);
			return saved;
		});
		committed = true;
		if (packageFinalized) await notifyTerminalReady(reportId);

		const directorIds =
			report.reportType === REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL
				? []
				: await getUserIdsByRole("Director").catch((error) => {
						console.error(
							"[notification] Failed to load report directors:",
							error,
						);
						return [];
					});
		const readableType =
			report.reportType === REPORT_TYPE.PROGRESS
				? "Progress Report"
				: report.reportType === REPORT_TYPE.TERMINAL
					? "Terminal Report"
					: "Final Accomplishment Report";
		const projectTitle = report.proposalTitle;
		for (const directorId of directorIds) {
			await createNotification({
				recipientId: directorId,
				type: "report_submitted",
				dedupeKey: `report-submitted:${reportId}:${directorId}`,
				title: "New Report Submitted",
				message: `A ${readableType} has been submitted for "${projectTitle}".`,
				sendEmail: true,
				emailSubject: `New Report: ${projectTitle}`,
				emailHtml: `<p>A <strong>${escapeHtml(readableType)}</strong> has been submitted for "<strong>${escapeHtml(projectTitle)}</strong>".</p>`,
			}).catch((error) => {
				console.error(
					"[notification] Failed to notify report director:",
					error,
				);
			});
		}
		return updated;
	} catch (error) {
		if (!committed) {
			await supabase.storage
				.from("documents")
				.remove([storagePath])
				.catch(() => undefined);
		}
		throw error;
	}
}

export async function uploadReportAttachment(
	user: AuthUser,
	reportId: string,
	file: File,
	attachmentType: string,
	ipAddress: string,
) {
	const [report] = await db
		.select({
			reportId: projectReports.reportId,
			projectId: projectReports.projectId,
			reportType: projectReports.reportType,
			submittedById: projectReports.submittedById,
			projectStatus: projects.projectStatus,
		})
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(
			and(
				eq(projectReports.reportId, reportId),
				isNull(projectReports.archivedAt),
				isNull(projects.archivedAt),
				...buildProposalScope(user),
			),
		)
		.limit(1);

	if (!report) {
		throw new ApiError(404, "NOT_FOUND", "Report not found");
	}

	const [membership] = await db
		.select({ memberId: proposalMembers.memberId })
		.from(proposalMembers)
		.innerJoin(projects, eq(projects.proposalId, proposalMembers.proposalId))
		.where(
			and(
				eq(projects.projectId, report.projectId),
				eq(proposalMembers.userId, user.userId),
				isNull(proposalMembers.archivedAt),
			),
		)
		.limit(1);

	if (!membership) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Only project members can upload report attachments",
		);
	}
	if (
		![
			PROJECT_STATUS.ONGOING,
			PROJECT_STATUS.OVERDUE,
			PROJECT_STATUS.PENDING_CLOSURE,
		].includes(
			report.projectStatus as "Ongoing" | "Overdue" | "Pending Closure",
		)
	) {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Attachments cannot be changed after project closure",
		);
	}

	if (!(await isPdfFile(file))) {
		throw new ApiError(
			422,
			"INVALID_FILE_TYPE",
			"Attachment must be a valid PDF document",
		);
	}

	const allowedTypes: string[] = [
		ATTACHMENT_TYPE.EVALUATION_FORMS,
		ATTACHMENT_TYPE.ATTENDANCE_RECORDS,
		ATTACHMENT_TYPE.MEANS_OF_VERIFICATION,
	];
	if (!allowedTypes.includes(attachmentType)) {
		throw new ApiError(
			400,
			"INVALID_ATTACHMENT_TYPE",
			`Attachment type must be one of: ${allowedTypes.join(", ")}`,
		);
	}

	const sanitizedFilename = sanitizeFilename(file.name);
	const storagePath = `reports/${reportId}/attachment_${attachmentType.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}_${randomUUID()}_${sanitizedFilename}`;
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
			`Supabase upload failed: ${uploadError.message}`,
		);
	}

	let completed = false;
	let attachment: typeof reportAttachments.$inferSelect;
	try {
		attachment = await db.transaction(async (tx) => {
			const [parent] = await tx
				.select()
				.from(projects)
				.where(eq(projects.projectId, report.projectId))
				.for("update");
			if (
				!parent ||
				parent.archivedAt ||
				![
					PROJECT_STATUS.ONGOING,
					PROJECT_STATUS.OVERDUE,
					PROJECT_STATUS.PENDING_CLOSURE,
				].includes(
					parent.projectStatus as "Ongoing" | "Overdue" | "Pending Closure",
				)
			)
				throw new ApiError(400, "INVALID_STATE", "Project is closed");
			const [existing] = await tx
				.select()
				.from(reportAttachments)
				.where(
					and(
						eq(reportAttachments.reportId, reportId),
						eq(reportAttachments.attachmentType, attachmentType),
						isNull(reportAttachments.archivedAt),
					),
				)
				.limit(1);
			if (existing && attachmentType !== ATTACHMENT_TYPE.MEANS_OF_VERIFICATION)
				return existing;
			const [saved] = await tx
				.insert(reportAttachments)
				.values({
					reportId,
					attachmentType,
					storagePath,
					contentHash,
					uploadedBy: user.userId,
					sourceIp: ipAddress,
				})
				.returning();
			if (!saved)
				throw new ApiError(500, "UPLOAD_FAILED", "Failed to save attachment");
			await insertAuditLog(
				{
					userId: user.userId,
					action: `Uploaded ${attachmentType} attachment for report ${reportId}`,
					tableAffected: "report_attachments",
					ipAddress,
				},
				tx,
			);
			completed = await finalizeTerminalPackage(tx, reportId, user, ipAddress);
			return saved;
		});
	} catch (error) {
		await supabase.storage
			.from("documents")
			.remove([storagePath])
			.catch(() => undefined);
		throw error;
	}
	if (attachment.storagePath !== storagePath)
		await supabase.storage
			.from("documents")
			.remove([storagePath])
			.catch(() => undefined);
	if (completed) await notifyTerminalReady(reportId);

	return {
		attachmentId: attachment.attachmentId,
		reportId: attachment.reportId,
		attachmentType: attachment.attachmentType,
		storagePath: attachment.storagePath,
		uploadedAt: attachment.uploadedAt.toISOString(),
	};
}

export async function listReportAttachments(reportId: string, user: AuthUser) {
	const [parent] = await db
		.select({ id: projectReports.reportId })
		.from(projectReports)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(
			and(
				eq(projectReports.reportId, reportId),
				isNull(projectReports.archivedAt),
				isNull(projects.archivedAt),
				...buildProposalScope(user),
			),
		)
		.limit(1);
	if (!parent) throw new ApiError(404, "NOT_FOUND", "Report not found");
	const rows = await db
		.select({
			attachmentId: reportAttachments.attachmentId,
			reportId: reportAttachments.reportId,
			attachmentType: reportAttachments.attachmentType,
			storagePath: reportAttachments.storagePath,
			uploadedAt: reportAttachments.uploadedAt,
		})
		.from(reportAttachments)
		.where(
			and(
				eq(reportAttachments.reportId, reportId),
				isNull(reportAttachments.archivedAt),
			),
		);

	return rows.map((r) => ({
		...r,
		uploadedAt: r.uploadedAt.toISOString(),
	}));
}

export async function getReportPackage(user: AuthUser, milestoneId: string) {
	const [milestone] = await db
		.select({
			projectId: projects.projectId,
			projectStatus: projects.projectStatus,
			completedAt: projectReportingMilestones.completedAt,
			proposalId: projects.proposalId,
		})
		.from(projectReportingMilestones)
		.innerJoin(
			projects,
			eq(projectReportingMilestones.projectId, projects.projectId),
		)
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(
			and(
				eq(projectReportingMilestones.milestoneId, milestoneId),
				isNull(projects.archivedAt),
				...buildProposalScope(user),
			),
		)
		.limit(1);
	if (!milestone)
		throw new ApiError(404, "NOT_FOUND", "Reporting milestone not found");
	const [member] = await db
		.select({ id: proposalMembers.memberId })
		.from(proposalMembers)
		.innerJoin(projects, eq(projects.proposalId, proposalMembers.proposalId))
		.where(
			and(
				eq(projects.projectId, milestone.projectId),
				eq(proposalMembers.userId, user.userId),
				isNull(proposalMembers.archivedAt),
			),
		)
		.limit(1);
	if (user.roleName === ROLE_NAMES.FACULTY && !member)
		throw new ApiError(403, "FORBIDDEN", "Project membership required");
	const reports = await db
		.select()
		.from(projectReports)
		.where(
			and(
				eq(projectReports.milestoneId, milestoneId),
				isNull(projectReports.archivedAt),
			),
		)
		.orderBy(
			sql`CASE WHEN ${projectReports.reportType} = ${REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL} THEN 0 WHEN ${projectReports.reportType} = ${REPORT_TYPE.TERMINAL} THEN 1 ELSE 2 END`,
			sql`${projectReports.submittedAt} DESC NULLS LAST`,
			projectReports.reportId,
		);
	const report = reports[0];
	const legacyComplete =
		reports.some(
			(item) => item.reportType === REPORT_TYPE.TERMINAL && item.storagePath,
		) &&
		reports.some(
			(item) =>
				item.reportType === REPORT_TYPE.FINAL_ACCOMPLISHMENT &&
				item.storagePath,
		);
	const attachments = report
		? await db
				.select({
					id: reportAttachments.attachmentId,
					type: reportAttachments.attachmentType,
				})
				.from(reportAttachments)
				.where(
					and(
						eq(reportAttachments.reportId, report.reportId),
						isNull(reportAttachments.archivedAt),
					),
				)
		: [];
	return {
		reportId: report?.reportId ?? null,
		reportType: report?.reportType ?? null,
		remarks: report?.remarks ?? null,
		traineeCount: report?.traineeCount ?? null,
		evaluationAttachmentId:
			attachments.find((a) => a.type === ATTACHMENT_TYPE.EVALUATION_FORMS)
				?.id ?? null,
		attendanceAttachmentId:
			attachments.find((a) => a.type === ATTACHMENT_TYPE.ATTENDANCE_RECORDS)
				?.id ?? null,
		documentUploaded: Boolean(report?.storagePath),
		evaluationUploaded: attachments.some(
			(a) => a.type === ATTACHMENT_TYPE.EVALUATION_FORMS,
		),
		attendanceUploaded: attachments.some(
			(a) => a.type === ATTACHMENT_TYPE.ATTENDANCE_RECORDS,
		),
		completed: Boolean(
			report?.packageCompletedAt ||
				(legacyComplete && milestone.completedAt) ||
				(report &&
					[REPORT_TYPE.PROGRESS, REPORT_TYPE.PROGRESS_REPORT].includes(
						report.reportType as "Progress" | "Progress Report",
					) &&
					milestone.completedAt),
		),
		canEdit:
			Boolean(member) &&
			(!report ||
				[REPORT_TYPE.TERMINAL, REPORT_TYPE.FINAL_ACCOMPLISHMENT].includes(
					report.reportType as "Terminal" | "Final Accomplishment",
				) ||
				report.submittedById === user.userId) &&
			[PROJECT_STATUS.ONGOING, PROJECT_STATUS.OVERDUE].includes(
				milestone.projectStatus as "Ongoing" | "Overdue",
			),
	};
}

export async function getReportAttachmentSignedUrl(
	user: AuthUser,
	attachmentId: string,
	ipAddress: string,
) {
	const [att] = await db
		.select({
			attachmentId: reportAttachments.attachmentId,
			storagePath: reportAttachments.storagePath,
			reportId: reportAttachments.reportId,
			projectId: projectReports.projectId,
		})
		.from(reportAttachments)
		.innerJoin(
			projectReports,
			eq(reportAttachments.reportId, projectReports.reportId),
		)
		.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
		.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
		.where(
			and(
				eq(reportAttachments.attachmentId, attachmentId),
				isNull(reportAttachments.archivedAt),
				isNull(projectReports.archivedAt),
				isNull(projects.archivedAt),
				...buildProposalScope(user),
			),
		)
		.limit(1);

	if (!att?.storagePath) {
		throw new ApiError(404, "NOT_FOUND", "Attachment not found");
	}

	const { data, error } = await supabase.storage
		.from("documents")
		.createSignedUrl(att.storagePath, 3600);

	if (error || !data?.signedUrl) {
		throw new ApiError(500, "STORAGE_ERROR", "Failed to generate signed URL");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Accessed signed URL for attachment ${attachmentId}`,
		tableAffected: "report_attachments",
		ipAddress,
	});

	return { url: data.signedUrl };
}
