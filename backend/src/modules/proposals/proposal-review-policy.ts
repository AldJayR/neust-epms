import { ApiError } from "@/lib/errors.js";
import {
	PROPOSAL_STATUS,
	REVIEW_DECISION,
	REVIEW_STAGE,
	ROLE_NAMES,
} from "@/lib/types.js";

export interface ReviewPolicyInput {
	roleName: string;
	status: string;
	bypassedRetChair: boolean;
}

export interface ReviewPolicyResult {
	reviewStage: string;
	newStatus: string;
	revisionIncrement: number;
	isDirectorReturningEndorsed: boolean;
}

export function resolveReviewPolicy(
	input: ReviewPolicyInput,
	decision: string,
): ReviewPolicyResult {
	let reviewStage: string;
	let newStatus: string;

	if (
		input.roleName === ROLE_NAMES.RET_CHAIR &&
		input.status === PROPOSAL_STATUS.PENDING_REVIEW
	) {
		if (input.bypassedRetChair) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"RET Chair review is bypassed for this proposal",
			);
		}

		reviewStage = REVIEW_STAGE.ENDORSEMENT;
		if (decision === REVIEW_DECISION.ENDORSED) {
			newStatus = PROPOSAL_STATUS.ENDORSED;
		} else if (decision === REVIEW_DECISION.RETURNED) {
			newStatus = PROPOSAL_STATUS.RETURNED;
		} else if (decision === REVIEW_DECISION.REJECTED) {
			newStatus = PROPOSAL_STATUS.REJECTED;
		} else {
			throw new ApiError(
				400,
				"INVALID_DECISION",
				"RET Chair can only Endorse, Return, or Reject at this stage",
			);
		}
	} else if (
		input.roleName === ROLE_NAMES.DIRECTOR &&
		input.status === PROPOSAL_STATUS.ENDORSED
	) {
		reviewStage = REVIEW_STAGE.APPROVAL;
		newStatus = resolveDirectorDecision(decision);
	} else if (
		input.roleName === ROLE_NAMES.DIRECTOR &&
		input.status === PROPOSAL_STATUS.PENDING_REVIEW &&
		input.bypassedRetChair
	) {
		reviewStage = REVIEW_STAGE.APPROVAL;
		newStatus = resolveDirectorDecision(decision);
	} else {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Cannot review proposal in its current state with your role",
		);
	}

	return {
		reviewStage,
		newStatus,
		revisionIncrement: newStatus === PROPOSAL_STATUS.RETURNED ? 1 : 0,
		isDirectorReturningEndorsed:
			input.roleName === ROLE_NAMES.DIRECTOR &&
			input.status === PROPOSAL_STATUS.ENDORSED &&
			newStatus === PROPOSAL_STATUS.RETURNED,
	};
}

function resolveDirectorDecision(decision: string): string {
	if (decision === REVIEW_DECISION.APPROVED) return PROPOSAL_STATUS.APPROVED;
	if (decision === REVIEW_DECISION.RETURNED) return PROPOSAL_STATUS.RETURNED;
	if (decision === REVIEW_DECISION.REJECTED) return PROPOSAL_STATUS.REJECTED;
	throw new ApiError(
		400,
		"INVALID_DECISION",
		"Director can only Approve, Return, or Reject at this stage",
	);
}
