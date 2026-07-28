import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { archiveExpiredProjects } from "@/cron/privacy-retention.js";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { proposals } from "@/db/schema/proposals.js";
import { specialOrders } from "@/db/schema/special-orders.js";
import { systemSettings } from "@/db/schema/system-settings.js";
import { db } from "@/db/client.js";
import { PROJECT_STATUS, ROLE_NAMES } from "@/lib/types.js";
import {
	seedAuthUser,
	seedMilestone,
	seedOrganization,
	seedProject,
	seedProposal,
	seedProposalMember,
	seedReport,
	seedSpecialOrder,
} from "./fixtures.js";

describe("privacy retention workflow", () => {
	it("reports eligible records during dry-run without archiving them", async () => {
		const organization = await seedOrganization("retention-dry-run");
		const leader = await seedAuthUser(organization, {
			slug: "retention-dry-run-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const proposal = await seedProposal(organization, {
			title: "Retention Dry Run Proposal",
		});
		const project = await seedProject(proposal.proposalId, {
			status: PROJECT_STATUS.CLOSED,
		});
		await db
			.update(projects)
			.set({ actualEndDate: new Date("2010-01-01T00:00:00.000Z") })
			.where(eq(projects.projectId, project.projectId));
		await db.insert(systemSettings).values({
			settingKey: "project_retention_years",
			settingValue: "10",
		});

		const result = await archiveExpiredProjects(
			new Date("2026-01-01T00:00:00.000Z"),
			{ dryRun: true },
		);

		const [savedProject] = await db
			.select({ archivedAt: projects.archivedAt })
			.from(projects)
			.where(eq(projects.projectId, project.projectId));
		expect(result).toEqual({ scanned: 1, archived: 0, dryRun: true });
		expect(savedProject?.archivedAt).toBeNull();
		expect(leader.userId).toBeDefined();
	});

	it("archives the project and all retention-linked records in one workflow", async () => {
		const organization = await seedOrganization("retention-archive");
		const leader = await seedAuthUser(organization, {
			slug: "retention-archive-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const director = await seedAuthUser(organization, {
			slug: "retention-archive-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Retention Archive Proposal",
		});
		const member = await seedProposalMember(
			proposal.proposalId,
			leader.userId,
			"Project Leader",
		);
		const project = await seedProject(proposal.proposalId, {
			status: PROJECT_STATUS.CLOSED,
		});
		await db
			.update(projects)
			.set({ actualEndDate: new Date("2010-01-01T00:00:00.000Z") })
			.where(eq(projects.projectId, project.projectId));
		const milestone = await seedMilestone(
			project.projectId,
			"Final Accomplishment",
			new Date("2010-06-01T00:00:00.000Z"),
		);
		await seedReport(project.projectId, milestone.milestoneId, leader.userId, {
			reportType: "Final Accomplishment",
		});
		await seedSpecialOrder(member.memberId);
		await db.insert(systemSettings).values({
			settingKey: "project_retention_years",
			settingValue: "10",
		});

		const result = await archiveExpiredProjects(
			new Date("2026-01-01T00:00:00.000Z"),
		);

		const [savedProject] = await db
			.select({ archivedAt: projects.archivedAt })
			.from(projects)
			.where(eq(projects.projectId, project.projectId));
		const [savedProposal] = await db
			.select({ archivedAt: proposals.archivedAt })
			.from(proposals)
			.where(eq(proposals.proposalId, proposal.proposalId));
		const [reportCount] = await db
			.select({ value: count() })
			.from(projectReports)
			.where(eq(projectReports.projectId, project.projectId));
		const [order] = await db
			.select({ archivedAt: specialOrders.archivedAt })
			.from(specialOrders)
			.where(eq(specialOrders.memberId, member.memberId));
		const [audit] = await db
			.select({ action: auditLogs.action })
			.from(auditLogs)
			.where(eq(auditLogs.userId, director.userId));

		expect(result).toEqual({ scanned: 1, archived: 1, dryRun: false });
		expect(savedProject?.archivedAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
		expect(savedProposal?.archivedAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
		expect(Number(reportCount?.value)).toBe(1);
		expect(order?.archivedAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
		expect(audit?.action).toContain("Archived project");
	});
});
