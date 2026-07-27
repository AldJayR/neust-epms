import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import { closeProject } from "@/modules/projects/projects.service.js";
import { createReport } from "@/modules/reports/reports.service.js";
import { PROJECT_STATUS, PROPOSAL_STATUS, REPORT_TYPE, ROLE_NAMES } from "@/lib/types.js";
import {
	seedAuthUser,
	seedMilestone,
	seedOrganization,
	seedProject,
	seedProposal,
	seedProposalMember,
	seedReport,
} from "./fixtures.js";

describe("report and project closure integration", () => {
	it("creates a report draft only for an active project member", async () => {
		const organization = await seedOrganization("report-draft");
		const leader = await seedAuthUser(organization, {
			slug: "report-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const outsider = await seedAuthUser(organization, {
			slug: "report-outsider",
			roleName: ROLE_NAMES.FACULTY,
		});
		const proposal = await seedProposal(organization, {
			title: "Report Draft Proposal",
			status: PROPOSAL_STATUS.APPROVED,
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");
		const project = await seedProject(proposal.proposalId, {
			status: PROJECT_STATUS.ONGOING,
		});
		const milestone = await seedMilestone(
			project.projectId,
			REPORT_TYPE.PROGRESS,
			new Date("2099-06-01T00:00:00.000Z"),
		);

		const report = await createReport(
			leader,
			{ milestoneId: milestone.milestoneId, reportType: REPORT_TYPE.PROGRESS },
			"127.0.0.1",
		);

		expect(report).toMatchObject({
			reportId: expect.any(String),
			projectId: project.projectId,
			reportType: REPORT_TYPE.PROGRESS,
			storagePath: null,
		});
		await expect(
			createReport(
				outsider,
				{ milestoneId: milestone.milestoneId, reportType: REPORT_TYPE.PROGRESS },
				"127.0.0.1",
			),
		).rejects.toMatchObject({ code: "NOT_MEMBER" });
	});

	it("requires uploaded Terminal and Final Accomplishment reports before closing", async () => {
		const organization = await seedOrganization("report-close");
		const leader = await seedAuthUser(organization, {
			slug: "close-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const director = await seedAuthUser(organization, {
			slug: "close-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Closure Proposal",
			status: PROPOSAL_STATUS.APPROVED,
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");
		const project = await seedProject(proposal.proposalId, {
			status: PROJECT_STATUS.ONGOING,
		});
		const closureMilestone = await seedMilestone(
			project.projectId,
			"Project Closure",
			new Date("2099-12-01T00:00:00.000Z"),
		);

		await seedReport(project.projectId, closureMilestone.milestoneId, leader.userId, {
			reportType: REPORT_TYPE.TERMINAL,
			storagePath: "reports/terminal.pdf",
		});
		await expect(
			closeProject(project.projectId, director, "127.0.0.1"),
		).rejects.toMatchObject({ code: "MISSING_FINAL_ACCOMPLISHMENT_REPORT" });

		await seedReport(project.projectId, closureMilestone.milestoneId, leader.userId, {
			reportType: REPORT_TYPE.FINAL_ACCOMPLISHMENT,
			storagePath: "reports/final.pdf",
		});
		await closeProject(project.projectId, director, "127.0.0.1");

		const [savedProject] = await db
			.select({ projectStatus: projects.projectStatus, actualEndDate: projects.actualEndDate })
			.from(projects)
			.where(eq(projects.projectId, project.projectId));
		const [auditCount] = await db
			.select({ value: count() })
			.from(auditLogs)
			.where(eq(auditLogs.userId, director.userId));

		expect(savedProject?.projectStatus).toBe(PROJECT_STATUS.CLOSED);
		expect(savedProject?.actualEndDate).toBeInstanceOf(Date);
		expect(Number(auditCount?.value)).toBe(1);
	});
});
