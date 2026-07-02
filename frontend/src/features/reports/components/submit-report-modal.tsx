import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandButton } from "@/components/custom/brand-button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Combobox,
	ComboboxInput,
	ComboboxContent,
	ComboboxList,
	ComboboxItem,
	ComboboxEmpty,
} from "@/components/ui/combobox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { facultyProjectsQueryOptions } from "@/lib/faculty.functions";
import { submitReportFn } from "@/lib/dashboard.functions";

interface SubmitReportModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SubmitReportModal({ open, onOpenChange }: SubmitReportModalProps) {
	const queryClient = useQueryClient();

	// Fetch projects
	const { data: projectsData } = useQuery(facultyProjectsQueryOptions());
	const projects = (projectsData?.items ?? []).filter(
		(p) => p.projectStatus === "Ongoing",
	);

	// Form States
	const [selectedProjectId, setSelectedProjectId] = useState<string>("");
	const [projectSearch, setProjectSearch] = useState("");
	const [reportType, setReportType] = useState<"Progress" | "Closure" | "">("");
	const [periodStart, setPeriodStart] = useState("");
	const [periodEnd, setPeriodEnd] = useState("");
	const [remarks, setRemarks] = useState("");

	// Files States
	const [progressFile, setProgressFile] = useState<File | null>(null);
	const [finalAccFile, setFinalAccFile] = useState<File | null>(null);
	const [terminalFile, setTerminalFile] = useState<File | null>(null);

	// Loading phase
	const [isSubmitting, setIsSubmitting] = useState(false);

	const filteredProjects = (() => {
		if (!projectSearch) return projects;
		// If the search matches the selected project title, don't filter out everything else
		const selectedProj = projects.find((p) => p.projectId === selectedProjectId);
		if (selectedProj && selectedProj.title === projectSearch) {
			return projects;
		}
		return projects.filter((p) =>
			(p.title || "").toLowerCase().includes(projectSearch.toLowerCase()),
		);
	})();

	const handleProjectSelect = (val: string | null) => {
		if (!val) {
			setSelectedProjectId("");
			setProjectSearch("");
			return;
		}
		setSelectedProjectId(val);
		const proj = projects.find((p) => p.projectId === val);
		setProjectSearch(proj?.title ?? "");
	};

	const resetForm = () => {
		setSelectedProjectId("");
		setProjectSearch("");
		setReportType("");
		setPeriodStart("");
		setPeriodEnd("");
		setRemarks("");
		setProgressFile(null);
		setFinalAccFile(null);
		setTerminalFile(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedProjectId) {
			toast.error("Please select a project.");
			return;
		}

		if (!reportType) {
			toast.error("Please select a report type.");
			return;
		}

		if (reportType === "Progress" && !progressFile) {
			toast.error("Please upload the Progress Report document.");
			return;
		}

		if (reportType === "Closure" && (!finalAccFile || !terminalFile)) {
			toast.error("Please upload both required project closure documents.");
			return;
		}

		setIsSubmitting(true);
		try {
			// Convert start/end dates to ISO-8601 strings if provided
			const isoStart = periodStart ? new Date(periodStart).toISOString() : undefined;
			const isoEnd = periodEnd ? new Date(periodEnd).toISOString() : undefined;

			if (reportType === "Progress") {
				// Submit progress report
				await submitReportFn({
					data: {
						projectId: selectedProjectId,
						reportType: "Progress",
						remarks,
						periodStart: isoStart,
						periodEnd: isoEnd,
					},
				});
				toast.success("Progress Report submitted successfully!");
			} else {
				// Submit two reports for project closure (Final Accomplishment and Terminal)
				await submitReportFn({
					data: {
						projectId: selectedProjectId,
						reportType: "Final Accomplishment",
						remarks,
						periodStart: isoStart,
						periodEnd: isoEnd,
					},
				});
				await submitReportFn({
					data: {
						projectId: selectedProjectId,
						reportType: "Terminal",
						remarks,
						periodStart: isoStart,
						periodEnd: isoEnd,
					},
				});
				toast.success("Project Closure reports submitted successfully!");
			}

			// Invalidate queries to refresh list
			queryClient.invalidateQueries({ queryKey: ["dashboard", "reports"] });
			queryClient.invalidateQueries({ queryKey: ["faculty", "projects"] });

			onOpenChange(false);
			resetForm();
		} catch (err: any) {
			toast.error(err.message || "Failed to submit report");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(openVal) => {
				if (!openVal) resetForm();
				onOpenChange(openVal);
			}}
		>
			<DialogContent className="max-w-lg pb-4">
				<DialogHeader>
					<DialogTitle>Submit Project Report</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="py-2">
					<div className="max-h-[60vh] overflow-y-auto px-1 py-1 space-y-4 scrollbar-thin">
						{/* Project Selector */}
					<div className="flex flex-col gap-1.5 relative">
						<Label>Project</Label>
						<Combobox
							value={selectedProjectId || null}
							onValueChange={handleProjectSelect}
						>
							<ComboboxInput
								placeholder="Search and select a project..."
								value={projectSearch}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
									setProjectSearch(e.target.value);
									if (selectedProjectId && e.target.value !== projectSearch) {
										setSelectedProjectId("");
									}
								}}
								showClear
								className="w-full"
							/>
							<ComboboxContent className="w-full z-50">
								<ComboboxList className="w-full">
									{filteredProjects.map((p) => (
										<ComboboxItem key={p.projectId} value={p.projectId}>
											{p.title}
										</ComboboxItem>
									))}
								</ComboboxList>
								<ComboboxEmpty>No projects found</ComboboxEmpty>
							</ComboboxContent>
						</Combobox>
					</div>

					{/* Report Type Selector */}
					<div className="flex flex-col gap-1.5">
						<Label>Report Type</Label>
						<Select
							value={reportType}
							onValueChange={(val) => setReportType(val as "Progress" | "Closure")}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select report type" />
							</SelectTrigger>
							<SelectContent className="w-full z-50">
								<SelectItem value="Progress">Progress Report</SelectItem>
								<SelectItem value="Closure">Project Closure</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Reporting Period */}
					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="periodStart">Period Start</Label>
							<Input
								type="date"
								id="periodStart"
								value={periodStart}
								onChange={(e) => setPeriodStart(e.target.value)}
								required
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="periodEnd">Period End</Label>
							<Input
								type="date"
								id="periodEnd"
								value={periodEnd}
								onChange={(e) => setPeriodEnd(e.target.value)}
								required
							/>
						</div>
					</div>

					{/* Remarks */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="remarks">Remarks (Optional)</Label>
						<Textarea
							id="remarks"
							placeholder="Add any comments or notes about the submission..."
							value={remarks}
							onChange={(e) => setRemarks(e.target.value)}
							rows={3}
						/>
					</div>

					{/* Dropzones */}
					{reportType === "Progress" && (
						<div className="flex flex-col gap-1.5">
							<Label>Progress Report Document</Label>
							<FileUpload
								value={progressFile ? [progressFile] : []}
								onValueChange={(files) => setProgressFile(files[0] ?? null)}
								maxFiles={1}
								accept="application/pdf"
							>
								{!progressFile && (
									<FileUploadDropzone>
										<div className="flex flex-col items-center gap-1 text-center">
											<Upload className="size-8 text-muted-foreground mb-2" />
											<p className="text-sm font-medium">
												Drag & drop Progress Report, or{" "}
												<FileUploadTrigger className="text-primary hover:underline cursor-pointer">
													browse
												</FileUploadTrigger>
											</p>
											<p className="text-xs text-muted-foreground">PDF only (max 10MB)</p>
										</div>
									</FileUploadDropzone>
								)}
								<FileUploadList className="mt-2">
									{progressFile && (
										<FileUploadItem value={progressFile}>
											<FileUploadItemPreview />
											<FileUploadItemMetadata />
											<FileUploadItemDelete />
										</FileUploadItem>
									)}
								</FileUploadList>
							</FileUpload>
						</div>
					)}
					{reportType === "Closure" && (
						<div className="space-y-4 border border-border rounded-lg p-4 bg-muted/20">
							<div className="flex flex-col gap-1.5">
								<Label>Final Accomplishment Report Document</Label>
								<FileUpload
									value={finalAccFile ? [finalAccFile] : []}
									onValueChange={(files) => setFinalAccFile(files[0] ?? null)}
									maxFiles={1}
									accept="application/pdf"
								>
									{!finalAccFile && (
										<FileUploadDropzone>
											<div className="flex flex-col items-center gap-1 text-center">
												<Upload className="size-8 text-muted-foreground mb-2" />
												<p className="text-sm font-medium">
													Drag & drop Final Accomplishment Report, or{" "}
													<FileUploadTrigger className="text-primary hover:underline cursor-pointer">
														browse
													</FileUploadTrigger>
												</p>
												<p className="text-xs text-muted-foreground">PDF only (max 10MB)</p>
											</div>
										</FileUploadDropzone>
									)}
									<FileUploadList className="mt-2">
										{finalAccFile && (
											<FileUploadItem value={finalAccFile}>
												<FileUploadItemPreview />
												<FileUploadItemMetadata />
												<FileUploadItemDelete />
											</FileUploadItem>
										)}
									</FileUploadList>
								</FileUpload>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label>Terminal Report Document</Label>
								<FileUpload
									value={terminalFile ? [terminalFile] : []}
									onValueChange={(files) => setTerminalFile(files[0] ?? null)}
									maxFiles={1}
									accept="application/pdf"
								>
									{!terminalFile && (
										<FileUploadDropzone>
											<div className="flex flex-col items-center gap-1 text-center">
												<Upload className="size-8 text-muted-foreground mb-2" />
												<p className="text-sm font-medium">
													Drag & drop Terminal Report, or{" "}
													<FileUploadTrigger className="text-primary hover:underline cursor-pointer">
														browse
													</FileUploadTrigger>
												</p>
												<p className="text-xs text-muted-foreground">PDF only (max 10MB)</p>
											</div>
										</FileUploadDropzone>
									)}
									<FileUploadList className="mt-2">
										{terminalFile && (
											<FileUploadItem value={terminalFile}>
												<FileUploadItemPreview />
												<FileUploadItemMetadata />
												<FileUploadItemDelete />
											</FileUploadItem>
										)}
									</FileUploadList>
								</FileUpload>
							</div>
						</div>
					)}

					</div>

					<DialogFooter className="mt-4 pt-3 pb-0 border-t border-border">
						<Button
							type="button"
							variant="ghost"
							onClick={() => {
								onOpenChange(false);
								resetForm();
							}}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<BrandButton type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Submitting...
								</>
							) : (
								"Submit Report"
							)}
						</BrandButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
