import { and, eq, lt } from "drizzle-orm";
import cron from "node-cron";
import { db } from "@/db/client.js";
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
 * RET Chair for the project's campus.
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

			// Find overdue reporting dates (past due, not completed, not archived)
			const overdueDates = await db
				.select({
					reportingDateId: projectReportingDates.id,
					reportingDate: projectReportingDates.reportingDate,
					scheduleId: projectReportingDates.scheduleId,
				})
				.from(projectReportingDates)
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

			console.log(
				`[CRON] Found ${overdueDates.length} overdue reporting date(s).`,
			);

			let notifiedCount = 0;

			for (const row of overdueDates) {
				const dateStr = new Date(row.reportingDate).toLocaleDateString();
				// Get the schedule → project → proposal chain
				const [schedule] = await db
					.select()
					.from(projectReportingSchedules)
					.where(eq(projectReportingSchedules.scheduleId, row.scheduleId))
					.limit(1);

				if (!schedule) continue;

				const [project] = await db
					.select()
					.from(projects)
					.where(eq(projects.projectId, schedule.projectId))
					.limit(1);

				if (!project) continue;

				// Skip closed/archived projects
				if (project.projectStatus === "Closed" || project.archivedAt) continue;

				if (project.projectStatus !== "Overdue") {
					await db
						.update(projects)
						.set({
							projectStatus: "Overdue",
							updatedAt: new Date(),
						})
						.where(eq(projects.projectId, project.projectId));

					if (systemUserId) {
						await insertAuditLog({
							userId: systemUserId,
							action: `Flagged project ${project.projectId} status as Overdue due to missed report deadline (${dateStr})`,
							tableAffected: "projects",
							ipAddress: "127.0.0.1",
						});
					}
				}

				const [proposal] = await db
					.select()
					.from(proposals)
					.where(eq(proposals.proposalId, project.proposalId))
					.limit(1);

				if (!proposal) continue;

				// Find the Project Leader
				const [leader] = await db
					.select({ userId: proposalMembers.userId })
					.from(proposalMembers)
					.where(
						and(
							eq(proposalMembers.proposalId, project.proposalId),
							eq(proposalMembers.projectRole, PROJECT_LEADER_ROLE),
						),
					)
					.limit(1);

				// Find the RET Chair for this campus
				const [retChair] = await db
					.select({ userId: users.userId })
					.from(users)
					.innerJoin(roles, eq(users.roleId, roles.roleId))
					.where(
						and(
							eq(roles.roleName, "RET Chair"),
							eq(users.campusId, proposal.campusId),
							eq(users.isActive, true),
						),
					)
					.limit(1);

				// Notify Project Leader
				if (leader) {
					await createNotification({
						recipientId: leader.userId,
						type: "report_overdue",
						title: "Report Overdue",
						message: `Your report for "${proposal.title}" was due on ${dateStr}. Please submit immediately.`,
						sendEmail: true,
						emailSubject: `Overdue Report: ${proposal.title}`,
						emailHtml: `<p>Your report for "<strong>${proposal.title}</strong>" was due on <strong>${dateStr}</strong>. Please submit immediately.</p>`,
					});
					notifiedCount++;
				}

				// Notify RET Chair
				if (retChair) {
					await createNotification({
						recipientId: retChair.userId,
						type: "report_overdue",
						title: "Report Overdue",
						message: `A report for "${proposal.title}" (${proposal.projectLocale}) was due on ${dateStr} and has not been submitted.`,
						sendEmail: true,
						emailSubject: `Overdue Report: ${proposal.title}`,
						emailHtml: `<p>A report for "<strong>${proposal.title}</strong>" (${proposal.projectLocale}) was due on <strong>${dateStr}</strong> and has not been submitted.</p>`,
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
