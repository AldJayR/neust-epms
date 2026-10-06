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
			toast.success("Signed institutional approval document saved.");
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			queryClient.invalidateQueries({
				queryKey: ["dashboard", "proposals", proposalId],
			});
			queryClient.invalidateQueries({ queryKey: ["proposals"] });
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["action-center"] });
			queryClient.invalidateQueries({
				queryKey: ["project-readiness", proposalId],
			});
			queryClient.invalidateQueries({ queryKey: ["project-readiness"] });
			setFile(null);
			setOpen(false);
		},
		onError: (error: Error) => {
			toast.error(
				error.message ||
					"We couldn't upload the signed institutional approval document. Please try again.",
			);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) {
			toast.error("Choose a PDF scan of the signed institutional proposal.");
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
						Upload a PDF scan of the institutionally signed proposal{" "}
						<span className="font-semibold text-foreground">
							"{proposalTitle}"
						</span>{" "}
						to record institutional approval. Activation is still required
						before work begins.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 py-2">
					<div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:bg-muted/40 transition-colors">
						<UploadCloud className="size-10 text-muted-foreground mb-2" />
						<p className="text-sm font-medium text-foreground mb-1">
							{file ? file.name : "Choose signed approval document (PDF)"}
						</p>
						<p className="text-xs text-muted-foreground mb-3">
							PDF only, up to 50 MB.
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
								"Record institutional approval"
							)}
						</BrandButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
