import { describe, expect, it } from "vitest";
import { PROPOSAL_STATUS, REVIEW_STAGE, ROLE_NAMES } from "@/lib/types.js";
import { resolveReviewPolicy } from "./proposal-review-policy.js";

describe("resolveReviewPolicy", () => {
	it("allows direct RET Chair endorsement without a document", () => {
		expect(
			resolveReviewPolicy({
				roleName: ROLE_NAMES.RET_CHAIR,
				status: PROPOSAL_STATUS.PENDING_REVIEW,
				bypassedRetChair: false,
			}, "Endorsed"),
		).toMatchObject({
			reviewStage: REVIEW_STAGE.ENDORSEMENT,
			newStatus: PROPOSAL_STATUS.ENDORSED,
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
			isDirectorReturningEndorsed: false,
		});
	});

	it("rejects Director approval of a pending proposal with a legacy bypass flag", () => {
		expect(() =>
			resolveReviewPolicy({
				roleName: ROLE_NAMES.DIRECTOR,
				status: PROPOSAL_STATUS.PENDING_REVIEW,
				bypassedRetChair: true,
			}, "Approved"),
		).toThrowError("Your role cannot review this proposal at its current stage.");
	});

	it("allows Chair return of a legacy bypassed pending proposal", () => {
		expect(resolveReviewPolicy({
			roleName: ROLE_NAMES.RET_CHAIR,
			status: PROPOSAL_STATUS.PENDING_REVIEW,
			bypassedRetChair: true,
		}, "Returned")).toMatchObject({ newStatus: PROPOSAL_STATUS.RETURNED });
	});

	it("allows Director review after direct endorsement without a document", () => {
		expect(resolveReviewPolicy({
			roleName: ROLE_NAMES.DIRECTOR,
			status: PROPOSAL_STATUS.ENDORSED,
			bypassedRetChair: false,
		}, "Approved")).toMatchObject({ newStatus: PROPOSAL_STATUS.APPROVED });
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
