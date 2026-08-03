import { describe, expect, it } from "vitest";
import { validateProposalCompleteness } from "./proposal-completeness.js";

const complete = {
	bannerProgramId: 1,
	documentCount: 1,
	members: [{ projectRole: "Project Leader" }],
	beneficiarySectorCount: 1,
	sdgAlignmentCount: 1,
	extensionServiceCount: 1,
	targetStartDate: new Date("2026-01-01"),
	targetEndDate: new Date("2026-12-31"),
};

describe("validateProposalCompleteness", () => {
	it("accepts a complete proposal", () => {
		expect(() => validateProposalCompleteness(complete)).not.toThrow();
	});

	it.each([
		["documentCount", "At least one proposal PDF document must be uploaded."],
		["beneficiarySectorCount", "At least one target beneficiary sector must be specified."],
		["sdgAlignmentCount", "At least one Sustainable Development Goal (SDG) alignment must be specified."],
		["extensionServiceCount", "At least one extension service offered to beneficiaries must be specified."],
	])("rejects a proposal with no %s", (field, message) => {
		expect(() =>
			validateProposalCompleteness({ ...complete, [field]: 0 }),
		).toThrowError(message);
	});

	it("requires a project leader", () => {
		expect(() =>
			validateProposalCompleteness({
				...complete,
				members: [{ projectRole: "Member" }],
			}),
		).toThrowError("At least one team member must have the Project Leader role.");
	});

	it("requires both target dates in chronological order", () => {
		expect(() =>
			validateProposalCompleteness({ ...complete, targetStartDate: null }),
		).toThrowError("Target start and end dates are required.");
		expect(() =>
			validateProposalCompleteness({
				...complete,
				targetStartDate: new Date("2027-01-01"),
				targetEndDate: new Date("2026-12-31"),
			}),
		).toThrowError("Target end date must be on or after target start date.");
	});
});
