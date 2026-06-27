import { m } from "motion/react";

interface StepIndicatorProps {
	steps: number;
	currentStep: number;
	onStepClick?: (step: number) => void;
}

export function AuthStepIndicator({
	steps,
	currentStep,
	onStepClick,
}: StepIndicatorProps) {
	return (
		<div className="flex items-center gap-2">
			{Array.from({ length: steps }, (_, i) => {
				const isActive = i === currentStep;
				return (
					<m.span
						key={`step-${i + 1}`}
						layoutId={`reg-step-${i + 1}`}
						className={
							isActive
								? "h-2 w-6 rounded-xl bg-brand-primary"
								: "size-2 rounded-xl bg-zinc-300"
						}
						{...(!isActive &&
							onStepClick && {
								onClick: () => onStepClick(i),
								onKeyDown: (e: React.KeyboardEvent) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onStepClick(i);
									}
								},
								role: "button",
								tabIndex: 0,
								"aria-label": `Go to step ${i + 1}`,
								className:
									"size-2 cursor-pointer rounded-xl bg-zinc-300 transition-colors hover:bg-zinc-400",
							})}
					/>
				);
			})}
		</div>
	);
}
