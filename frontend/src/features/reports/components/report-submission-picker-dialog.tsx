import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import type { FacultyProjectItem } from "@/features/faculty/public";
import { projectReportingScheduleQueryOptions } from "@/features/projects/public";
import { canSubmitMilestone } from "@/features/projects/reporting-schedule.functions";
import { toManilaDisplayDate as toStableDate } from "@/lib/dates";
import { SubmitReportModal } from "./submit-report-modal";

interface ReportSubmissionPickerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projects: FacultyProjectItem[];
}

export function ReportSubmissionPickerDialog({
	open,
	onOpenChange,
	projects,
}: ReportSubmissionPickerDialogProps) {
	const [projectId, setProjectId] = useState("");
	const [milestoneId, setMilestoneId] = useState("");
	const [selectedMilestone, setSelectedMilestone] = useState<{
		id: string;
		projectId: string;
		reportType: string;
		dueAt: string;
	} | null>(null);
	const {
		data: schedule,
		isLoading,
		error,
	} = useQuery({
		...projectReportingScheduleQueryOptions(projectId),
		enabled: open && Boolean(projectId),
	});
	const eligibleProjects = projects.filter((project) =>
		["Ongoing", "Overdue"].includes(project.projectStatus),
	);
	const milestones = schedule?.schedule.milestones.filter(
		(_milestone, index, all) => canSubmitMilestone(all, index),
	);
	const selectedProject = eligibleProjects.find(
		(project) => project.projectId === projectId,
	);
	const selectedMilestoneOption = milestones?.find(
		(milestone) => milestone.id === milestoneId,
	);

	const handleProjectChange = (value: string) => {
		setProjectId(value);
		setMilestoneId("");
	};

	const handleContinue = () => {
		const milestone = milestones?.find((item) => item.id === milestoneId);
		if (!milestone || !selectedProject) return;
		setSelectedMilestone({
			id: milestone.id,
			projectId,
			reportType: milestone.reportType,
			dueAt: milestone.date,
		});
		onOpenChange(false);
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Submit Report</DialogTitle>
						<DialogDescription>
							Select the project and reporting milestone for this submission.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						{isLoading && (
							<p className="text-sm">Loading reporting milestones...</p>
						)}
						{error && (
							<p role="alert" className="text-sm text-destructive">
								Unable to load the reporting schedule. Please try again.
							</p>
						)}
						<Select
							value={projectId}
							onValueChange={(value) => handleProjectChange(value ?? "")}
						>
							<SelectTrigger>
								<span
									className={projectId ? undefined : "text-muted-foreground"}
								>
									{selectedProject?.title ?? "Select a project"}
								</span>
							</SelectTrigger>
							<SelectContent>
								{eligibleProjects.map((project) => (
									<SelectItem key={project.projectId} value={project.projectId}>
										{project.title ?? "Untitled project"}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={milestoneId}
							onValueChange={(value) => setMilestoneId(value ?? "")}
							disabled={!projectId}
						>
							<SelectTrigger>
								<span
									className={milestoneId ? undefined : "text-muted-foreground"}
								>
									{selectedMilestoneOption
										? `${selectedMilestoneOption.title || `${selectedMilestoneOption.reportType} Report`} - Due ${format(toStableDate(selectedMilestoneOption.date), "MMM d, yyyy")}`
										: "Select a reporting milestone"}
								</span>
							</SelectTrigger>
							<SelectContent>
								{milestones?.map((milestone) => (
									<SelectItem key={milestone.id} value={milestone.id}>
										{milestone.title || `${milestone.reportType} Report`} - Due{" "}
										{format(toStableDate(milestone.date), "MMM d, yyyy")}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							disabled={!selectedProject || !selectedMilestoneOption}
							onClick={handleContinue}
						>
							Continue
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{selectedMilestone && (
				<SubmitReportModal
					open
					onOpenChange={() => setSelectedMilestone(null)}
					milestone={selectedMilestone}
				/>
			)}
		</>
	);
}
