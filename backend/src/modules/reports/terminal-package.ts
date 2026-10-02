import { and, eq, isNull } from "drizzle-orm";
import type { db } from "@/db/client.js";
import { projectReportingMilestones } from "@/db/schema/project-reporting-milestones.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { reportAttachments } from "@/db/schema/report-attachments.js";
import { insertAuditLog } from "@/lib/audit.js";
import {
	createNotification,
	getUserIdsByRole,
} from "@/lib/notification.helpers.js";
import {
	ATTACHMENT_TYPE,
	type AuthUser,
	PROJECT_STATUS,
	REPORT_TYPE,
	ROLE_NAMES,
} from "@/lib/types.js";

export type ReportTransaction = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

/** Best-effort delivery after the package transaction has committed. */
export async function notifyTerminalReady(reportId: string): Promise<void> {
	try {
		const recipients = await getUserIdsByRole(ROLE_NAMES.DIRECTOR);
		for (const recipientId of recipients)
			await createNotification({
				recipientId,
				type: "report_submitted",
				dedupeKey: `terminal-package:${reportId}:${recipientId}`,
				title: "Terminal report ready for review",
				message:
					"The terminal report, evaluation forms and trainee count are complete. You can now review the project for closure.",
			});
	} catch (error) {
		console.error("[notification] Terminal report notification failed", error);
	}
}

/** Called inside the same transaction that persists a required document. */
export async function finalizeTerminalPackage(
	tx: ReportTransaction,
	reportId: string,
	user: AuthUser,
	ipAddress: string,
): Promise<boolean> {
	const [report] = await tx
		.select()
		.from(projectReports)
		.where(
			and(
				eq(projectReports.reportId, reportId),
				isNull(projectReports.archivedAt),
			),
		)
		.for("update");
	if (
		!report ||
		report.reportType !== REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL ||
		report.packageCompletedAt ||
		!report.storagePath ||
		report.traineeCount === null ||
		report.traineeCount === undefined
	)
		return false;
	const [evaluation] = await tx
		.select({ id: reportAttachments.attachmentId })
		.from(reportAttachments)
		.where(
			and(
				eq(reportAttachments.reportId, reportId),
				eq(reportAttachments.attachmentType, ATTACHMENT_TYPE.EVALUATION_FORMS),
				isNull(reportAttachments.archivedAt),
			),
		)
		.limit(1);
	if (!evaluation) return false;
	const [project] = await tx
		.select()
		.from(projects)
		.where(
			and(
				eq(projects.projectId, report.projectId),
				isNull(projects.archivedAt),
			),
		)
		.for("update");
	if (
		!project ||
		![PROJECT_STATUS.ONGOING, PROJECT_STATUS.OVERDUE].includes(
			project.projectStatus as "Ongoing" | "Overdue",
		)
	)
		return false;
	const completedAt = new Date();
	await tx
		.update(projectReports)
		.set({ packageCompletedAt: completedAt })
		.where(eq(projectReports.reportId, reportId));
	await tx
		.update(projectReportingMilestones)
		.set({ completedAt })
		.where(eq(projectReportingMilestones.milestoneId, report.milestoneId));
	await tx
		.update(projects)
		.set({
			projectStatus: PROJECT_STATUS.PENDING_CLOSURE,
			updatedAt: completedAt,
		})
		.where(eq(projects.projectId, report.projectId));
	await insertAuditLog(
		{
			userId: user.userId,
			action: `Completed terminal package ${reportId}`,
			tableAffected: "project_reports",
			newValue: {
				traineeCount: report.traineeCount,
				projectStatus: PROJECT_STATUS.PENDING_CLOSURE,
			},
			ipAddress,
		},
		tx,
	);
	return true;
}
