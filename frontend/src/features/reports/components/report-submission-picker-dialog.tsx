import { useQuery } from "@tanstack/react-query";
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
	SelectValue,
} from "@/components/ui/select";
import type { FacultyProjectItem } from "@/features/faculty/public";
import { projectReportingScheduleQueryOptions } from "@/features/projects/public";
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
	const { data: schedule } = useQuery({
		...projectReportingScheduleQueryOptions(projectId),
		enabled: open && Boolean(projectId),
	});
	const eligibleProjects = projects.filter(
		(project) => project.projectStatus === "Ongoing",
	);
	const milestones = schedule?.schedule.milestones.filter(
		(milestone) => !milestone.isCompleted,
	);

	const handleProjectChange = (value: string) => {
		setProjectId(value);
		setMilestoneId("");
	};

	const handleContinue = () => {
		const milestone = milestones?.find((item) => item.id === milestoneId);
		if (!milestone) return;
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
						<Select value={projectId} onValueChange={handleProjectChange}>
							<SelectTrigger>
								<SelectValue placeholder="Select a project" />
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
							onValueChange={setMilestoneId}
							disabled={!projectId}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a reporting milestone" />
							</SelectTrigger>
							<SelectContent>
								{milestones?.map((milestone) => (
									<SelectItem key={milestone.id} value={milestone.id}>
										{milestone.reportType} Report
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button disabled={!milestoneId} onClick={handleContinue}>
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
