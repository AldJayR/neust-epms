import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Stepper,
	StepperIndicator,
	StepperItem,
	StepperList,
	StepperSeparator,
	StepperTitle,
} from "@/components/ui/stepper";
import { getProposalWizardStepTitle } from "../helpers/proposal-wizard-helpers";

const WIZARD_STEPS = ["Start", "Overview", "Plan", "Team", "File"] as const;

export function ProposalWizardHeader({
	step,
	isEditing,
}: {
	step: number;
	isEditing: boolean;
}) {
	return (
		<DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-12 sm:px-6">
			<div className="flex items-baseline justify-between gap-4">
				<div className="min-w-0">
					<DialogTitle className="truncate text-lg font-semibold tracking-tight text-heading">
						{isEditing ? "Edit project proposal" : "New project proposal"}
					</DialogTitle>
					<DialogDescription className="mt-1 truncate text-xs">
						{getProposalWizardStepTitle(step)}
					</DialogDescription>
				</div>
				<span className="shrink-0 text-xs font-medium text-muted-foreground">
					{step} / 5
				</span>
			</div>

			<Stepper
				value={String(step)}
				orientation="horizontal"
				nonInteractive
				className="mt-5 gap-0"
			>
				<StepperList className="mx-auto w-full max-w-[600px]">
					{WIZARD_STEPS.map((label, index) => {
						const stepNumber = index + 1;
						return (
							<StepperItem
								key={label}
								value={String(stepNumber)}
								className="group min-w-0 flex-1 items-start"
							>
								<div className="flex min-w-0 flex-col items-center gap-1.5">
									<StepperIndicator className="size-6 border-border bg-background text-[11px] shadow-none data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=completed]:border-primary data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground">
										{stepNumber}
									</StepperIndicator>
									<StepperTitle className="hidden whitespace-nowrap text-center text-[11px] font-medium text-muted-foreground group-data-[state=active]:text-foreground sm:block">
										{label}
									</StepperTitle>
								</div>
								{index < WIZARD_STEPS.length - 1 && (
									<StepperSeparator className="mt-3" />
								)}
							</StepperItem>
						);
					})}
				</StepperList>
			</Stepper>
		</DialogHeader>
	);
}
