import { Check } from "lucide-react";
import {
	Stepper,
	StepperIndicator,
	StepperItem,
	StepperList,
	StepperSeparator,
	StepperTitle,
} from "@/components/ui/stepper";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getStatusDescription } from "@/lib/status-descriptions";

interface ProposalLifecycleStepperProps {
	currentStatus: string;
	className?: string;
}

const LIFECYCLE_STEPS = [
	{ status: "Draft", label: "Draft" },
	{ status: "Pending Review", label: "Review" },
	{ status: "Endorsed", label: "Endorsed" },
	{ status: "Approved", label: "Approved" },
] as const;

export function ProposalLifecycleStepper({
	currentStatus,
	className,
}: ProposalLifecycleStepperProps) {
	const isRejected = currentStatus === "Rejected";
	const isReturned = currentStatus === "Returned";

	// Map status to the linear step index for the Stepper component
	const matchedIndex = LIFECYCLE_STEPS.findIndex(
		(s) => s.status === currentStatus,
	);
	const activeStep =
		matchedIndex === -1 ? LIFECYCLE_STEPS.length - 1 : matchedIndex;

	return (
		<div className="flex flex-col gap-2">
			<Stepper
				value={String(Math.max(0, activeStep))}
				orientation="horizontal"
				className={className}
			>
				<StepperList>
					{LIFECYCLE_STEPS.map((step, index) => (
						<StepperItem
							key={step.status}
							value={String(index)}
							completed={index <= activeStep}
						>
							<Tooltip>
								<TooltipTrigger
									render={<StepperIndicator className="cursor-default" />}
								>
									{index <= activeStep ? (
										<Check className="size-4" />
									) : (
										index + 1
									)}
								</TooltipTrigger>
								<TooltipContent>
									<p>{getStatusDescription(step.status).explanation}</p>
								</TooltipContent>
							</Tooltip>
							<StepperTitle className="ml-2">{step.label}</StepperTitle>
							{index < LIFECYCLE_STEPS.length - 1 && <StepperSeparator />}
						</StepperItem>
					))}
				</StepperList>
			</Stepper>

			{isReturned && (
				<p className="text-sm text-orange-600 font-medium">
					Returned for revision — resubmit to restart the review process.
				</p>
			)}
			{isRejected && (
				<p className="text-sm text-red-600 font-medium">
					Proposal was not approved.
				</p>
			)}
		</div>
	);
}
