import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { projectReportingMilestones } from "@/db/schema/project-reporting-milestones.js";
import { getAuditStats, listAuditLogs } from "@/modules/audit/audit.service.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ROLE_NAMES, REPORT_TYPE, PROPOSAL_STATUS, PROJECT_STATUS } from "@/lib/types.js";
import {
	seedAuthUser,
	seedOrganization,
	seedPartnerAndMoa,
	seedProject,
	seedProposal,
	seedReport,
} from "./fixtures.js";

describe("audit persistence and reader", () => {
	it("resolves persisted entity UUIDs and actor data in audit results", async () => {
		const organization = await seedOrganization("audit-reader");
		const admin = await seedAuthUser(organization, {
			slug: "audit-admin",
			roleName: ROLE_NAMES.SUPER_ADMIN,
			department: null,
		});
		const director = await seedAuthUser(organization, {
			slug: "audit-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Audit Reader Proposal",
			status: PROPOSAL_STATUS.APPROVED,
		});
		const project = await seedProject(proposal.proposalId, {
			status: PROJECT_STATUS.ONGOING,
		});
		const { partner } = await seedPartnerAndMoa(organization, {
			slug: "audit-reader",
			validUntil: new Date("2099-12-31T00:00:00.000Z"),
		});
		const [milestone] = await db
			.insert(projectReportingMilestones)
			.values({
				projectId: project.projectId,
				reportType: REPORT_TYPE.PROGRESS,
				dueAt: new Date("2099-06-01T00:00:00.000Z"),
			})
			.returning();
		const report = await seedReport(
			project.projectId,
			milestone.milestoneId,
			director.userId,
			{ reportType: REPORT_TYPE.PROGRESS, storagePath: "reports/audit.pdf" },
		);

		await insertAuditLog({
			userId: director.userId,
			action: `Updated proposal ${proposal.proposalId} project ${project.projectId} user ${director.userId} partner ${partner.partnerId} report ${report.reportId}`,
			tableAffected: "projects",
			ipAddress: "127.0.0.1",
		});

		const result = await listAuditLogs(admin, {
			page: 1,
			limit: 10,
			search: "Updated",
		}, "127.0.0.1");

		expect(result.total).toBe(1);
		expect(result.items[0]?.actorRole).toBe(ROLE_NAMES.DIRECTOR);
		expect(result.items[0]?.actorName).toContain("audit-director");
		expect(result.items[0]?.action).toContain('"Audit Reader Proposal"');
		expect(result.items[0]?.action).toContain('"audit-reader Partner"');
		expect(result.items[0]?.action).toContain('"Progress"');
});

	it("counts today's actions, active users, account changes, and failed logins", async () => {
		const organization = await seedOrganization("audit-stats");
		const admin = await seedAuthUser(organization, {
			slug: "stats-admin",
			roleName: ROLE_NAMES.SUPER_ADMIN,
			department: null,
		});
		const director = await seedAuthUser(organization, {
			slug: "stats-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});

		const fixedNow = new Date("2099-06-15T12:00:00.000Z");
		await db.insert(auditLogs).values([
			{
				userId: admin.userId,
				action: "Failed login for stats-admin",
				tableAffected: "auth",
				createdAt: fixedNow,
			},
			{
				userId: director.userId,
				action: "Updated account",
				tableAffected: "users",
				createdAt: fixedNow,
			},
			{
				userId: admin.userId,
				action: "Updated proposal",
				tableAffected: "proposals",
				createdAt: fixedNow,
			},
		]);

		const stats = await getAuditStats(fixedNow);

		expect(stats).toEqual({
			totalActionsToday: 3,
			uniqueUsersActive: 2,
			accountChanges: 1,
			failedLogins: 1,
		});
});
});
