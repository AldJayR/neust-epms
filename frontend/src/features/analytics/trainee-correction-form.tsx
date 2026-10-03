import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { correctTraineeCountFn } from "@/features/reports/functions";
import type { AnalyticsItem } from "./schema";

export function TraineeCorrectionForm({
	result,
	onClose,
}: {
	result: AnalyticsItem;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const [count, setCount] = useState(result.traineeCount?.toString() ?? "");
	const [reason, setReason] = useState("");
	const [saving, setSaving] = useState(false);
	const inputId = useId();
	const [errors, setErrors] = useState<{ count?: string; reason?: string }>({});
	const [saveError, setSaveError] = useState<string | null>(null);
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !saving) onClose();
			}}
		>
			<DialogContent className="max-h-[90dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Update trainee count: {result.label}</DialogTitle>
				</DialogHeader>
				<form
					noValidate
					className="flex flex-col gap-3"
					onSubmit={async (event) => {
						event.preventDefault();
						const nextErrors: typeof errors = {};
						if (!/^\d+$/.test(count) || Number(count) > 2147483647)
							nextErrors.count =
								"Enter a whole number between 0 and 2,147,483,647.";
						if (reason.trim().length < 5 || reason.trim().length > 1000)
							nextErrors.reason =
								"Explain the change using 5 to 1,000 characters.";
						setErrors(nextErrors);
						setSaveError(null);
						if (nextErrors.count || nextErrors.reason) {
							document
								.getElementById(
									`${inputId}-${nextErrors.count ? "count" : "reason"}`,
								)
								?.focus();
							return;
						}
						if (!result.reportId) {
							setSaveError("This project has no terminal report to update.");
							return;
						}
						setSaving(true);
						try {
							await correctTraineeCountFn({
								data: {
									reportId: result.reportId,
									traineeCount: Number(count),
									reason,
								},
							});
							await queryClient.invalidateQueries({ queryKey: ["analytics"] });
							await queryClient.invalidateQueries({
								queryKey: ["dashboard", "reports"],
							});
							await queryClient.invalidateQueries({
								queryKey: ["report-package"],
							});
							toast.success(
								"Trainee count saved. Your reason is included in the change history.",
							);
							onClose();
						} catch (error) {
							setSaveError(
								error instanceof Error
									? error.message
									: "We couldn't save the trainee count. Please try again.",
							);
						} finally {
							setSaving(false);
						}
					}}
				>
					{saveError && (
						<Alert variant="destructive">
							<AlertTitle>The count wasn't saved</AlertTitle>
							<AlertDescription>{saveError}</AlertDescription>
						</Alert>
					)}
					<FieldGroup className="gap-4">
						<Field data-invalid={Boolean(errors.count)}>
							<FieldLabel
								htmlFor={`${inputId}-count`}
								className="text-foreground"
							>
								Number of trainees
							</FieldLabel>
							<Input
								id={`${inputId}-count`}
								disabled={saving}
								aria-invalid={Boolean(errors.count)}
								aria-describedby={
									errors.count ? `${inputId}-count-error` : undefined
								}
								required
								type="number"
								min={0}
								max={2147483647}
								step={1}
								value={count}
								onChange={(event) => {
									setCount(event.target.value);
									setErrors((previous) => ({ ...previous, count: undefined }));
								}}
							/>
							<FieldError id={`${inputId}-count-error`}>
								{errors.count}
							</FieldError>
						</Field>
						<Field data-invalid={Boolean(errors.reason)}>
							<FieldLabel
								htmlFor={`${inputId}-reason`}
								className="text-foreground"
							>
								Reason for the change
							</FieldLabel>
							<Textarea
								id={`${inputId}-reason`}
								disabled={saving}
								aria-invalid={Boolean(errors.reason)}
								aria-describedby={`${inputId}-reason-help${errors.reason ? ` ${inputId}-reason-error` : ""}`}
								required
								minLength={5}
								maxLength={1000}
								value={reason}
								onChange={(event) => {
									setReason(event.target.value);
									setErrors((previous) => ({ ...previous, reason: undefined }));
								}}
							/>
							<FieldDescription id={`${inputId}-reason-help`}>
								Your explanation will appear in the change history.
							</FieldDescription>
							<FieldError id={`${inputId}-reason-error`}>
								{errors.reason}
							</FieldError>
						</Field>
					</FieldGroup>
					<FieldDescription>
						This updates official reports. The previous count and your reason
						remain in the change history.
					</FieldDescription>
					<div className="flex gap-2">
						<Button disabled={saving} type="submit">
							{saving ? "Saving…" : "Save trainee count"}
						</Button>
						<Button
							disabled={saving}
							variant="ghost"
							type="button"
							onClick={onClose}
						>
							Cancel
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
