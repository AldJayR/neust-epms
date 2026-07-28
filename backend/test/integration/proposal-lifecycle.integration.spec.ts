import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposalReviews } from "@/db/schema/proposal-reviews.js";
import { proposals } from "@/db/schema/proposals.js";
import { processReview } from "@/modules/proposals/proposals.service.js";
import { ROLE_NAMES, PROPOSAL_STATUS } from "@/lib/types.js";
import {
	seedAuthUser,
	seedOrganization,
	seedProposal,
	seedProposalMember,
} from "./fixtures.js";

describe("proposal review lifecycle", () => {
	it("persists RET endorsement, Director approval, review history, and project creation", async () => {
		const organization = await seedOrganization("review-lifecycle");
		const leader = await seedAuthUser(organization, {
			slug: "review-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const retChair = await seedAuthUser(organization, {
			slug: "review-chair",
			roleName: ROLE_NAMES.RET_CHAIR,
		});
		const director = await seedAuthUser(organization, {
			slug: "review-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Review Lifecycle Proposal",
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");

		await processReview(retChair, proposal.proposalId, {
			decision: "Endorsed",
			comments: "Ready for approval",
		});
		await processReview(director, proposal.proposalId, {
			decision: "Approved",
		});

		const [savedProposal] = await db
			.select({ status: proposals.status, revisionNum: proposals.revisionNum })
			.from(proposals)
			.where(eq(proposals.proposalId, proposal.proposalId));
		const [reviewCount] = await db
			.select({ value: count() })
			.from(proposalReviews)
			.where(eq(proposalReviews.proposalId, proposal.proposalId));
		const [project] = await db
			.select({ projectStatus: projects.projectStatus })
			.from(projects)
			.where(eq(projects.proposalId, proposal.proposalId));

		expect(savedProposal).toEqual({
			status: PROPOSAL_STATUS.APPROVED,
			revisionNum: 0,
		});
		expect(Number(reviewCount?.value)).toBe(2);
		expect(project).toEqual({ projectStatus: "Approved" });
	});

	it("increments the revision and records a RET Chair return", async () => {
		const organization = await seedOrganization("review-return");
		const leader = await seedAuthUser(organization, {
			slug: "return-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const retChair = await seedAuthUser(organization, {
			slug: "return-chair",
			roleName: ROLE_NAMES.RET_CHAIR,
		});
		const proposal = await seedProposal(organization, {
			title: "Returned Review Proposal",
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");

		await processReview(retChair, proposal.proposalId, {
			decision: "Returned",
			comments: "Please revise the scope",
		});

		const [savedProposal] = await db
			.select({ status: proposals.status, revisionNum: proposals.revisionNum })
			.from(proposals)
			.where(eq(proposals.proposalId, proposal.proposalId));
		expect(savedProposal).toEqual({
			status: PROPOSAL_STATUS.RETURNED,
			revisionNum: 1,
		});
	});

	it("allows a Director to approve a bypassed proposal but blocks RET Chair review", async () => {
		const organization = await seedOrganization("review-bypass");
		const leader = await seedAuthUser(organization, {
			slug: "bypass-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const retChair = await seedAuthUser(organization, {
			slug: "bypass-chair",
			roleName: ROLE_NAMES.RET_CHAIR,
		});
		const director = await seedAuthUser(organization, {
			slug: "bypass-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Bypassed Review Proposal",
			bypassedRetChair: true,
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");

		await expect(
			processReview(retChair, proposal.proposalId, { decision: "Endorsed" }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await processReview(director, proposal.proposalId, { decision: "Approved" });

		const [savedProposal] = await db
			.select({ status: proposals.status })
			.from(proposals)
			.where(eq(proposals.proposalId, proposal.proposalId));
		expect(savedProposal?.status).toBe(PROPOSAL_STATUS.APPROVED);
	});
});
