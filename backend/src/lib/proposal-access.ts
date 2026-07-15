import { eq } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposals } from "@/db/schema/proposals.js";
import { ApiError } from "@/lib/errors.js";
import { isProposalInScope } from "@/lib/scope-helpers.js";
import type { AuthUser } from "@/lib/types.js";

export type ProposalAccessRecord = {
	proposalId: string;
	campusId: number;
	departmentId: number;
	archivedAt: Date | null;
};

export function assertProposalAccess(
	user: AuthUser,
	proposal: ProposalAccessRecord,
): void {
	if (proposal.archivedAt || !isProposalInScope(user, proposal)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You do not have access to this proposal",
		);
	}
}

export async function getProposalAccess(
	user: AuthUser,
	proposalId: string,
): Promise<ProposalAccessRecord> {
	const [proposal] = await db
		.select({
			proposalId: proposals.proposalId,
			campusId: proposals.campusId,
			departmentId: proposals.departmentId,
			archivedAt: proposals.archivedAt,
		})
		.from(proposals)
		.where(eq(proposals.proposalId, proposalId))
		.limit(1);

	if (!proposal) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	assertProposalAccess(user, proposal);
	return proposal;
}
