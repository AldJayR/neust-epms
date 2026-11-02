import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { BrandButton } from "@/components/custom/brand-button";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pdfFileSchema } from "@/lib/upload-policy";
import { invalidateWorkflowQueries } from "@/lib/workflow-queries";
import {
	recordInstitutionalApprovalFn,
	recordSignedSpecialOrderFn,
} from "../functions";

interface InstitutionalApprovalDialogProps {
	proposalId: string;
	proposalTitle: string;
	trigger?: React.ReactElement;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	signedSpecialOrderOnly?: boolean;
}

export function InstitutionalApprovalDialog({
	proposalId,
	proposalTitle,
	trigger,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
	signedSpecialOrderOnly = false,
}: InstitutionalApprovalDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
	const [file, setFile] = React.useState<File | null>(null);
	const [specialOrderFile, setSpecialOrderFile] = React.useState<File | null>(
		null,
	);
	const inputId = React.useId();

	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : uncontrolledOpen;
	const setOpen = isControlled
		? (setControlledOpen ?? (() => {}))
		: setUncontrolledOpen;

	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (uploads: {
			proposalFile: File | null;
			specialOrderFile: File;
		}) => {
			const formData = new FormData();
			formData.append("proposalId", proposalId);
			if (signedSpecialOrderOnly) {
				formData.append("file", uploads.specialOrderFile);
				return recordSignedSpecialOrderFn({ data: formData });
			}
			if (!uploads.proposalFile)
				throw new Error("Choose the signed approved proposal PDF");
			formData.append("file", uploads.proposalFile);
			formData.append("specialOrderFile", uploads.specialOrderFile);
			return recordInstitutionalApprovalFn({ data: formData });
		},
		onSuccess: async () => {
			toast.success(
				signedSpecialOrderOnly
					? "Signed Special Order saved."
					: "Signed approved proposal and Special Order saved. Institutional approval recorded.",
			);
			await invalidateWorkflowQueries(queryClient);
			setFile(null);
			setSpecialOrderFile(null);
			setOpen(false);
		},
		onError: (error: Error) => {
			toast.error(
				error.message || "We couldn't save the signed scans. Please try again.",
			);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (mutation.isPending) return;
		const specialOrder = pdfFileSchema.safeParse(specialOrderFile);
		if (!specialOrder.success) {
			toast.error(
				specialOrder.error.issues[0]?.message ??
					"Choose the signed Special Order PDF",
			);
			return;
		}
		if (!signedSpecialOrderOnly) {
			const proposal = pdfFileSchema.safeParse(file);
			if (!proposal.success) {
				toast.error(
					proposal.error.issues[0]?.message ??
						"Choose the signed approved proposal PDF",
				);
				return;
			}
		}
		mutation.mutate({
			proposalFile: file,
			specialOrderFile: specialOrder.data,
		});
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (mutation.isPending) return;
				if (!nextOpen) {
					setFile(null);
					setSpecialOrderFile(null);
					mutation.reset();
				}
				setOpen(nextOpen);
			}}
		>
			{trigger && <DialogTrigger render={trigger} />}
			<DialogContent
				className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
				showCloseButton={!mutation.isPending}
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileUp className="size-5 text-primary" />
						{signedSpecialOrderOnly
							? "Upload Signed Special Order"
							: "Record Institutional Approval"}
					</DialogTitle>
					<DialogDescription>
						{signedSpecialOrderOnly
							? "Upload the missing signed Special Order scan for "
							: "Upload the approved proposal scan and signed Special Order scan for "}
						<span className="font-semibold text-foreground">
							"{proposalTitle}"
						</span>{" "}
						{signedSpecialOrderOnly
							? "before project activation. The existing institutional approval remains recorded."
							: "to record institutional approval. Both PDFs are required. Activation is still required before work begins."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 py-2">
					{!signedSpecialOrderOnly && (
						<div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 hover:bg-muted/40 transition-colors gap-2">
							<UploadCloud className="size-10 text-muted-foreground mb-2" />
							<Label
								htmlFor={`${inputId}-proposal`}
								className="text-foreground"
							>
								Scanned Approved Project Proposal
							</Label>
							<p className="text-xs text-muted-foreground mb-3">
								PDF only, up to 50 MB.
							</p>
							<Input
								id={`${inputId}-proposal`}
								type="file"
								accept=".pdf,application/pdf"
								className="max-w-xs text-xs file:h-6 file:text-xs"
								onChange={(e) => setFile(e.target.files?.[0] ?? null)}
								disabled={mutation.isPending}
								required
							/>
						</div>
					)}
					<div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 gap-2">
						<Label htmlFor={`${inputId}-so`} className="text-foreground">
							Scanned Signed Special Order
						</Label>
						<p className="text-xs text-muted-foreground">
							One combined PDF containing all members’ signed Special Order
							pages. Up to 50 MB.
						</p>
						<Input
							id={`${inputId}-so`}
							type="file"
							accept=".pdf,application/pdf,application/x-pdf"
							className="max-w-xs text-xs file:h-6 file:text-xs"
							disabled={mutation.isPending}
							required
							onChange={(event) =>
								setSpecialOrderFile(event.target.files?.[0] ?? null)
							}
						/>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<DialogClose
							render={
								<Button
									type="button"
									variant="outline"
									disabled={mutation.isPending}
								/>
							}
						>
							Cancel
						</DialogClose>
						<BrandButton
							type="submit"
							disabled={
								(!signedSpecialOrderOnly && !file) ||
								!specialOrderFile ||
								mutation.isPending
							}
							className="gap-2"
						>
							{mutation.isPending ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Uploading...
								</>
							) : signedSpecialOrderOnly ? (
								"Save signed Special Order"
							) : (
								"Record institutional approval"
							)}
						</BrandButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
