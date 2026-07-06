import { format } from "date-fns";
import { Calendar, CheckCircle2, AlertCircle, Download, FilePlus, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
			<Card size="sm" className={className}>
				<CardContent className="flex h-32 items-center justify-center gap-2">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
					<span className="text-muted-foreground text-sm">Loading reporting schedule...</span>
				</CardContent>
			</Card>
		);
	}

	if (error || !data) {
		return null;
	}

	const { dueDates } = data.schedule;

	if (dueDates.length === 0) {
		return (
			<Card size="sm" className={className}>
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold">Reporting Schedule</CardTitle>
					<CardDescription className="text-xs">Milestones and submissions timeline</CardDescription>
				</CardHeader>
				<CardContent className="pt-0 text-center py-8 text-muted-foreground text-sm">
					No milestones scheduled for this project.
				</CardContent>
			</Card>
		);
	}

	const now = new Date();

	return (
		<Card size="sm" className={className}>
			<CardHeader className="pb-3">
				<CardTitle className="text-base font-semibold">Reporting Schedule</CardTitle>
				<CardDescription className="text-xs">
					Track required report milestones and submission statuses
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="relative border-l border-border pl-6 ml-3 space-y-6">
					{dueDates.map((item, idx) => {
						const dateObj = new Date(item.date);
						const isOverdue = !item.isCompleted && dateObj < now;

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
												Completed {format(new Date(item.completedAt), "MMM d, yyyy")}
											</p>
										)}
										{isOverdue && (
											<p className="text-xs text-red-500">
												Overdue by {Math.ceil((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24))} days
											</p>
										)}
									</div>

									<div className="flex items-center gap-2">
										{item.isCompleted && item.storagePath ? (
											<Button
												size="xs"
												variant="outline"
												className="gap-1"
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
													className="gap-1"
													render={<Link to="/reports" />}
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
		</Card>
	);
}
