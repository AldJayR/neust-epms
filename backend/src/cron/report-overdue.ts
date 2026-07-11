import { and, eq, lt } from "drizzle-orm";
import cron from "node-cron";
import { db } from "@/db/client.js";
import { campuses } from "@/db/schema/campuses.js";
import { projectReportingDates } from "@/db/schema/project-reporting-dates.js";
import { projectReportingSchedules } from "@/db/schema/project-reporting-schedules.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { roles } from "@/db/schema/roles.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { createNotification } from "@/lib/notification.helpers.js";

const PROJECT_LEADER_ROLE = "Project Leader";

/**
 * Process 7.7: Monitor Report Deadlines
 *
 * Runs daily at 02:00 AM. Finds reporting dates that are past due
 * and not yet completed, then notifies the Project Leader and
 * RET Chair for the project's scope: department at a main campus,
 * or the whole campus elsewhere.
 */
async function getSystemExecutorId(): Promise<string | null> {
	try {
		const [dir] = await db
			.select({ userId: users.userId })
			.from(users)
			.innerJoin(roles, eq(users.roleId, roles.roleId))
			.where(eq(roles.roleName, "Director"))
			.limit(1);
		if (dir) return dir.userId;

		const [admin] = await db
			.select({ userId: users.userId })
			.from(users)
			.innerJoin(roles, eq(users.roleId, roles.roleId))
			.where(eq(roles.roleName, "Super Admin"))
			.limit(1);
		if (admin) return admin.userId;

		const [anyUser] = await db
			.select({ userId: users.userId })
			.from(users)
			.limit(1);
		if (anyUser) return anyUser.userId;
	} catch (e) {
		console.error("[CRON] Error finding system user for audit logging:", e);
	}
	return null;
}

export function startReportOverdueCron(): void {
	cron.schedule("0 2 * * *", async () => {
		console.log(
			`[CRON] Report overdue check started at ${new Date().toISOString()}`,
		);

		try {
			const now = new Date();
			const systemUserId = await getSystemExecutorId();

			// Load the complete overdue work set in one query instead of resolving
			// the schedule, project, proposal, and leader once per reporting date.
			const overdueDates = await db
				.select({
					reportingDateId: projectReportingDates.id,
					reportingDate: projectReportingDates.reportingDate,
					projectId: projects.projectId,
					projectStatus: projects.projectStatus,
					projectArchivedAt: projects.archivedAt,
					proposalId: proposals.proposalId,
					proposalTitle: proposals.title,
					proposalLocale: proposals.projectLocale,
					proposalCampusId: proposals.campusId,
					proposalDepartmentId: proposals.departmentId,
					leaderId: proposalMembers.userId,
				})
				.from(projectReportingDates)
				.innerJoin(
					projectReportingSchedules,
					eq(
						projectReportingDates.scheduleId,
						projectReportingSchedules.scheduleId,
					),
				)
				.innerJoin(
					projects,
					eq(projectReportingSchedules.projectId, projects.projectId),
				)
				.innerJoin(proposals, eq(projects.proposalId, proposals.proposalId))
				.leftJoin(
					proposalMembers,
					and(
						eq(proposalMembers.proposalId, proposals.proposalId),
						eq(proposalMembers.projectRole, PROJECT_LEADER_ROLE),
					),
				)
				.where(
					and(
						lt(projectReportingDates.reportingDate, now),
						eq(projectReportingDates.isCompleted, false),
					),
				);

			if (overdueDates.length === 0) {
				console.log("[CRON] No overdue reports found.");
				return;
			}

			// This list is small and fixed by institutional staffing. Resolving it
			// once avoids another database query for every overdue report.
			const retChairs = await db
				.select({
					userId: users.userId,
					campusId: users.campusId,
					departmentId: users.departmentId,
					isMainCampus: campuses.isMainCampus,
				})
				.from(users)
				.innerJoin(roles, eq(users.roleId, roles.roleId))
				.innerJoin(campuses, eq(users.campusId, campuses.campusId))
				.where(and(eq(roles.roleName, "RET Chair"), eq(users.isActive, true)));

			console.log(
				`[CRON] Found ${overdueDates.length} overdue reporting date(s).`,
			);

			let notifiedCount = 0;

			for (const row of overdueDates) {
				const dateStr = new Date(row.reportingDate).toLocaleDateString();

				// Skip closed/archived projects
				if (row.projectStatus === "Closed" || row.projectArchivedAt) continue;

				if (row.projectStatus !== "Overdue") {
					await db
						.update(projects)
						.set({
							projectStatus: "Overdue",
							updatedAt: new Date(),
						})
						.where(eq(projects.projectId, row.projectId));

					if (systemUserId) {
						await insertAuditLog({
							userId: systemUserId,
							action: `Flagged project ${row.projectId} status as Overdue due to missed report deadline (${dateStr})`,
							tableAffected: "projects",
							ipAddress: "127.0.0.1",
						});
					}
				}

				const retChair = retChairs.find(
					(chair) =>
						chair.campusId === row.proposalCampusId &&
						(!chair.isMainCampus ||
							chair.departmentId === row.proposalDepartmentId),
				);

				// Notify Project Leader
				if (row.leaderId) {
					await createNotification({
						recipientId: row.leaderId,
						type: "report_overdue",
						title: "Report Overdue",
						message: `Your report for "${row.proposalTitle}" was due on ${dateStr}. Please submit immediately.`,
						sendEmail: true,
						emailSubject: `Overdue Report: ${row.proposalTitle}`,
						emailHtml: `<p>Your report for "<strong>${row.proposalTitle}</strong>" was due on <strong>${dateStr}</strong>. Please submit immediately.</p>`,
					});
					notifiedCount++;
				}

				// Notify RET Chair
				if (retChair) {
					await createNotification({
						recipientId: retChair.userId,
						type: "report_overdue",
						title: "Report Overdue",
						message: `A report for "${row.proposalTitle}" (${row.proposalLocale}) was due on ${dateStr} and has not been submitted.`,
						sendEmail: true,
						emailSubject: `Overdue Report: ${row.proposalTitle}`,
						emailHtml: `<p>A report for "<strong>${row.proposalTitle}</strong>" (${row.proposalLocale}) was due on <strong>${dateStr}</strong> and has not been submitted.</p>`,
					});
					notifiedCount++;
				}
			}

			console.log(
				`[CRON] Report overdue check complete. Sent ${notifiedCount} notification(s).`,
			);
		} catch (err) {
			console.error("[CRON] Report overdue check failed:", err);
		}
	});

	console.log("[CRON] Report overdue cron job scheduled (daily at 02:00).");
}
