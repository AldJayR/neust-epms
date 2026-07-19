import { describe, expect, it } from "vitest";
import {
	canSubmitEditingProposal,
	getFieldsToValidate,
	getProposalWizardStepTitle,
	requiresProposalDocument,
} from "./proposal-wizard-helpers";

describe("proposal wizard helpers", () => {
	it("keeps the existing step validation fields and labels", () => {
		expect(getFieldsToValidate(1)).toEqual([]);
		expect(getFieldsToValidate(2)).toEqual([
			"title",
			"bannerProgram",
			"projectLocale",
			"extensionServiceIds",
			"campusId",
			"departmentId",
			"sdgIds",
			"beneficiarySectors",
		]);
		expect(getFieldsToValidate(3)).toEqual([
			"targetStartDate",
			"targetEndDate",
			"budgetPartner",
			"budgetNeust",
		]);
		expect(getFieldsToValidate(4)).toEqual(["members"]);
		expect(getProposalWizardStepTitle(5)).toBe("Attachments");
	});

	it("requires a document only for new submissions", () => {
		expect(requiresProposalDocument(true, false)).toBe(true);
		expect(requiresProposalDocument(false, false)).toBe(false);
		expect(requiresProposalDocument(true, true)).toBe(false);
	});

	it("only allows editing submissions from draft or returned status", () => {
		expect(canSubmitEditingProposal("Draft")).toBe(true);
		expect(canSubmitEditingProposal("Returned")).toBe(true);
		expect(canSubmitEditingProposal("Approved")).toBe(false);
	});
});
