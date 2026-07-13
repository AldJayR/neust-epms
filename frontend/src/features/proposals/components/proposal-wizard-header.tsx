import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProposalWizardStepTitle } from "../helpers/proposal-wizard-helpers";

export function ProposalWizardHeader({
	step,
	isEditing,
}: {
	step: number;
	isEditing: boolean;
}) {
	return (
		<DialogHeader className="py-4 px-6 border-b border-border">
			<DialogTitle className="text-xl font-semibold text-heading">
				{isEditing ? "Edit Project Proposal" : "Start New Project Proposal"}
			</DialogTitle>
			<DialogDescription className="text-sm text-muted-foreground">
				Step {step} of 5: {getProposalWizardStepTitle(step)}
			</DialogDescription>
		</DialogHeader>
	);
}
