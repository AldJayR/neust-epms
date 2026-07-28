import { describe, expect, it } from "vitest";
import { PROPOSAL_STATUS, REVIEW_STAGE, ROLE_NAMES } from "@/lib/types.js";
import { resolveReviewPolicy } from "./proposal-review-policy.js";

describe("resolveReviewPolicy", () => {
	it("maps RET Chair endorsement to the endorsed state", () => {
		expect(
			resolveReviewPolicy({
				roleName: ROLE_NAMES.RET_CHAIR,
				status: PROPOSAL_STATUS.PENDING_REVIEW,
				bypassedRetChair: false,
			}, "Endorsed"),
		).toEqual({
			reviewStage: REVIEW_STAGE.ENDORSEMENT,
			newStatus: PROPOSAL_STATUS.ENDORSED,
			revisionIncrement: 0,
			isDirectorReturningEndorsed: false,
		});
	});

	it("increments the revision when a Director returns an endorsed proposal", () => {
		expect(
			resolveReviewPolicy({
				roleName: ROLE_NAMES.DIRECTOR,
				status: PROPOSAL_STATUS.ENDORSED,
				bypassedRetChair: false,
			}, "Returned"),
		).toEqual({
			reviewStage: REVIEW_STAGE.APPROVAL,
			newStatus: PROPOSAL_STATUS.RETURNED,
			revisionIncrement: 1,
			isDirectorReturningEndorsed: true,
		});
	});

	it("allows a bypassed pending proposal to be approved by the Director", () => {
		expect(
			resolveReviewPolicy({
				roleName: ROLE_NAMES.DIRECTOR,
				status: PROPOSAL_STATUS.PENDING_REVIEW,
				bypassedRetChair: true,
			}, "Approved"),
		).toMatchObject({
			reviewStage: REVIEW_STAGE.APPROVAL,
			newStatus: PROPOSAL_STATUS.APPROVED,
		});
	});

	it("rejects a decision that does not belong to the current review stage", () => {
		expect(() =>
			resolveReviewPolicy({
				roleName: ROLE_NAMES.RET_CHAIR,
				status: PROPOSAL_STATUS.PENDING_REVIEW,
				bypassedRetChair: false,
			}, "Approved"),
		).toThrowError("RET Chair can only Endorse, Return, or Reject at this stage");
	});
});
