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
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed non-reorderable step list
						key={i}
						layoutId={`reg-step-${i + 1}`}
						className={
							isActive
								? "h-2 w-6 rounded-xl bg-brand-primary"
								: "size-2 rounded-xl bg-zinc-300 dark:bg-muted-foreground/50"
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
									"size-2 cursor-pointer rounded-xl bg-zinc-300 transition-colors hover:bg-zinc-400 dark:bg-muted-foreground/50 dark:hover:bg-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
							})}
					/>
				);
			})}
		</div>
	);
}
