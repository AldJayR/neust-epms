import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BrandButton } from "@/components/custom/brand-button";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	FileUpload,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadItemDelete,
	FileUploadItemMetadata,
	FileUploadItemPreview,
	FileUploadList,
	FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toStableDate } from "@/lib/utils";
import { submitReportFn, uploadReportDocumentFn } from "../functions";

interface SubmitReportModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	milestone: {
		id: string;
		projectId: string;
		reportType: string;
		dueAt: string;
	};
}

export function SubmitReportModal({
	open,
	onOpenChange,
	milestone,
}: SubmitReportModalProps) {
	const queryClient = useQueryClient();
	const [remarks, setRemarks] = useState("");
	const [progressFile, setProgressFile] = useState<File | null>(null);
	const [terminalFile, setTerminalFile] = useState<File | null>(null);
	const [finalFile, setFinalFile] = useState<File | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isClosure = milestone.reportType === "Project Closure";

	const resetForm = () => {
		setRemarks("");
		setProgressFile(null);
		setTerminalFile(null);
		setFinalFile(null);
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if ((!isClosure && !progressFile) || (isClosure && (!terminalFile || !finalFile))) {
			toast.error(
				isClosure
					? "Please upload both the Terminal and Final Accomplishment reports."
					: "Please upload the required PDF document.",
			);
			return;
		}

		setIsSubmitting(true);
		try {
			const submitDocument = async (
				reportType: "Progress" | "Terminal" | "Final Accomplishment",
				document: File,
			) => {
				const report = await submitReportFn({
					data: {
						milestoneId: milestone.id,
						reportType,
						remarks: remarks || undefined,
					},
				});
				const formData = new FormData();
				formData.set("reportId", report.reportId);
				formData.set("file", document);
				await uploadReportDocumentFn({ data: formData });
			};

			if (isClosure) {
				await Promise.all([
					submitDocument("Terminal", terminalFile!),
					submitDocument("Final Accomplishment", finalFile!),
				]);
			} else {
				await submitDocument("Progress", progressFile!);
			}

			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["project-reporting-schedule", milestone.projectId],
				}),
				queryClient.invalidateQueries({ queryKey: ["dashboard", "reports"] }),
				queryClient.invalidateQueries({ queryKey: ["faculty", "projects"] }),
			]);
			toast.success(`${milestone.reportType} Report submitted successfully!`);
			onOpenChange(false);
			resetForm();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to submit report");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) resetForm();
				onOpenChange(nextOpen);
			}}
		>
			<DialogContent className="max-w-lg pb-4">
				<DialogHeader>
					<DialogTitle>Submit {milestone.reportType} Report</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 py-2">
					<div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
						<p className="font-medium">Required reporting milestone</p>
						<p className="mt-1 text-muted-foreground">
							Due {format(toStableDate(milestone.dueAt), "MMM d, yyyy")}
						</p>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="remarks">Remarks (Optional)</Label>
						<Textarea
							id="remarks"
							placeholder="Add comments or notes about the submission..."
							value={remarks}
							onChange={(event) => setRemarks(event.target.value)}
							rows={3}
						/>
					</div>

					{isClosure ? (
						<div className="space-y-4">
							<ReportFileField
								label="Terminal Report Document"
								file={terminalFile}
								onFileChange={setTerminalFile}
							/>
							<ReportFileField
								label="Final Accomplishment Report Document"
								file={finalFile}
								onFileChange={setFinalFile}
							/>
						</div>
					) : (
						<ReportFileField
							label="Progress Report Document"
							file={progressFile}
							onFileChange={setProgressFile}
						/>
					)}

					<DialogFooter className="border-t border-border pt-3">
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<BrandButton type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
							{isSubmitting ? "Submitting..." : "Submit Report"}
						</BrandButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function ReportFileField({
	label,
	file,
	onFileChange,
}: {
	label: string;
	file: File | null;
	onFileChange: (file: File | null) => void;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label>{label}</Label>
			<FileUpload
				value={file ? [file] : []}
				onValueChange={(files) => onFileChange(files[0] ?? null)}
				maxFiles={1}
				accept="application/pdf"
			>
				{!file && (
					<FileUploadDropzone>
						<div className="flex flex-col items-center gap-1 text-center">
							<Upload className="mb-2 size-8 text-muted-foreground" />
							<p className="text-sm font-medium">
								Drag and drop the report, or{" "}
								<FileUploadTrigger className="cursor-pointer text-primary hover:underline">
									browse
								</FileUploadTrigger>
							</p>
							<p className="text-xs text-muted-foreground">PDF only (max 10MB)</p>
						</div>
					</FileUploadDropzone>
				)}
				<FileUploadList className="mt-2">
					{file && (
						<FileUploadItem value={file}>
							<FileUploadItemPreview />
							<FileUploadItemMetadata />
							<FileUploadItemDelete />
						</FileUploadItem>
					)}
				</FileUploadList>
			</FileUpload>
		</div>
	);
}
