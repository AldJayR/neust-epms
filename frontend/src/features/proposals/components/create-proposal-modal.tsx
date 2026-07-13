import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import type { AuthUser } from "@/lib/auth";
import { useProposalWizard } from "../hooks/use-proposal-wizard";
import { ProposalStepDetails } from "./proposal-step-details";
import { ProposalStepDocuments } from "./proposal-step-documents";
import { ProposalStepInfo } from "./proposal-step-info";
import { ProposalStepMembers } from "./proposal-step-members";
import { ProposalStepRequirements } from "./proposal-step-requirements";
import { ProposalWizardFooter } from "./proposal-wizard-footer";
import { ProposalWizardHeader } from "./proposal-wizard-header";
import type { FormValues } from "./proposal-form";

interface CreateProposalModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: AuthUser;
	initialData?: Partial<FormValues>;
	editingProposalId?: string;
	currentStatus?: string;
}

export function CreateProposalModal({
	open,
	onOpenChange,
	user,
	initialData,
	editingProposalId,
	currentStatus,
}: CreateProposalModalProps) {
	const wizard = useProposalWizard({
		open,
		onOpenChange,
		user,
		initialData,
		editingProposalId,
		currentStatus,
	});

	return (
		<Dialog open={open} onOpenChange={wizard.handleOpenChange}>
			<DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0">
				<form
					onSubmit={(event) => event.preventDefault()}
					className="flex flex-col h-full"
				>
					<ProposalWizardHeader step={wizard.step} isEditing={wizard.isEditing} />

					<div className="p-6 overflow-y-auto max-h-[60vh]">
						{wizard.step === 1 && <ProposalStepRequirements />}

						{wizard.step === 2 && (
							<ProposalStepInfo
								form={wizard.form}
								user={user}
								sdgsData={wizard.sdgsData}
							/>
						)}

						{wizard.step === 3 && <ProposalStepDetails form={wizard.form} />}

						{wizard.step === 4 && (
							<ProposalStepMembers form={wizard.form} user={user} />
						)}

						{wizard.step === 5 && (
							<ProposalStepDocuments
								file={wizard.file}
								setFile={wizard.setFile}
								uploadPhase={wizard.uploadPhase}
								uploadProgress={wizard.uploadProgress}
								isEditing={wizard.isEditing}
							/>
						)}
					</div>

					<DialogFooter className="p-6 border-t border-border bg-card">
						<ProposalWizardFooter
							step={wizard.step}
							isBusy={wizard.isBusy}
							isSubmitting={wizard.isSubmitting}
							onPrevious={wizard.previousStep}
							onCancel={() => wizard.handleOpenChange(false)}
							onNext={wizard.nextStep}
							onSaveDraft={() => wizard.handleSave(false)}
							onSubmit={() => wizard.handleSave(true)}
						/>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
