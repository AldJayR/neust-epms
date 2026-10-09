import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { BrandButton } from "@/components/custom/brand-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toStableDate } from "@/lib/utils";
import {
	getReportPackageFn,
	submitReportFn,
	uploadReportAttachmentFn,
	uploadReportDocumentFn,
} from "../functions";

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
	const [closureReportFile, setClosureReportFile] = useState<File | null>(null);
	const [evalFormsFile, setEvalFormsFile] = useState<File | null>(null);
	const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [traineeCount, setTraineeCount] = useState("");
	const formId = useId();
	const countId = `${formId}-trainees`;
	const remarksId = `${formId}-remarks`;
	const [countError, setCountError] = useState<string | null>(null);
	const [submissionError, setSubmissionError] = useState<string | null>(null);
	const hydratedReport = useRef<string | null | undefined>(undefined);
	const packageQuery = useQuery({
		queryKey: ["report-package", milestone.id],
		queryFn: () => getReportPackageFn({ data: milestone.id }),
		enabled: open,
		staleTime: 0,
	});
	useEffect(() => {
		if (
			packageQuery.data &&
			hydratedReport.current !== packageQuery.data.reportId
		) {
			setTraineeCount(packageQuery.data.traineeCount?.toString() ?? "");
			setRemarks(packageQuery.data.remarks ?? "");
			hydratedReport.current = packageQuery.data.reportId;
		}
	}, [packageQuery.data]);
	const isClosure =
		milestone.reportType === "Terminal Report" ||
		milestone.reportType === "Project Closure" ||
		milestone.reportType === "Closure";
	const unified =
		packageQuery.data?.reportType === "Accomplishment and Terminal Report";
	const legacyComplete = Boolean(
		isClosure && packageQuery.data?.completed && !unified,
	);
	const documentUploaded = Boolean(
		packageQuery.data?.documentUploaded &&
			(!isClosure || unified || legacyComplete),
	);
	const evaluationUploaded = Boolean(
		packageQuery.data?.evaluationUploaded && unified,
	);
	const reportTypeName = milestone.reportType.endsWith("Report")
		? milestone.reportType
		: `${milestone.reportType} Report`;

	const resetForm = () => {
		setRemarks("");
		setProgressFile(null);
		setClosureReportFile(null);
		setEvalFormsFile(null);
		setAttendanceFile(null);
		setTraineeCount("");
		setCountError(null);
		setSubmissionError(null);
		hydratedReport.current = undefined;
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setSubmissionError(null);
		const missingDocuments =
			!packageQuery.data?.completed &&
			((!isClosure && !progressFile && !documentUploaded) ||
				(isClosure &&
					((!closureReportFile && !documentUploaded) ||
						(!evalFormsFile && !evaluationUploaded))));
		const invalidCount =
			isClosure &&
			!packageQuery.data?.completed &&
			(!/^\d+$/.test(traineeCount) || Number(traineeCount) > 2147483647);
		setCountError(
			invalidCount
				? "Enter a whole number between 0 and 2,147,483,647. Enter 0 if no trainees were served."
				: null,
		);
		if (missingDocuments) {
			setSubmissionError(
				isClosure
					? "Please upload the Accomplishment and Terminal Report and the required Evaluation Forms."
					: "Please upload the required PDF document.",
			);
		}
		if (invalidCount || missingDocuments) {
			if (invalidCount) document.getElementById(countId)?.focus();
			return;
		}

		setIsSubmitting(true);
		try {
			const current = await getReportPackageFn({ data: milestone.id });
			if (current.completed) {
				if (attendanceFile && !current.attendanceUploaded && current.reportId) {
					const formData = new FormData();
					formData.set("reportId", current.reportId);
					formData.set("file", attendanceFile);
					formData.set("attachmentType", "Attendance Records");
					await uploadReportAttachmentFn({ data: formData });
					await queryClient.invalidateQueries({
						queryKey: ["report-package", milestone.id],
					});
				}
				await queryClient.invalidateQueries({
					queryKey: ["project-reporting-schedule", milestone.projectId],
				});
				toast.success("Your report is already submitted.");
				onOpenChange(false);
				return;
			}
			if (!current.canEdit && !current.completed)
				throw new Error(
					"You can't continue this submission. Contact the project leader for help.",
				);
			if (isClosure) {
				const report = await submitReportFn({
					data: {
						milestoneId: milestone.id,
						reportType: "Accomplishment and Terminal Report",
						remarks: remarks || undefined,
						traineeCount: Number(traineeCount),
					},
				});
				const resuming = report.reportId === current.reportId;
				if (!resuming || !current.documentUploaded) {
					if (!closureReportFile)
						throw new Error("Please choose your terminal report PDF.");
					const formData = new FormData();
					formData.set("reportId", report.reportId);
					formData.set("file", closureReportFile);
					await uploadReportDocumentFn({ data: formData });
				}

				if (!resuming || !current.evaluationUploaded) {
					if (!evalFormsFile)
						throw new Error("Please choose your evaluation forms PDF.");
					const evalFormData = new FormData();
					evalFormData.set("reportId", report.reportId);
					evalFormData.set("file", evalFormsFile);
					evalFormData.set("attachmentType", "Evaluation Forms");
					await uploadReportAttachmentFn({ data: evalFormData });
				}

				if (attendanceFile && !current.attendanceUploaded) {
					const attFormData = new FormData();
					attFormData.set("reportId", report.reportId);
					attFormData.set("file", attendanceFile);
					attFormData.set("attachmentType", "Attendance Records");
					await uploadReportAttachmentFn({ data: attFormData });
				}
				const finished = await getReportPackageFn({ data: milestone.id });
				if (!finished.completed)
					throw new Error(
						"Your documents were saved, but the submission is not complete. Please review the remaining requirements.",
					);
			} else {
				const report = await submitReportFn({
					data: {
						milestoneId: milestone.id,
						reportType: "Progress",
						remarks: remarks || undefined,
					},
				});
				const formData = new FormData();
				formData.set("reportId", report.reportId);
				if (!progressFile)
					throw new Error("Please choose your progress report PDF.");
				formData.set("file", progressFile);
				await uploadReportDocumentFn({ data: formData });
			}

			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["dashboard", "proposals"] }),
				queryClient.invalidateQueries({ queryKey: ["dashboard", "hub"] }),
				queryClient.invalidateQueries({ queryKey: ["project-derived-state"] }),
				queryClient.invalidateQueries({ queryKey: ["project-readiness"] }),
				queryClient.invalidateQueries({
					queryKey: ["project-reporting-schedule", milestone.projectId],
				}),
				queryClient.invalidateQueries({ queryKey: ["dashboard", "reports"] }),
				queryClient.invalidateQueries({ queryKey: ["faculty", "projects"] }),
				queryClient.invalidateQueries({
					queryKey: ["report-package", milestone.id],
				}),
				queryClient.invalidateQueries({ queryKey: ["analytics"] }),
				queryClient.invalidateQueries({ queryKey: ["action-center"] }),
			]);
			toast.success(
				isClosure
					? "Terminal report submitted. The Director can now review it and approve project closure."
					: `${reportTypeName} submitted successfully!`,
			);
			onOpenChange(false);
			resetForm();
		} catch (error) {
			const refreshed = await packageQuery.refetch();
			if (
				refreshed.data?.completed &&
				attendanceFile &&
				!refreshed.data.attendanceUploaded
			) {
				toast.info(
					"Your terminal report is submitted, but attendance records weren't uploaded. You can try that upload again.",
				);
				return;
			}
			setSubmissionError(
				error instanceof Error ? error.message : "Failed to submit report",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (isSubmitting) return;
				if (!nextOpen) resetForm();
				onOpenChange(nextOpen);
			}}
		>
			<DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto pb-4">
				<DialogHeader>
					<DialogTitle>
						{packageQuery.data?.completed
							? reportTypeName
							: `Submit ${reportTypeName}`}
					</DialogTitle>
				</DialogHeader>

				<form noValidate onSubmit={handleSubmit} className="space-y-4 py-2">
					{packageQuery.data?.completed && (
						<p className="rounded-md border p-3 text-sm">
							{isClosure
								? "The required submission is complete. You can add attendance records before the Director approves closure."
								: "This progress report has already been submitted."}
						</p>
					)}
					{packageQuery.isPending && (
						<p role="status">Checking saved submission progress…</p>
					)}
					{packageQuery.error && (
						<Alert variant="destructive">
							<AlertTitle>Saved progress couldn't be loaded</AlertTitle>
							<AlertDescription className="space-y-3">
								<p>Please try again before continuing.</p>
								<Button
									type="button"
									variant="outline"
									onClick={() => void packageQuery.refetch()}
								>
									Retry
								</Button>
							</AlertDescription>
						</Alert>
					)}
					{submissionError && (
						<Alert variant="destructive">
							<AlertTitle>Check your submission</AlertTitle>
							<AlertDescription>{submissionError}</AlertDescription>
						</Alert>
					)}
					<FieldGroup className="gap-4">
						{isClosure && (
							<Field data-invalid={Boolean(countError)}>
								<FieldLabel className="text-foreground" htmlFor={countId}>
									Number of trainees *
								</FieldLabel>
								<Input
									id={countId}
									aria-invalid={Boolean(countError)}
									aria-describedby={`${countId}-help${countError ? ` ${countId}-error` : ""}`}
									required
									type="number"
									min={0}
									max={2147483647}
									step={1}
									value={traineeCount}
									disabled={isSubmitting || packageQuery.data?.completed}
									onChange={(event) => {
										setTraineeCount(event.target.value);
										setCountError(null);
									}}
								/>
								<FieldDescription id={`${countId}-help`}>
									Count each person once within this project, even if they
									attended multiple sessions. Enter 0 if no trainees were
									served. Official totals follow Director closure approval.
								</FieldDescription>
								<FieldError id={`${countId}-error`}>{countError}</FieldError>
							</Field>
						)}
						<div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
							<p className="font-medium">Required reporting milestone</p>
							<p className="mt-1 text-muted-foreground">
								Due {format(toStableDate(milestone.dueAt), "MMM d, yyyy")}
							</p>
						</div>

						<Field>
							<FieldLabel className="text-foreground" htmlFor={remarksId}>
								Remarks (Optional)
							</FieldLabel>
							<Textarea
								id={remarksId}
								disabled={isSubmitting || packageQuery.data?.completed}
								placeholder="Add comments or notes about the submission..."
								value={remarks}
								onChange={(event) => setRemarks(event.target.value)}
								rows={3}
							/>
						</Field>

						{isClosure ? (
							<div className="space-y-4">
								{documentUploaded ? (
									<div className="flex items-center gap-2 text-sm">
										<Badge variant="outline">Uploaded</Badge>
										<span>Terminal report</span>
									</div>
								) : (
									<ReportFileField
										label="Accomplishment and Terminal Report *"
										file={closureReportFile}
										disabled={isSubmitting}
										onFileChange={setClosureReportFile}
									/>
								)}
								{legacyComplete ? (
									<p className="text-sm">
										Legacy terminal and final accomplishment reports are on
										file.
									</p>
								) : evaluationUploaded ? (
									<div className="flex items-center gap-2 text-sm">
										<Badge variant="outline">Uploaded</Badge>
										<span>Evaluation forms</span>
									</div>
								) : (
									<ReportFileField
										label="Evaluation Forms *"
										file={evalFormsFile}
										disabled={isSubmitting}
										onFileChange={setEvalFormsFile}
									/>
								)}
								<ReportFileField
									label="Attendance Records (optional)"
									file={attendanceFile}
									disabled={
										isSubmitting || packageQuery.data?.attendanceUploaded
									}
									onFileChange={setAttendanceFile}
								/>
							</div>
						) : (
							<ReportFileField
								label="Progress Report Document"
								file={progressFile}
								disabled={isSubmitting}
								onFileChange={setProgressFile}
							/>
						)}
					</FieldGroup>
					<DialogFooter className="border-t border-border pt-3">
						<Button
							type="button"
							disabled={isSubmitting}
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<BrandButton
							type="submit"
							disabled={
								isSubmitting ||
								packageQuery.isPending ||
								Boolean(packageQuery.error) ||
								(packageQuery.data?.canEdit === false &&
									!packageQuery.data.completed)
							}
						>
							{isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
							{isSubmitting
								? "Submitting..."
								: packageQuery.data?.completed
									? attendanceFile && !packageQuery.data.attendanceUploaded
										? "Upload attendance records"
										: "Done"
									: packageQuery.data?.reportId
										? "Resume Submission"
										: "Submit Report"}
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
	disabled = false,
}: {
	label: string;
	file: File | null;
	onFileChange: (file: File | null) => void;
	disabled?: boolean;
}) {
	const labelId = useId();
	return (
		<Field className="gap-1.5" aria-labelledby={labelId}>
			<FieldTitle id={labelId} className="text-foreground">
				{label}
			</FieldTitle>
			<FileUpload
				aria-labelledby={labelId}
				disabled={disabled}
				value={file ? [file] : []}
				onValueChange={(files) => onFileChange(files[0] ?? null)}
				maxFiles={1}
				maxSize={10 * 1024 * 1024}
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
							<p className="text-xs text-muted-foreground">
								PDF only (max 10MB)
							</p>
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
		</Field>
	);
}
