import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
					className="flex flex-col gap-3"
					onSubmit={async (event) => {
						event.preventDefault();
						if (!result.reportId || !/^\d+$/.test(count)) return;
						if (reason.trim().length < 5) {
							toast.error("Please explain why you're updating the count.");
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
							toast.error(
								error instanceof Error
									? error.message
									: "We couldn't save the trainee count. Please try again.",
							);
						} finally {
							setSaving(false);
						}
					}}
				>
					<label htmlFor={`${inputId}-count`} className="text-sm">
						Number of trainees
						<Input
							id={`${inputId}-count`}
							disabled={saving}
							required
							type="number"
							min={0}
							max={2147483647}
							step={1}
							value={count}
							onChange={(event) => setCount(event.target.value)}
						/>
					</label>
					<label htmlFor={`${inputId}-reason`} className="text-sm">
						Reason for the change
						<Textarea
							id={`${inputId}-reason`}
							disabled={saving}
							required
							minLength={5}
							maxLength={1000}
							value={reason}
							onChange={(event) => setReason(event.target.value)}
						/>
					</label>
					<p className="text-xs text-muted-foreground">
						This updates official reports. The previous count and your reason
						remain in the change history.
					</p>
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
