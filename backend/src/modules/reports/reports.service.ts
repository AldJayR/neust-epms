import { randomUUID } from "node:crypto";
import type { z } from "@hono/zod-openapi";
import {
	and,
	count,
	desc,
	eq,
	ilike,
	isNotNull,
	isNull,
	or,
	type SQL,
} from "drizzle-orm";
import { db } from "@/db/client.js";
import { departments } from "@/db/schema/departments.js";
import { projectReportingMilestones } from "@/db/schema/project-reporting-milestones.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
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
import { type AuthUser, PROJECT_STATUS, REPORT_TYPE } from "@/lib/types.js";
import { sanitizeFilename } from "@/services/file.service.js";
import { hashFileSha256 } from "@/services/file-integrity.service.js";
import type { CreateReportSchema, PaginationQuery } from "./reports.schema.js";

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
	submittedAt: Date;
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
		submitted: report.submittedAt.toISOString(),
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
	const countReports = (conditions: SQL[]) =>
		db
			.select({ value: count() })
			.from(projectReports)
			.innerJoin(projects, eq(projectReports.projectId, projects.projectId))
			.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
			.where(and(...conditions));
	const [totalRow, progressRow, terminalRow] = await Promise.all([
		countReports(whereConditions),
		countReports([
			...whereConditions,
			eq(projectReports.reportType, "Progress"),
		]),
		countReports([
			...whereConditions,
			eq(projectReports.reportType, "Terminal"),
		]),
	]);
	return {
		total: Number(totalRow[0]?.value ?? 0),
		progress: Number(progressRow[0]?.value ?? 0),
		terminal: Number(terminalRow[0]?.value ?? 0),
	};
}

export async function createReport(
	user: AuthUser,
	body: CreateReportBody,
	ipAddress: string,
) {
	const [milestone] = await db
		.select({
			milestoneId: projectReportingMilestones.milestoneId,
			projectId: projectReportingMilestones.projectId,
			reportType: projectReportingMilestones.reportType,
			projectStatus: projects.projectStatus,
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
				eq(projectReportingMilestones.milestoneId, body.milestoneId),
				isNull(projects.archivedAt),
				...buildProposalScope(user),
			),
		)
		.limit(1);
	if (!milestone)
		throw new ApiError(404, "NOT_FOUND", "Reporting milestone not found");
	if (milestone.projectStatus !== PROJECT_STATUS.ONGOING) {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Reports can only be submitted for ongoing projects",
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
		(milestone.reportType === REPORT_TYPE.PROGRESS &&
			body.reportType === REPORT_TYPE.PROGRESS) ||
		(milestone.reportType === "Project Closure" &&
			(body.reportType === REPORT_TYPE.TERMINAL ||
				body.reportType === REPORT_TYPE.FINAL_ACCOMPLISHMENT));
	if (!isValidReportType) {
		throw new ApiError(
			400,
			"REPORT_TYPE_MISMATCH",
			"The report type does not match the selected milestone",
		);
	}
	const [existing] = await db
		.select({
			reportId: projectReports.reportId,
			storagePath: projectReports.storagePath,
		})
		.from(projectReports)
		.where(
			and(
				eq(projectReports.milestoneId, milestone.milestoneId),
				eq(projectReports.reportType, body.reportType),
				isNull(projectReports.archivedAt),
			),
		)
		.limit(1);
	if (existing?.storagePath) {
		throw new ApiError(
			409,
			"ALREADY_SUBMITTED",
			"This reporting milestone is already submitted",
		);
	}
	const created = await db.transaction(async (tx) => {
		let saved: typeof projectReports.$inferSelect;
		if (existing) {
			const [updated] = await tx
				.update(projectReports)
				.set({ remarks: body.remarks ?? null })
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
					reportType: body.reportType,
					remarks: body.remarks ?? null,
					storagePath: null,
				})
				.returning();
			if (!report)
				throw new ApiError(500, "INSERT_FAILED", "Failed to create report");
			saved = report;
		}

		await insertAuditLog(
			{
				userId: user.userId,
				action: `${existing ? "Updated" : "Created"} report draft ${saved.reportId}`,
				tableAffected: "project_reports",
				newValue: { reportType: body.reportType },
				ipAddress,
			},
			tx,
		);

		return saved;
	});
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
		throw new ApiError(
			400,
			"UPLOAD_FAILED",
			`Supabase storage upload failed: ${uploadError.message}`,
		);
	}

	try {
		const updated = await db.transaction(async (tx) => {
			const [saved] = await tx
				.update(projectReports)
				.set({
					storagePath,
					contentHash,
					uploadedBy: user.userId,
					sourceIp: ipAddress,
				})
				.where(eq(projectReports.reportId, reportId))
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

		const milestoneReports = await db
			.select({ reportType: projectReports.reportType })
			.from(projectReports)
			.where(
				and(
					eq(projectReports.milestoneId, report.milestoneId),
					isNull(projectReports.archivedAt),
					isNotNull(projectReports.storagePath),
				),
			);
		const [milestone] = await db
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
		const milestoneComplete =
			milestone?.reportType === REPORT_TYPE.PROGRESS ||
			(milestone?.reportType === "Project Closure" &&
				hasFinalAccomplishment &&
				hasTerminal);
		if (milestoneComplete) {
			await db
				.update(projectReportingMilestones)
				.set({ completedAt: new Date() })
				.where(eq(projectReportingMilestones.milestoneId, report.milestoneId));
		}
		const [projectStatusRow] = await db
			.select({
				projectStatus: projects.projectStatus,
				proposalId: projects.proposalId,
			})
			.from(projects)
			.where(eq(projects.projectId, report.projectId))
			.limit(1);
		if (
			milestone?.reportType === "Project Closure" &&
			hasFinalAccomplishment &&
			hasTerminal &&
			projectStatusRow?.projectStatus === PROJECT_STATUS.ONGOING
		) {
			const diff = captureAuditDiff(
				{ projectStatus: projectStatusRow.projectStatus },
				{ projectStatus: PROJECT_STATUS.PENDING_CLOSURE },
				["projectStatus"],
			);
			await db
				.update(projects)
				.set({
					projectStatus: PROJECT_STATUS.PENDING_CLOSURE,
					updatedAt: new Date(),
				})
				.where(eq(projects.projectId, report.projectId));
			await insertAuditLog({
				userId: user.userId,
				action: `Transitioned project ${report.projectId} to Pending Closure (all closure reports submitted)`,
				tableAffected: "projects",
				oldValue: diff.oldValue,
				newValue: diff.newValue,
				ipAddress,
			});
		}
		const directorIds = await getUserIdsByRole("Director");
		const readableType =
			report.reportType === REPORT_TYPE.PROGRESS
				? "Progress Report"
				: report.reportType === REPORT_TYPE.TERMINAL
					? "Terminal Report"
					: "Final Accomplishment Report";
		const [proposalRow] = await db
			.select({ title: proposals.title })
			.from(proposals)
			.where(eq(proposals.proposalId, projectStatusRow?.proposalId ?? ""))
			.limit(1);
		const projectTitle = proposalRow?.title ?? "Unknown Project";
		for (const directorId of directorIds) {
			await createNotification({
				recipientId: directorId,
				type: "report_submitted",
				title: "New Report Submitted",
				message: `A ${readableType} has been submitted for "${projectTitle}".`,
				sendEmail: true,
				emailSubject: `New Report: ${projectTitle}`,
				emailHtml: `<p>A <strong>${escapeHtml(readableType)}</strong> has been submitted for "<strong>${escapeHtml(projectTitle)}</strong>".</p>`,
			});
		}
		return updated;
	} catch (error) {
		await supabase.storage
			.from("documents")
			.remove([storagePath])
			.catch(() => undefined);
		throw error;
	}
}
