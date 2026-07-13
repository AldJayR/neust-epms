import { describe, expect, it } from "vitest";
import {
	canReviewProposal,
	getDefaultReviewComment,
	getReviewDecision,
	shouldBlockReviewAction,
} from "./proposal-review-helpers";

describe("proposal review helpers", () => {
	it("preserves RET Chair and Director review combinations", () => {
		expect(
			canReviewProposal({
				role: "RET Chair",
				status: "Pending Review",
				bypassedRetChair: false,
				hasEndorsement: false,
			}),
		).toBe(true);
		expect(
			canReviewProposal({
				role: "RET Chair",
				status: "Endorsed",
				bypassedRetChair: false,
				hasEndorsement: false,
			}),
		).toBe(false);
		expect(
			canReviewProposal({
				role: "Director",
				status: "Endorsed",
				bypassedRetChair: false,
				hasEndorsement: true,
			}),
		).toBe(true);
		expect(
			canReviewProposal({
				role: "Director",
				status: "Pending Review",
				bypassedRetChair: true,
				hasEndorsement: false,
			}),
		).toBe(true);
	});

	it("keeps the narrow RET invalid-action guard", () => {
		expect(shouldBlockReviewAction("RET Chair", true, false)).toBe(true);
		expect(shouldBlockReviewAction("RET Chair", false, true)).toBe(true);
		expect(shouldBlockReviewAction("Director", true, true)).toBe(false);
	});

	it("returns the existing decisions and default comments", () => {
		expect(getReviewDecision("Director")).toBe("Approved");
		expect(getReviewDecision("RET Chair")).toBe("Endorsed");
		expect(getDefaultReviewComment("Approved")).toBe("Approved via review");
		expect(getDefaultReviewComment("Endorsed")).toBe("Endorsed via review");
	});
});
