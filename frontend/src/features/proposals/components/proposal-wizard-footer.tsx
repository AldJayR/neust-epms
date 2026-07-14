import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProposalWizardFooterProps {
	step: number;
	isBusy: boolean;
	isSubmitting: boolean;
	onPrevious: () => void;
	onCancel: () => void;
	onNext: () => void;
	onSaveDraft: () => void;
	onSubmit: () => void;
}

export function ProposalWizardFooter({
	step,
	isBusy,
	isSubmitting,
	onPrevious,
	onCancel,
	onNext,
	onSaveDraft,
	onSubmit,
}: ProposalWizardFooterProps) {
	return (
		<div className="flex items-center justify-between w-full">
			{step > 1 ? (
				<Button type="button" variant="outline" onClick={onPrevious}>
					<ChevronLeft className="size-4" />
					Previous
				</Button>
			) : (
				<Button type="button" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
			)}

			{step < 5 ? (
				<Button
					type="button"
					onClick={onNext}
					className="bg-primary text-primary-foreground hover:bg-primary/90"
				>
					Next
					<ChevronRight className="size-4" />
				</Button>
			) : (
				<div className="flex items-center gap-3">
					<Button
						type="button"
						variant="outline"
						onClick={onSaveDraft}
						disabled={isBusy}
					>
						{isBusy && !isSubmitting ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Saving...
							</>
						) : (
							"Save as Draft"
						)}
					</Button>
					<Button
						type="button"
						onClick={onSubmit}
						className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
						disabled={isBusy}
					>
						{isSubmitting ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Submitting...
							</>
						) : (
							<>
								Submit for Review
								<Check className="size-4" />
							</>
						)}
					</Button>
				</div>
			)}
		</div>
	);
}
