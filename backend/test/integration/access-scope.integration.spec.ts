import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { proposals } from "@/db/schema/proposals.js";
import { listProjects } from "@/modules/projects/projects.service.js";
import { listReports } from "@/modules/reports/reports.service.js";
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

describe("database-backed access scope", () => {
	it("limits Faculty project and report lists to the main-campus department", async () => {
		const organization = await seedOrganization("scope-main");
		const faculty = await seedAuthUser(organization, {
			slug: "scope-faculty",
			roleName: ROLE_NAMES.FACULTY,
			department: organization.departmentA,
		});
		const visibleProposal = await seedProposal(organization, {
			title: "Visible Department Proposal",
			status: PROPOSAL_STATUS.APPROVED,
			department: organization.departmentA,
		});
		const hiddenProposal = await seedProposal(organization, {
			title: "Hidden Department Proposal",
			status: PROPOSAL_STATUS.APPROVED,
			department: organization.departmentB,
		});
		await seedProposalMember(visibleProposal.proposalId, faculty.userId, "Project Leader");
		await seedProposalMember(hiddenProposal.proposalId, faculty.userId, "Project Leader");
		const visibleProject = await seedProject(visibleProposal.proposalId, {
			status: PROJECT_STATUS.ONGOING,
		});
		await seedProject(hiddenProposal.proposalId, {
			status: PROJECT_STATUS.ONGOING,
		});
		const milestone = await seedMilestone(
			visibleProject.projectId,
			REPORT_TYPE.PROGRESS,
			new Date("2099-01-01T00:00:00.000Z"),
		);
		await seedReport(visibleProject.projectId, milestone.milestoneId, faculty.userId, {
			reportType: REPORT_TYPE.PROGRESS,
			storagePath: "reports/visible.pdf",
		});

		const projectList = await listProjects(faculty, { page: 1, limit: 20 });
		const reportList = await listReports(faculty, { page: 1, limit: 20 });

		expect(projectList.items.map((item) => item.proposalId)).toEqual([
			visibleProposal.proposalId,
		]);
		expect(reportList.items.map((item) => item.projectId)).toEqual([
			visibleProject.projectId,
		]);
		const [hidden] = await db
			.select({ title: proposals.title })
			.from(proposals)
			.where(eq(proposals.proposalId, hiddenProposal.proposalId));
		expect(hidden?.title).toBe("Hidden Department Proposal");
	});
});
