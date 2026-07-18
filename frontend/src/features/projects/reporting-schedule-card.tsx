import { format } from "date-fns";
import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	Download,
	FilePlus,
	Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { SubmitReportModal } from "@/features/reports/components/submit-report-modal";
import { getReportSignedUrlFn } from "@/features/reports/functions";
import { useProjectReportingSchedule } from "@/hooks/use-project-reporting-schedule";
import { toStableDate } from "@/lib/utils";
import {
	canSubmitMilestone,
	type ScheduledDueDate,
} from "./reporting-schedule.functions";

interface ReportingScheduleCardProps {
	projectId: string;
	canSubmitReports: boolean;
	className?: string;
}

export function ReportingScheduleCard({
	projectId,
	canSubmitReports,
	className,
}: ReportingScheduleCardProps) {
	const { data, isLoading, error } = useProjectReportingSchedule(projectId);
	const [now] = useState(() => new Date());
	const [selectedMilestone, setSelectedMilestone] =
		useState<ScheduledDueDate | null>(null);

	const handleDownload = async (reportId: string) => {
		const reportWindow = window.open("about:blank", "_blank");
		try {
			const { url } = await getReportSignedUrlFn({ data: reportId });
			if (reportWindow) {
				reportWindow.location.href = url;
			} else {
				window.open(url, "_blank", "noopener,noreferrer");
			}
		} catch (error) {
			reportWindow?.close();
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to open report document",
			);
		}
	};

	if (isLoading) {
		return (
			<Card size="sm" className={className}>
				<CardContent className="flex h-32 items-center justify-center gap-2">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
					<span className="text-muted-foreground text-sm">
						Loading reporting schedule...
					</span>
				</CardContent>
			</Card>
		);
	}

	if (error || !data) {
		return null;
	}

	const { milestones } = data.schedule;

	if (milestones.length === 0) {
		return (
			<Card size="sm" className={className}>
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold">
						Reporting Schedule
					</CardTitle>
					<CardDescription className="text-xs">
						Milestones and submissions timeline
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-0 text-center py-8 text-muted-foreground text-sm">
					No milestones scheduled for this project.
				</CardContent>
			</Card>
		);
	}

	return (
		<Card size="sm" className={className}>
			<CardHeader className="pb-3">
				<CardTitle className="text-base font-semibold">
					Reporting Schedule
				</CardTitle>
				<CardDescription className="text-xs">
					Track required report milestones and submission statuses
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="relative border-l border-border pl-6 ml-3 space-y-6">
					{milestones.map((item, idx) => {
						const dateObj = toStableDate(item.date);
						const isOverdue = !item.isCompleted && dateObj < now;
						const reportId = item.reportId;
						return (
							<div key={item.id} className="relative">
								<div className="absolute -left-[35px] top-0.5 flex size-[18px] items-center justify-center rounded-full bg-background border-2 border-background">
									{item.isCompleted ? (
										<CheckCircle2 className="size-4 text-green-600" />
									) : isOverdue ? (
										<AlertCircle className="size-4 text-red-500" />
									) : (
										<Calendar className="size-4 text-muted-foreground" />
									)}
								</div>

								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
									<div className="space-y-0.5">
										<p className="font-medium text-foreground">
											{item.reportType} Report #{idx + 1}
										</p>
										<p className="text-xs text-muted-foreground">
											Due: {format(dateObj, "MMM d, yyyy")}
										</p>
										{item.isCompleted && item.completedAt && (
											<p className="text-xs text-green-600">
												Completed{" "}
												{format(toStableDate(item.completedAt), "MMM d, yyyy")}
											</p>
										)}
										{isOverdue && (
											<p className="text-xs text-red-500">
												Overdue by{" "}
												{Math.ceil(
													(now.getTime() - dateObj.getTime()) /
														(1000 * 60 * 60 * 24),
												)}{" "}
												days
											</p>
										)}
									</div>

									<div className="flex items-center gap-2">
										{item.isCompleted && reportId ? (
											<Button
												size="xs"
												variant="outline"
												className="gap-1"
												onClick={() => void handleDownload(reportId)}
												aria-label="Download completed report"
											>
												<Download className="size-3" />
												Download
											</Button>
										) : (
											canSubmitReports &&
											canSubmitMilestone(milestones, idx) && (
												<Button
													size="xs"
													variant="outline"
													className="gap-1"
													onClick={() => setSelectedMilestone(item)}
												>
													<FilePlus className="size-3" />
													Submit
												</Button>
											)
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
			{selectedMilestone && (
				<SubmitReportModal
					open
					onOpenChange={(open) => {
						if (!open) setSelectedMilestone(null);
					}}
					milestone={{
						id: selectedMilestone.id,
						projectId,
						reportType: selectedMilestone.reportType,
						dueAt: selectedMilestone.date,
					}}
				/>
			)}
		</Card>
	);
}
