import { eq } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposals } from "@/db/schema/proposals.js";
import { ApiError } from "@/lib/errors.js";
import type { AuthUser } from "@/lib/types.js";
import {
	assertProposalAccess,
	type ProposalAccessRecord,
} from "./proposal-access-policy.js";

export type { ProposalAccessRecord } from "./proposal-access-policy.js";
export { assertProposalAccess } from "./proposal-access-policy.js";

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
