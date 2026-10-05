export type ProposalReviewRole = "Director" | "RET Chair" | string;

export function canReviewProposal({
	role,
	status,
}: {
	role: ProposalReviewRole;
	status: string | undefined;
	bypassedRetChair: boolean;
	hasEndorsement: boolean;
}): boolean {
	if (role === "RET Chair") {
		return status === "Pending Review";
	}

	return role === "Director" && status === "Endorsed";
}

export function isProposalBypassedOrEndorsed(
	_bypassedRetChair: boolean,
	hasEndorsement: boolean,
): boolean {
	return hasEndorsement;
}

export function getReviewDecision(
	role: ProposalReviewRole,
): "Approved" | "Endorsed" {
	return role === "Director" ? "Approved" : "Endorsed";
}

export function getDefaultReviewComment(
	decision: "Approved" | "Endorsed",
): string {
	return decision === "Approved"
		? "Approved via review"
		: "Endorsed via review";
}

export function shouldBlockReviewAction(
	role: ProposalReviewRole,
	bypassedRetChair: boolean,
	hasEndorsement: boolean,
): boolean {
	return (
		role === "RET Chair" &&
		isProposalBypassedOrEndorsed(bypassedRetChair, hasEndorsement)
	);
}
