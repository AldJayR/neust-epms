import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db/client.js";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { uploadProposalDocument } from "@/modules/storage/storage.service.js";
import { seedAuthUser, seedOrganization, seedProposal, seedProposalMember } from "./fixtures.js";

vi.mock("@/lib/supabase.js", () => ({
	supabase: { storage: { from: vi.fn(() => ({ upload: vi.fn().mockResolvedValue({ error: null }), remove: vi.fn().mockResolvedValue({ error: null }) })) } },
}));

describe("proposal document version allocation", () => {
	it("serializes concurrent uploads under the proposal lock without losing either version", async () => {
		const organization = await seedOrganization("document-versions");
		const leader = await seedAuthUser(organization, { slug: "document-leader", roleName: "Faculty" });
		const proposal = await seedProposal(organization, { title: "Concurrent uploads", status: "Draft" });
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");
		const file = new File(["%PDF-1.4\n"], "proposal.pdf", { type: "application/pdf" });
		const uploads = await Promise.all([
			uploadProposalDocument(leader, proposal.proposalId, file, "127.0.0.1"),
			uploadProposalDocument(leader, proposal.proposalId, file, "127.0.0.1"),
		]);
		expect(uploads.map((upload) => upload.versionNum).sort()).toEqual([1, 2]);
		expect(new Set(uploads.map((upload) => upload.storagePath)).size).toBe(2);
		const saved = await db.select().from(proposalDocuments).where(eq(proposalDocuments.proposalId, proposal.proposalId));
		expect(saved).toHaveLength(2);
	});
});
