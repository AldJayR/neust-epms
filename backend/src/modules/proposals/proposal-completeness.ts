import { ApiError } from "@/lib/errors.js";

export interface ProposalCompletenessFacts {
	bannerProgramId: number | null | undefined;
	documentCount: number;
	members: readonly { projectRole: string }[];
	beneficiarySectorCount: number;
	sdgAlignmentCount: number;
	extensionServiceCount: number;
	targetStartDate: Date | string | null | undefined;
	targetEndDate: Date | string | null | undefined;
}

export function validateProposalCompleteness(
	facts: ProposalCompletenessFacts,
): void {
	if (facts.documentCount === 0) {
		throw incomplete("At least one proposal PDF document must be uploaded.");
	}

	if (facts.members.length === 0) {
		throw incomplete("At least one team member must be assigned.");
	}

	if (
		!facts.members.some((member) => member.projectRole === "Project Leader")
	) {
		throw incomplete(
			"At least one team member must have the Project Leader role.",
		);
	}

	if (facts.beneficiarySectorCount === 0) {
		throw incomplete(
			"At least one target beneficiary sector must be specified.",
		);
	}

	if (facts.sdgAlignmentCount === 0) {
		throw incomplete(
			"At least one Sustainable Development Goal (SDG) alignment must be specified.",
		);
	}

	if (facts.extensionServiceCount === 0) {
		throw incomplete(
			"At least one extension service offered to beneficiaries must be specified.",
		);
	}

	if (!facts.targetStartDate || !facts.targetEndDate) {
		throw incomplete("Target start and end dates are required.");
	}

	if (new Date(facts.targetStartDate) > new Date(facts.targetEndDate)) {
		throw incomplete("Target end date must be on or after target start date.");
	}

	if (!facts.bannerProgramId) {
		throw incomplete("A banner program must be selected.");
	}
}

function incomplete(message: string): ApiError {
	return new ApiError(400, "INCOMPLETE_PROPOSAL", message);
}
