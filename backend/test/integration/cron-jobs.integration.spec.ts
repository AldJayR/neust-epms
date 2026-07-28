import { count, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { runMoaExpiration } from "@/cron/moa-expiration.js";
import { runReportOverdue } from "@/cron/report-overdue.js";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { notifications } from "@/db/schema/notifications.js";
import { projectReportingMilestones } from "@/db/schema/project-reporting-milestones.js";
import { projects } from "@/db/schema/projects.js";
import { db } from "@/db/client.js";
import { ROLE_NAMES, PROJECT_STATUS } from "@/lib/types.js";
import {
	seedAuthUser,
	seedMilestone,
	seedOrganization,
	seedPartnerAndMoa,
	seedProject,
	seedProposal,
	seedProposalMember,
} from "./fixtures.js";

describe("scheduled workflow jobs", () => {
	it("expires an active project and deduplicates repeated MOA notifications", async () => {
		const organization = await seedOrganization("cron-moa");
		const director = await seedAuthUser(organization, {
			slug: "cron-moa-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Expired MOA Proposal",
		});
		const { moa } = await seedPartnerAndMoa(organization, {
			slug: "expired-moa",
			validUntil: new Date(Date.now() - 60 * 60 * 1000),
		});
		const project = await seedProject(proposal.proposalId, {
			status: PROJECT_STATUS.ONGOING,
			moaId: moa.moaId,
		});

		await runMoaExpiration();
		await runMoaExpiration();

		const [savedProject] = await db
			.select({ projectStatus: projects.projectStatus })
			.from(projects)
			.where(eq(projects.projectId, project.projectId));
		const [notificationCount] = await db
			.select({ value: count() })
			.from(notifications)
			.where(eq(notifications.recipientId, director.userId));
		const [audit] = await db
			.select({ action: auditLogs.action })
			.from(auditLogs)
			.where(eq(auditLogs.userId, director.userId));

		expect(savedProject?.projectStatus).toBe(PROJECT_STATUS.EXPIRED);
		expect(Number(notificationCount?.value)).toBe(1);
		expect(audit?.action).toContain("Expired due to MOA expiration");
	});

	it("marks overdue reports and notifies both the leader and scoped RET Chair once", async () => {
		const organization = await seedOrganization("cron-report");
		const leader = await seedAuthUser(organization, {
			slug: "cron-report-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const retChair = await seedAuthUser(organization, {
			slug: "cron-report-chair",
			roleName: ROLE_NAMES.RET_CHAIR,
		});
		const director = await seedAuthUser(organization, {
			slug: "cron-report-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Overdue Report Proposal",
		});
		await seedProposalMember(
			proposal.proposalId,
			leader.userId,
			"Project Leader",
		);
		const project = await seedProject(proposal.proposalId, {
			status: PROJECT_STATUS.ONGOING,
		});
		const milestone = await seedMilestone(
			project.projectId,
			"Progress",
			new Date(Date.now() - 60 * 60 * 1000),
		);

		await runReportOverdue();
		await runReportOverdue();

		const [savedProject] = await db
			.select({ projectStatus: projects.projectStatus })
			.from(projects)
			.where(eq(projects.projectId, project.projectId));
		const notificationRows = await db
			.select({ recipientId: notifications.recipientId })
			.from(notifications)
			.where(
				inArray(notifications.recipientId, [leader.userId, retChair.userId]),
			);
		const [audit] = await db
			.select({ action: auditLogs.action })
			.from(auditLogs)
			.where(eq(auditLogs.userId, director.userId));
		const [milestoneRow] = await db
			.select({ milestoneId: projectReportingMilestones.milestoneId })
			.from(projectReportingMilestones)
			.where(eq(projectReportingMilestones.milestoneId, milestone.milestoneId));

		expect(savedProject?.projectStatus).toBe(PROJECT_STATUS.OVERDUE);
		expect(notificationRows.map((row) => row.recipientId).sort()).toEqual(
			[leader.userId, retChair.userId].sort(),
		);
		expect(audit?.action).toContain("Overdue due to missed report deadline");
		expect(milestoneRow?.milestoneId).toBe(milestone.milestoneId);
	});
});
