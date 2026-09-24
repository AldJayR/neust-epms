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
import { recordInstitutionalApprovalFn } from "../functions";

interface InstitutionalApprovalDialogProps {
	proposalId: string;
	proposalTitle: string;
	trigger?: React.ReactElement;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function InstitutionalApprovalDialog({
	proposalId,
	proposalTitle,
	trigger,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
}: InstitutionalApprovalDialogProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
	const [file, setFile] = React.useState<File | null>(null);

	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : uncontrolledOpen;
	const setOpen = isControlled
		? (setControlledOpen ?? (() => {}))
		: setUncontrolledOpen;

	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (uploadedFile: File) => {
			const formData = new FormData();
			formData.append("proposalId", proposalId);
			formData.append("file", uploadedFile);
			return recordInstitutionalApprovalFn({ data: formData });
		},
		onSuccess: () => {
			toast.success(
				"Signed institutional approval scan recorded successfully.",
			);
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["action-center"] });
			setFile(null);
			setOpen(false);
		},
		onError: (error: Error) => {
			toast.error(
				error.message || "Failed to upload institutional approval scan.",
			);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) {
			toast.error("Please select a scanned PDF file of the signed proposal.");
			return;
		}
		mutation.mutate(file);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger && <DialogTrigger render={trigger} />}
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileUp className="size-5 text-primary" />
						Record Institutional Approval
					</DialogTitle>
					<DialogDescription>
						Upload the physical signed and scanned copy of proposal{" "}
						<span className="font-semibold text-foreground">
							"{proposalTitle}"
						</span>{" "}
						to finalize institutional approval and clear it for project
						activation.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 py-2">
					<div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:bg-muted/40 transition-colors">
						<UploadCloud className="size-10 text-muted-foreground mb-2" />
						<p className="text-sm font-medium text-foreground mb-1">
							{file ? file.name : "Select signed proposal scan (PDF)"}
						</p>
						<p className="text-xs text-muted-foreground mb-3">
							Maximum size 50MB. PDF format only.
						</p>
						<Input
							id="institutional-approval-file"
							type="file"
							accept=".pdf,application/pdf"
							className="max-w-xs text-xs file:h-6 file:text-xs"
							onChange={(e) => setFile(e.target.files?.[0] ?? null)}
							disabled={mutation.isPending}
						/>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<DialogClose render={<Button variant="outline" />}>
							Cancel
						</DialogClose>
						<BrandButton
							type="submit"
							disabled={!file || mutation.isPending}
							className="gap-2"
						>
							{mutation.isPending ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Uploading...
								</>
							) : (
								"Upload & Approve"
							)}
						</BrandButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
