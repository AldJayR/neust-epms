import type { FormValues } from "../components/proposal-form";

export function appendBeneficiarySector(
	sectors: string[],
	sectorInput: string,
): string[] {
	const sector = sectorInput.trim();
	return sector && !sectors.includes(sector) ? [...sectors, sector] : sectors;
}

export function getFieldsToValidate(step: number): (keyof FormValues)[] {
	if (step === 2) {
		return [
			"title",
			"bannerProgram",
			"projectLocale",
			"extensionServiceIds",
			"campusId",
			"departmentId",
			"sdgIds",
			"beneficiarySectors",
		];
	}
	if (step === 3) {
		return ["targetStartDate", "targetEndDate", "budgetPartner", "budgetNeust"];
	}
	if (step === 4) return ["members"];
	return [];
}

export function getProposalWizardStepTitle(step: number): string {
	if (step === 1) return "Requirements";
	if (step === 2) return "Project Overview";
	if (step === 3) return "Timeline & Budget";
	if (step === 4) return "Team Composition";
	return "Attachments";
}

export function requiresProposalDocument(
	shouldSubmit: boolean,
	isEditing: boolean,
): boolean {
	return shouldSubmit && !isEditing;
}

export function canSubmitEditingProposal(currentStatus?: string): boolean {
	return currentStatus === "Draft" || currentStatus === "Returned";
}
