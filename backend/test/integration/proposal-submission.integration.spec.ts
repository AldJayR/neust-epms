import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { validateCompleteness } from "@/modules/proposals/proposals.service.js";
import { PROPOSAL_STATUS, ROLE_NAMES } from "@/lib/types.js";
import {
	seedAuthUser,
	seedOrganization,
	seedProposal,
	seedProposalMember,
	seedProposalRelations,
} from "./fixtures.js";

describe("proposal submission completeness", () => {
	it("accepts a complete proposal from persisted relational requirements", async () => {
		const organization = await seedOrganization("submission-complete");
		const leader = await seedAuthUser(organization, {
			slug: "submission-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const proposal = await seedProposal(organization, {
			title: "Complete Submission Proposal",
			status: PROPOSAL_STATUS.DRAFT,
			targetStartDate: new Date("2099-01-01T00:00:00.000Z"),
			targetEndDate: new Date("2099-12-31T00:00:00.000Z"),
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");
		await seedProposalRelations(proposal.proposalId);

		await expect(validateCompleteness(proposal.proposalId)).resolves.toBeUndefined();
	});

	it("rejects a proposal when no proposal document is persisted", async () => {
		const organization = await seedOrganization("submission-missing-document");
		const leader = await seedAuthUser(organization, {
			slug: "archived-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const proposal = await seedProposal(organization, {
			title: "Archived Document Proposal",
			targetStartDate: new Date("2099-01-01T00:00:00.000Z"),
			targetEndDate: new Date("2099-12-31T00:00:00.000Z"),
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");
		await seedProposalRelations(proposal.proposalId);
		await db
			.delete(proposalDocuments)
			.where(eq(proposalDocuments.proposalId, proposal.proposalId));

		await expect(validateCompleteness(proposal.proposalId)).rejects.toMatchObject({
			code: "INCOMPLETE_PROPOSAL",
		});
	});
});
