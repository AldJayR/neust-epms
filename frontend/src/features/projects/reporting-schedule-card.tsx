import { format } from "date-fns";
import { Calendar, CheckCircle2, AlertCircle, Download, FilePlus, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "#/lib/utils";
import { useProjectReportingSchedule } from "@/hooks/use-project-reporting-schedule";

interface ReportingScheduleCardProps {
	projectId: string;
	isFaculty: boolean;
	className?: string;
}

export function ReportingScheduleCard({
	projectId,
	isFaculty,
	className,
}: ReportingScheduleCardProps) {
	const { data, isLoading, error } = useProjectReportingSchedule(projectId);

	if (isLoading) {
		return (
			<Card size="sm" className={cn("w-full border shadow-2xs", className)}>
				<CardContent className="flex h-32 items-center justify-center gap-2">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
					<span className="text-muted-foreground text-sm">Loading reporting schedule...</span>
				</CardContent>
			</Card>
		);
	}

	if (error || !data) {
		return null; // Silent fallback
	}

	const { dueDates } = data.schedule;

	if (dueDates.length === 0) {
		return (
			<Card size="sm" className={cn("w-full border shadow-2xs", className)}>
				<CardHeader className="pb-3 border-b border-border/40">
					<CardTitle className="text-base font-semibold">Reporting Schedule</CardTitle>
					<CardDescription className="text-xs">Milestones and submissions timeline</CardDescription>
				</CardHeader>
				<CardContent className="pt-6 text-center py-8 text-muted-foreground text-sm">
					No milestones scheduled for this project.
				</CardContent>
			</Card>
		);
	}

	const now = new Date();

	return (
		<Card size="sm" className={cn("w-full border shadow-2xs", className)}>
			<CardHeader className="pb-3 border-b border-border/40">
				<CardTitle className="text-base font-semibold">Reporting Schedule</CardTitle>
				<CardDescription className="text-xs">
					Track required report milestones and submission statuses
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-5">
				<div className="relative border-l border-border pl-6 ml-3 space-y-6">
					{dueDates.map((item, idx) => {
						const dateObj = new Date(item.date);
						const isOverdue = !item.isCompleted && dateObj < now;

						return (
							<div key={item.id} className="relative">
								{/* Icon Marker */}
								<div className="absolute -left-[35px] top-0.5 flex size-[18px] items-center justify-center rounded-full bg-background border-2 border-background">
									{item.isCompleted ? (
										<CheckCircle2 className="size-5 text-green-600 bg-background rounded-full shrink-0" />
									) : isOverdue ? (
										<AlertCircle className="size-5 text-red-500 bg-background rounded-full shrink-0 animate-pulse" />
									) : (
										<Calendar className="size-5 text-zinc-400 bg-background rounded-full shrink-0" />
									)}
								</div>

								{/* Content */}
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
									<div className="space-y-0.5">
										<p className="font-semibold text-foreground">
											{item.reportType} Report Milestone #{idx + 1}
										</p>
										<p className="text-xs text-muted-foreground">
											Due Date: {format(dateObj, "MMM d, yyyy")}
										</p>
										{item.isCompleted && item.completedAt && (
											<p className="text-[11px] text-green-600 font-medium">
												Completed on {format(new Date(item.completedAt), "MMM d, yyyy")}
											</p>
										)}
										{isOverdue && (
											<p className="text-[11px] text-red-500 font-medium">
												Overdue by {Math.ceil((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24))} days
											</p>
										)}
									</div>

									{/* Action Button */}
									<div className="flex items-center gap-2">
										{item.isCompleted && item.storagePath ? (
											<Button
												size="xs"
												variant="outline"
												className="gap-1 px-2.5 h-7 text-xs border-green-500/20 text-green-600 bg-green-50/10 hover:bg-green-50"
												render={
													<a
														href={item.storagePath}
														target="_blank"
														rel="noopener noreferrer"
													/>
												}
											>
												<Download className="size-3" />
												Download
											</Button>
										) : (
											isFaculty && (
												<Button
													size="xs"
													variant="outline"
													className={cn(
														"gap-1 px-2.5 h-7 text-xs shadow-3xs",
														isOverdue
															? "border-red-500/30 text-red-600 bg-red-50/10 hover:bg-red-50"
															: "border-border hover:bg-muted"
													)}
													render={<Link to="/reports" />}
												>
													<FilePlus className="size-3" />
													Submit Report
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
		</Card>
	);
}
