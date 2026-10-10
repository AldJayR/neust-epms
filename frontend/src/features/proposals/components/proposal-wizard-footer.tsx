import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProposalWizardFooterProps {
	step: number;
	isReturned?: boolean;
	canResubmit?: boolean;
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
	isReturned = false,
	canResubmit = true,
	isBusy,
	isSubmitting,
	onPrevious,
	onCancel,
	onNext,
	onSaveDraft,
	onSubmit,
}: ProposalWizardFooterProps) {
	return (
		<div className="flex w-full items-center justify-between gap-3">
			<div className="flex min-w-0 items-center">
				{step > 1 ? (
					<Button
						type="button"
						variant="outline"
						onClick={onPrevious}
						disabled={isBusy}
						className="shrink-0"
					>
						<ChevronLeft className="size-4" />
						Previous
					</Button>
				) : (
					<Button
						type="button"
						variant="ghost"
						onClick={onCancel}
						disabled={isBusy}
						className="shrink-0"
					>
						Cancel
					</Button>
				)}
			</div>

			{step < (isReturned ? 6 : 5) ? (
				<Button
					type="button"
					onClick={onNext}
					disabled={isBusy}
					className="shrink-0 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
				>
					{isReturned && step === 5 ? "Save file & continue" : "Next"}
					<ChevronRight className="size-4" />
				</Button>
			) : (
				<div className="flex items-center gap-2">
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
						) : isReturned ? (
							"Save Changes"
						) : (
							"Save as Draft"
						)}
					</Button>
					<Button
						type="button"
						onClick={onSubmit}
						className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
						disabled={isBusy || (isReturned && !canResubmit)}
					>
						{isSubmitting ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Submitting...
							</>
						) : (
							<>
								{isReturned ? "Resubmit for Review" : "Submit for Review"}
								<Check className="size-4" />
							</>
						)}
					</Button>
				</div>
			)}
		</div>
	);
}
