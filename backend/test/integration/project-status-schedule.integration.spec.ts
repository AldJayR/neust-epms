import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { projects } from "@/db/schema/projects.js";
import {
	getProjectReportingSchedule,
	transitionProjectStatus,
} from "@/modules/projects/projects.service.js";
import { PROJECT_STATUS, PROPOSAL_STATUS, REPORT_TYPE, ROLE_NAMES } from "@/lib/types.js";
import {
	seedAuthUser,
	seedMilestone,
	seedOrganization,
	seedPartnerAndMoa,
	seedProject,
	seedProposal,
	seedProposalMember,
	seedReport,
} from "./fixtures.js";

describe("project status and reporting schedule", () => {
	it("persists approved-to-ongoing and ongoing-to-completed transitions", async () => {
		const organization = await seedOrganization("status-transition");
		const director = await seedAuthUser(organization, {
			slug: "status-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Status Transition Proposal",
			status: PROPOSAL_STATUS.APPROVED,
		});
		const { moa } = await seedPartnerAndMoa(organization, {
			slug: "status-moa",
			validUntil: new Date("2099-12-31T00:00:00.000Z"),
		});
		const project = await seedProject(proposal.proposalId, { moaId: moa.moaId });

		await transitionProjectStatus(
			project.projectId,
			PROJECT_STATUS.ONGOING,
			director,
			"127.0.0.1",
		);
		await transitionProjectStatus(
			project.projectId,
			PROJECT_STATUS.COMPLETED,
			director,
			"127.0.0.1",
		);

		const [savedProject] = await db
			.select({ projectStatus: projects.projectStatus })
			.from(projects)
			.where(eq(projects.projectId, project.projectId));
		const [auditCount] = await db
			.select({ value: count() })
			.from(auditLogs)
			.where(eq(auditLogs.userId, director.userId));

		expect(savedProject?.projectStatus).toBe(PROJECT_STATUS.COMPLETED);
		expect(Number(auditCount?.value)).toBe(2);
	});

	it("classifies incomplete milestones as overdue and upcoming", async () => {
		const organization = await seedOrganization("schedule");
		const leader = await seedAuthUser(organization, {
			slug: "schedule-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const proposal = await seedProposal(organization, {
			title: "Schedule Proposal",
			status: PROPOSAL_STATUS.APPROVED,
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");
		const project = await seedProject(proposal.proposalId, {
			status: PROJECT_STATUS.ONGOING,
		});
		const overdue = await seedMilestone(
			project.projectId,
			REPORT_TYPE.PROGRESS,
			new Date("2020-01-01T00:00:00.000Z"),
		);
		const upcoming = await seedMilestone(
			project.projectId,
			REPORT_TYPE.PROGRESS,
			new Date("2099-01-01T00:00:00.000Z"),
		);
		await seedReport(project.projectId, overdue.milestoneId, leader.userId, {
			reportType: REPORT_TYPE.PROGRESS,
			storagePath: "reports/overdue.pdf",
		});

		const schedule = await getProjectReportingSchedule(project.projectId);

		expect(schedule.overdue).toHaveLength(1);
		expect(schedule.overdue[0]?.id).toBe(overdue.milestoneId);
		expect(schedule.upcoming).toHaveLength(1);
		expect(schedule.upcoming[0]?.id).toBe(upcoming.milestoneId);
		const [uploaded] = await db
			.select({ storagePath: projectReports.storagePath })
			.from(projectReports)
			.where(eq(projectReports.milestoneId, overdue.milestoneId));
		expect(uploaded?.storagePath).toBe("reports/overdue.pdf");
	});
});
