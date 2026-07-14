import { FileText } from "lucide-react";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	Stepper,
	StepperIndicator,
	StepperItem,
	StepperList,
	StepperSeparator,
	StepperTitle,
} from "@/components/ui/stepper";
import { getProposalWizardStepTitle } from "../helpers/proposal-wizard-helpers";

const WIZARD_STEPS = [
	"Prepare",
	"Overview",
	"Plan",
	"Team",
	"Document",
] as const;

export function ProposalWizardHeader({
	step,
	isEditing,
}: {
	step: number;
	isEditing: boolean;
}) {
	return (
		<DialogHeader className="border-b border-border bg-muted/30 px-6 py-6 sm:px-8">
			<div className="flex items-start gap-4">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
					<FileText className="size-5" />
				</div>
				<div className="min-w-0 space-y-1">
					<DialogTitle className="text-xl font-semibold tracking-tight text-heading">
						{isEditing ? "Refine your proposal" : "Build a project proposal"}
					</DialogTitle>
					<DialogDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
						{isEditing
							? "Update the details below, then save your changes or resubmit for review."
							: "Work through each section at your own pace. You can save a draft whenever you need to pause."}
					</DialogDescription>
				</div>
			</div>

			<Stepper
				value={String(step)}
				orientation="horizontal"
				nonInteractive
				className="mt-7 gap-0"
			>
				<StepperList className="mx-auto w-full max-w-[640px]">
					{WIZARD_STEPS.map((label, index) => {
						const stepNumber = index + 1;
						return (
							<StepperItem
								key={label}
								value={String(stepNumber)}
								className="group min-w-0 flex-1 items-start"
							>
								<div className="flex min-w-0 flex-col items-center gap-2">
									<StepperIndicator className="size-7 border-border bg-background text-xs shadow-none data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=completed]:border-primary data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground">
										{stepNumber}
									</StepperIndicator>
									<StepperTitle className="hidden whitespace-nowrap text-center text-xs font-medium text-muted-foreground group-data-[state=active]:text-foreground sm:block">
										{label}
									</StepperTitle>
								</div>
								{index < WIZARD_STEPS.length - 1 && (
									<StepperSeparator className="mt-3.5 mx-2" />
								)}
							</StepperItem>
						);
					})}
				</StepperList>
			</Stepper>

			<p className="mt-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Step {step} of 5 <span className="mx-1.5 text-border">/</span>
				{getProposalWizardStepTitle(step)}
			</p>
		</DialogHeader>
	);
}
