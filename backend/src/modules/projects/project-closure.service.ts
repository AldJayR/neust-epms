import { randomUUID } from "node:crypto";
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db/client.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { reportAttachments } from "@/db/schema/report-attachments.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import { createNotification } from "@/lib/notification.helpers.js";
import { supabase } from "@/lib/supabase.js";
import {
	ATTACHMENT_TYPE,
	type AuthUser,
	PROJECT_STATUS,
	REPORT_TYPE,
	ROLE_NAMES,
} from "@/lib/types.js";
import { isPdfFile, MAX_PDF_UPLOAD_BYTES } from "@/services/file.service.js";
import { hashFileSha256 } from "@/services/file-integrity.service.js";
import { removeStorageObject } from "@/services/storage-cleanup.service.js";

/** Used before upload and again under the project lock before committing. */
async function getClosureReadyProject(
	id: string,
	executor: Pick<typeof db, "select">,
	lock = false,
) {
	const query = executor
		.select({
			projectId: projects.projectId,
			proposalId: projects.proposalId,
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
	const [project] = await (lock ? query.for("update") : query);
	if (!project) throw new ApiError(404, "NOT_FOUND", "Project not found");
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
	if (project.projectStatus !== PROJECT_STATUS.PENDING_CLOSURE) {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Only pending closure projects can be closed",
		);
	}

	const [report] = await executor
		.select({
			reportId: projectReports.reportId,
			traineeCount: projectReports.traineeCount,
			packageCompletedAt: projectReports.packageCompletedAt,
		})
		.from(projectReports)
		.where(
			and(
				eq(projectReports.projectId, project.projectId),
				eq(projectReports.reportType, REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL),
				isNull(projectReports.archivedAt),
				isNotNull(projectReports.storagePath),
			),
		)
		.limit(1);
	if (!report) {
		throw new ApiError(
			400,
			"MISSING_CLOSURE_REPORT",
			"An Accomplishment and Terminal Report must be submitted before closing",
		);
	}
	if (
		!report.packageCompletedAt ||
		report.traineeCount == null ||
		report.traineeCount < 0
	) {
		throw new ApiError(
			400,
			"INCOMPLETE_PACKAGE",
			"Complete the terminal package and trainee count before closure",
		);
	}
	const [evaluation] = await executor
		.select({ attachmentId: reportAttachments.attachmentId })
		.from(reportAttachments)
		.where(
			and(
				eq(reportAttachments.reportId, report.reportId),
				eq(reportAttachments.attachmentType, ATTACHMENT_TYPE.EVALUATION_FORMS),
				isNull(reportAttachments.archivedAt),
				isNotNull(reportAttachments.storagePath),
			),
		)
		.limit(1);
	if (!evaluation) {
		throw new ApiError(
			400,
			"MISSING_EVALUATION_FORMS",
			"Evaluation Forms are required before closing the project",
		);
	}
	return project;
}

export async function closeProject(
	id: string,
	user: AuthUser,
	file: File,
	ipAddress: string,
) {
	if (user.roleName !== ROLE_NAMES.DIRECTOR) {
		throw new ApiError(403, "FORBIDDEN", "Only the Director can close a project");
	}
	if (!(file instanceof File)) {
		throw new ApiError(
			400,
			"MISSING_SIGNED_TERMINAL_REPORT",
			"Upload the signed terminal report before closing the project",
		);
	}
	if (file.size > MAX_PDF_UPLOAD_BYTES) {
		throw new ApiError(
			413,
			"PAYLOAD_TOO_LARGE",
			"The signed terminal report must be 50MB or smaller",
		);
	}
	if (!(await isPdfFile(file))) {
		throw new ApiError(
			422,
			"INVALID_FILE_TYPE",
			"The signed terminal report must be a valid PDF",
		);
	}

	const project = await getClosureReadyProject(id, db);
	const storagePath = `projects/${project.projectId}/signed-terminal-report_${randomUUID()}.pdf`;
	const contentHash = await hashFileSha256(file);
	let result;
	try {
		const { error } = await supabase.storage
			.from("documents")
			.upload(storagePath, file, {
				contentType: "application/pdf",
				upsert: false,
			});
		if (error) {
			throw new ApiError(
				400,
				"UPLOAD_FAILED",
				"Unable to upload the signed terminal report. Please try again.",
			);
		}

		result = await db.transaction(async (tx) => {
			const latest = await getClosureReadyProject(project.projectId, tx, true);
			const completedAt = new Date();
			const [updated] = await tx
				.update(projects)
				.set({
					projectStatus: PROJECT_STATUS.CLOSED,
					signedTerminalReportDocPath: storagePath,
					signedTerminalReportHash: contentHash,
					actualEndDate: completedAt,
					updatedAt: completedAt,
				})
				.where(
					and(
						eq(projects.projectId, latest.projectId),
						eq(projects.projectStatus, PROJECT_STATUS.PENDING_CLOSURE),
						isNull(projects.archivedAt),
					),
				)
				.returning({ projectId: projects.projectId });
			if (!updated) {
				throw new ApiError(
					409,
					"UPDATE_CONFLICT",
					"Project changed before it could be closed",
				);
			}
			await insertAuditLog(
				{
					userId: user.userId,
					action: `Closed project ${latest.projectId}`,
					tableAffected: "projects",
					oldValue: { projectStatus: latest.projectStatus },
					newValue: {
						projectStatus: PROJECT_STATUS.CLOSED,
						signedTerminalReportDocPath: storagePath,
						signedTerminalReportHash: contentHash,
						actualEndDate: completedAt.toISOString(),
					},
					ipAddress,
				},
				tx,
			);
			const [proposal] = await tx
				.select({ title: proposals.title })
				.from(proposals)
				.where(eq(proposals.proposalId, latest.proposalId))
				.limit(1);
			const [leader] = await tx
				.select({ userId: proposalMembers.userId })
				.from(proposalMembers)
				.where(
					and(
						eq(proposalMembers.proposalId, latest.proposalId),
						eq(proposalMembers.projectRole, "Project Leader"),
						isNull(proposalMembers.archivedAt),
					),
				)
				.limit(1);
			return { updated, leader, title: proposal?.title ?? "Untitled" };
		});
	} catch (error) {
		// A failed or competing closure must not leave an unreferenced scan behind.
		await removeStorageObject("documents", storagePath);
		throw error;
	}
	if (result.leader) {
		await createNotification({
			recipientId: result.leader.userId,
			type: "project",
			title: "Terminal Report Approved",
			message: `The Director recorded the signed terminal report for "${result.title}". The project is officially closed.`,
			sendEmail: true,
		}).catch((error) => {
			console.error("[notification] Failed to notify leader on closure:", error);
		});
	}
	return result.updated;
}
