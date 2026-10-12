import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { pdfFileSchema } from "@/lib/upload-policy";
import { invalidateWorkflowQueries } from "@/lib/workflow-queries";
import { closeProjectFn } from "../functions";

interface CloseProjectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId: string;
	projectTitle: string;
	traineeCount?: number | null;
}

export function CloseProjectDialog({
	open,
	onOpenChange,
	projectId,
	projectTitle,
	traineeCount,
}: CloseProjectDialogProps) {
	const queryClient = useQueryClient();
	const [file, setFile] = useState<File | null>(null);
	const [confirmation, setConfirmation] = useState("");
	const mutation = useMutation({
		mutationFn: (signedReport: File) => {
			const data = new FormData();
			data.set("projectId", projectId);
			data.set("file", signedReport);
			return closeProjectFn({ data });
		},
		onSuccess: async () => {
			toast.success("Signed terminal report saved. Project closed.");
			onOpenChange(false);
			await invalidateWorkflowQueries(queryClient);
		},
		onError: (error: Error) => toast.error(error.message),
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (mutation.isPending || confirmation !== "CLOSE") return;
		const result = pdfFileSchema.safeParse(file);
		if (!result.success) {
			toast.error(
				result.error.issues[0]?.message ?? "Choose a signed terminal report PDF.",
			);
			return;
		}
		mutation.mutate(result.data);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!mutation.isPending) onOpenChange(nextOpen);
			}}
		>
			<DialogContent showCloseButton={!mutation.isPending}>
				<DialogHeader>
					<DialogTitle>Close Project</DialogTitle>
					<DialogDescription>
						Review the leader's terminal report and evaluation forms for
						"{projectTitle}". Then upload the signed terminal report to close the
						project.
						{traineeCount != null &&
							` The project has ${traineeCount.toLocaleString()} recorded trainees.`}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={handleSubmit}
					className="space-y-4"
					aria-busy={mutation.isPending}
				>
					<Field>
						<FieldLabel
							htmlFor="signed-terminal-report"
							className="text-foreground"
						>
							Signed Terminal Report
						</FieldLabel>
						<Input
							id="signed-terminal-report"
							type="file"
							accept=".pdf,application/pdf,application/x-pdf"
							required
							disabled={mutation.isPending}
							aria-describedby="signed-terminal-report-help"
							onChange={(event) => setFile(event.target.files?.[0] ?? null)}
						/>
						<p
							id="signed-terminal-report-help"
							className="text-xs text-muted-foreground"
						>
							PDF only, up to 50 MB. This signed copy is saved separately from
							the leader's report.
						</p>
					</Field>
					<Field>
						<FieldLabel
							htmlFor="close-project-confirmation"
							className="text-foreground"
						>
							Type CLOSE to confirm
						</FieldLabel>
						<Input
							id="close-project-confirmation"
							value={confirmation}
							onChange={(event) => setConfirmation(event.target.value)}
							disabled={mutation.isPending}
							autoComplete="off"
						/>
					</Field>
					{mutation.isError && (
						<p role="alert" className="text-sm text-destructive">
							{mutation.error.message}
						</p>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={mutation.isPending}
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="destructive"
							disabled={!file || confirmation !== "CLOSE" || mutation.isPending}
						>
							{mutation.isPending && <Loader2 className="size-4 animate-spin" />}
							{mutation.isPending ? "Uploading..." : "Upload and Close Project"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
