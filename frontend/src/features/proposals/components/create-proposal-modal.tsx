import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import type { AuthUser } from "@/lib/auth";
import { useProposalWizard } from "../hooks/use-proposal-wizard";
import type { FormValues } from "./proposal-form";
import { ProposalStepDetails } from "./proposal-step-details";
import { ProposalStepDocuments } from "./proposal-step-documents";
import { ProposalStepInfo } from "./proposal-step-info";
import { ProposalStepMembers } from "./proposal-step-members";
import { ProposalStepRequirements } from "./proposal-step-requirements";
import { ProposalWizardFooter } from "./proposal-wizard-footer";
import { ProposalWizardHeader } from "./proposal-wizard-header";

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
			<DialogContent className="flex h-[min(720px,calc(100vh-2rem))] w-[calc(100vw-2rem)] !max-w-[1040px] flex-col gap-0 overflow-hidden p-0">
				<form
					onSubmit={(event) => event.preventDefault()}
					className="flex h-full min-h-0 flex-col"
				>
					<ProposalWizardHeader
						step={wizard.step}
						isEditing={wizard.isEditing}
					/>

					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-7">
						<div className="mx-auto w-full max-w-none [&_[data-slot=field-label]]:text-foreground">
							{wizard.step === 1 && <ProposalStepRequirements />}

							{wizard.step === 2 && (
								<ProposalStepInfo
									form={wizard.form}
									user={user}
									sdgsData={wizard.sdgsData}
									extensionServicesData={wizard.extensionServicesData}
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
					</div>

					<DialogFooter className="shrink-0 border-t border-border px-5 py-3 sm:px-6">
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
