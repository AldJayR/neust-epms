import type { z } from "@hono/zod-openapi";
import { and, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db/client.js";
import { departments } from "@/db/schema/departments.js";
import { projectReportingDates } from "@/db/schema/project-reporting-dates.js";
import { projectReportingSchedules } from "@/db/schema/project-reporting-schedules.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { captureAuditDiff } from "@/lib/audit-diff.js";
import { ApiError } from "@/lib/errors.js";
import {
	createNotification,
	getUserIdsByRole,
} from "@/lib/notification.helpers.js";
import { buildProposalScope } from "@/lib/scope-helpers.js";
import { type AuthUser, PROJECT_STATUS, REPORT_TYPE } from "@/lib/types.js";
import type { CreateReportSchema, PaginationQuery } from "./reports.schema.js";

type CreateReportBody = z.infer<typeof CreateReportSchema>;
type Pagination = z.infer<typeof PaginationQuery>;

function serializeReport(report: {
	reportId: string;
	projectId: string;
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
	periodStart: Date | null;
	periodEnd: Date | null;
	archivedAt: Date | null;
}) {
	return {
		reportId: report.reportId,
		projectId: report.projectId,
		project: report.projectTitle,
		leader: `${report.leaderFirstName} ${report.leaderLastName}`,
		academicRank: report.leaderAcademicRank,
		avatarUrl: report.leaderAvatarUrl,
		department: report.departmentName,
		reportType: report.reportType,
		submitted: report.submittedAt.toISOString(),
		storagePath: report.storagePath,
		remarks: report.remarks,
		periodStart: report.periodStart?.toISOString() ?? null,
		periodEnd: report.periodEnd?.toISOString() ?? null,
		archivedAt: report.archivedAt?.toISOString() ?? null,
	};
}

const reportSelection = {
	reportId: projectReports.reportId,
	projectId: projectReports.projectId,
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
	periodStart: projectReports.periodStart,
	periodEnd: projectReports.periodEnd,
	archivedAt: projectReports.archivedAt,
};

export async function listReports(user: AuthUser, query: Pagination) {
	const { page, limit } = query;
	const whereConditions: SQL[] = [
		isNull(projectReports.archivedAt),
		...buildProposalScope(user),
	];
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
	const [project] = await db
		.select({ projectId: projects.projectId, proposalId: projects.proposalId })
		.from(projects)
		.where(
			and(eq(projects.projectId, body.projectId), isNull(projects.archivedAt)),
		)
		.limit(1);
	if (!project) throw new ApiError(404, "NOT_FOUND", "Project not found");
	const [membership] = await db
		.select({ memberId: proposalMembers.memberId })
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.proposalId, project.proposalId),
				eq(proposalMembers.userId, user.userId),
			),
		)
		.limit(1);
	if (!membership)
		throw new ApiError(
			403,
			"NOT_MEMBER",
			"Only project members can submit reports for this project",
		);
	const [schedule] = await db
		.select({ scheduleId: projectReportingSchedules.scheduleId })
		.from(projectReportingSchedules)
		.where(eq(projectReportingSchedules.projectId, body.projectId))
		.limit(1);
	if (schedule) {
		const allDueDates = await db
			.select()
			.from(projectReportingDates)
			.where(eq(projectReportingDates.scheduleId, schedule.scheduleId))
			.orderBy(projectReportingDates.reportingDate);
		const earliestIncomplete = allDueDates.find((date) => !date.isCompleted);
		if (
			earliestIncomplete &&
			allDueDates.filter(
				(date) =>
					!date.isCompleted &&
					date.reportingDate < earliestIncomplete.reportingDate,
			).length > 0
		)
			throw new ApiError(
				400,
				"SEQUENTIAL_VIOLATION",
				"Previous report must be submitted before the next one",
			);
	}
	const created = await db.transaction(async (tx) => {
		const [report] = await tx
			.insert(projectReports)
			.values({
				projectId: body.projectId,
				submittedById: user.userId,
				reportType: body.reportType,
				remarks: body.remarks ?? null,
				storagePath: null,
				periodStart: body.periodStart ? new Date(body.periodStart) : null,
				periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
			})
			.returning();
		if (!report)
			throw new ApiError(500, "INSERT_FAILED", "Failed to create report");
		const [transactionSchedule] = await tx
			.select({ scheduleId: projectReportingSchedules.scheduleId })
			.from(projectReportingSchedules)
			.where(eq(projectReportingSchedules.projectId, body.projectId))
			.limit(1);
		if (transactionSchedule) {
			const [earliestDueDate] = await tx
				.select()
				.from(projectReportingDates)
				.where(
					and(
						eq(
							projectReportingDates.scheduleId,
							transactionSchedule.scheduleId,
						),
						eq(projectReportingDates.isCompleted, false),
					),
				)
				.orderBy(projectReportingDates.reportingDate)
				.limit(1);
			if (earliestDueDate)
				await tx
					.update(projectReportingDates)
					.set({ isCompleted: true, completedAt: new Date() })
					.where(eq(projectReportingDates.id, earliestDueDate.id));
		}
		return report;
	});
	await insertAuditLog({
		userId: user.userId,
		action: `Submitted project report ${created.reportId} (${body.reportType}) for project ${body.projectId}`,
		tableAffected: "project_reports",
		ipAddress,
	});
	const reports = await db
		.select({ reportType: projectReports.reportType })
		.from(projectReports)
		.where(
			and(
				eq(projectReports.projectId, body.projectId),
				isNull(projectReports.archivedAt),
			),
		);
	const hasFinalAccomplishment = reports.some(
		(report) => report.reportType === REPORT_TYPE.FINAL_ACCOMPLISHMENT,
	);
	const hasTerminal = reports.some(
		(report) => report.reportType === REPORT_TYPE.TERMINAL,
	);
	const [projectStatusRow] = await db
		.select({ projectStatus: projects.projectStatus })
		.from(projects)
		.where(eq(projects.projectId, body.projectId))
		.limit(1);
	if (hasFinalAccomplishment && hasTerminal) {
		if (
			projectStatusRow &&
			projectStatusRow.projectStatus !== PROJECT_STATUS.PENDING_CLOSURE &&
			projectStatusRow.projectStatus !== PROJECT_STATUS.CLOSED &&
			projectStatusRow.projectStatus !== PROJECT_STATUS.COMPLETED
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
				.where(eq(projects.projectId, body.projectId));
			await insertAuditLog({
				userId: user.userId,
				action: `Transitioned project ${body.projectId} to Pending Closure (all closure reports submitted)`,
				tableAffected: "projects",
				oldValue: diff.oldValue,
				newValue: diff.newValue,
				ipAddress,
			});
		}
	} else if (projectStatusRow?.projectStatus === "Overdue") {
		await db
			.update(projects)
			.set({ projectStatus: "Ongoing", updatedAt: new Date() })
			.where(eq(projects.projectId, body.projectId));
		await insertAuditLog({
			userId: user.userId,
			action: `Cleared Overdue flag for project ${body.projectId} after report submission`,
			tableAffected: "projects",
			ipAddress,
		});
	}
	const directorIds = await getUserIdsByRole("Director");
	const readableType =
		body.reportType === "Progress"
			? "Progress Report"
			: body.reportType === "Terminal"
				? "Terminal Report"
				: "Final Accomplishment Report";
	const [proposalRow] = await db
		.select({ title: proposals.title })
		.from(proposals)
		.where(eq(proposals.proposalId, project.proposalId))
		.limit(1);
	const projectTitle = proposalRow?.title ?? "Unknown Project";
	for (const directorId of directorIds)
		await createNotification({
			recipientId: directorId,
			type: "report_submitted",
			title: "New Report Submitted",
			message: `A ${readableType} has been submitted for "${projectTitle}".`,
			sendEmail: true,
			emailSubject: `New Report: ${projectTitle}`,
			emailHtml: `<p>A <strong>${readableType}</strong> has been submitted for "<strong>${projectTitle}</strong>".</p>`,
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
