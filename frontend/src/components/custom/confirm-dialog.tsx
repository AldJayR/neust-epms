import * as React from "react";
import { Loader2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	title: string;
	description: string;
	confirmLabel?: string;
	confirmVariant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";
	requireTyping?: string;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
	title,
	description,
	confirmLabel = "Confirm",
	confirmVariant = "default",
	requireTyping,
}: ConfirmDialogProps) {
	const [typedText, setTypedText] = React.useState("");
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			setTypedText("");
			setIsSubmitting(false);
		}
		onOpenChange(isOpen);
	};

	const handleConfirm = async (e: React.MouseEvent) => {
		e.preventDefault();
		if (requireTyping && typedText !== requireTyping) return;

		setIsSubmitting(true);
		try {
			await onConfirm();
			handleOpenChange(false);
		} catch (error) {
			console.error("Confirmation action failed:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const isValid = !requireTyping || typedText === requireTyping;

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>

				{requireTyping && (
					<div className="mb-4">
						<Field>
							<FieldLabel>
								Please type{" "}
								<span className="font-mono font-bold text-destructive">
									{requireTyping}
								</span>{" "}
								to confirm:
							</FieldLabel>
							<Input
								placeholder={requireTyping}
								value={typedText}
								onChange={(e) => setTypedText(e.target.value)}
								disabled={isSubmitting}
								className="mt-1 font-mono"
							/>
							{typedText && typedText !== requireTyping && (
								<FieldError>Type "{requireTyping}" exactly to confirm</FieldError>
							)}
						</Field>
					</div>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
					<Button
						variant={confirmVariant}
						disabled={!isValid || isSubmitting}
						onClick={handleConfirm}
						className="flex items-center justify-center gap-1.5"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Processing...
							</>
						) : (
							confirmLabel
						)}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
