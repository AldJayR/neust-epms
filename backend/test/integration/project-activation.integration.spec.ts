import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { auditLogs } from "@/db/schema/audit-logs.js";
import { projectReportingMilestones } from "@/db/schema/project-reporting-milestones.js";
import { projects } from "@/db/schema/projects.js";
import { activateProject } from "@/modules/projects/projects.service.js";
import { PROJECT_STATUS, ROLE_NAMES, PROPOSAL_STATUS } from "@/lib/types.js";
import {
	seedAuthUser,
	seedPartnerAndMoa,
	seedOrganization,
	seedProject,
	seedProposal,
	seedProposalMember,
	seedSpecialOrder,
} from "./fixtures.js";

describe("project activation", () => {
	it("links a valid MOA, transitions to Ongoing, adds milestones, and audits", async () => {
		const organization = await seedOrganization("activation-success");
		const leader = await seedAuthUser(organization, {
			slug: "activation-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const director = await seedAuthUser(organization, {
			slug: "activation-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Activation Proposal",
			status: PROPOSAL_STATUS.APPROVED,
		});
		const member = await seedProposalMember(
			proposal.proposalId,
			leader.userId,
			"Project Leader",
		);
		const project = await seedProject(proposal.proposalId);
		const { moa } = await seedPartnerAndMoa(organization, {
			slug: "activation-valid",
			validUntil: new Date("2099-12-31T00:00:00.000Z"),
		});
		await seedSpecialOrder(member.memberId);

		await activateProject(
			project.projectId,
			{
				moaId: moa.moaId,
				milestones: [
					{
						reportType: "Progress",
						dueAt: "2099-06-01T00:00:00.000Z",
					},
					{
						reportType: "Project Closure",
						dueAt: "2099-12-01T00:00:00.000Z",
					},
				],
			},
			director,
			"127.0.0.1",
		);

		const [savedProject] = await db
			.select({ projectStatus: projects.projectStatus, moaId: projects.moaId })
			.from(projects)
			.where(eq(projects.projectId, project.projectId));
		const [milestoneCount] = await db
			.select({ value: count() })
			.from(projectReportingMilestones)
			.where(eq(projectReportingMilestones.projectId, project.projectId));
		const [audit] = await db
			.select({ action: auditLogs.action })
			.from(auditLogs)
			.where(eq(auditLogs.userId, director.userId));

		expect(savedProject).toEqual({
			projectStatus: PROJECT_STATUS.ONGOING,
			moaId: moa.moaId,
		});
		expect(Number(milestoneCount?.value)).toBe(2);
		expect(audit?.action).toContain("Activated project");
	});

	it("rejects incomplete special orders without changing project state", async () => {
		const organization = await seedOrganization("activation-blocked");
		const leader = await seedAuthUser(organization, {
			slug: "blocked-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const director = await seedAuthUser(organization, {
			slug: "blocked-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Blocked Activation Proposal",
			status: PROPOSAL_STATUS.APPROVED,
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");
		const project = await seedProject(proposal.proposalId);
		const { moa } = await seedPartnerAndMoa(organization, {
			slug: "activation-blocked-moa",
			validUntil: new Date("2099-12-31T00:00:00.000Z"),
		});

		await expect(
			activateProject(
				project.projectId,
				{
					moaId: moa.moaId,
					milestones: [
						{
							reportType: "Progress",
							dueAt: "2099-06-01T00:00:00.000Z",
						},
					],
				},
				director,
				"127.0.0.1",
			),
		).rejects.toMatchObject({ code: "INCOMPLETE_SPECIAL_ORDERS" });

		const [savedProject] = await db
			.select({ projectStatus: projects.projectStatus, moaId: projects.moaId })
			.from(projects)
			.where(eq(projects.projectId, project.projectId));
		const [milestoneCount] = await db
			.select({ value: count() })
			.from(projectReportingMilestones)
			.where(eq(projectReportingMilestones.projectId, project.projectId));

		expect(savedProject).toEqual({
			projectStatus: PROJECT_STATUS.APPROVED,
			moaId: null,
		});
		expect(Number(milestoneCount?.value)).toBe(0);
	});
});
