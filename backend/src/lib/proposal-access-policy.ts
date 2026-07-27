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
