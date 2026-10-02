import { useQuery } from "@tanstack/react-query";
import { PageCard } from "@/components/custom/page-card";
import { Button } from "@/components/ui/button";
import { ReportDocumentButton } from "@/features/reports/components/report-document-button";
import { getReportPackageFn } from "@/features/reports/functions";
import { useProjectReportingSchedule } from "@/hooks/use-project-reporting-schedule";

export function useTerminalResults(projectId: string) {
	const schedule = useProjectReportingSchedule(projectId);
	const milestone = schedule.data?.schedule.milestones.find((item) =>
		["Terminal Report", "Project Closure", "Closure"].includes(item.reportType),
	);
	return useQuery({
		queryKey: ["report-package", milestone?.id],
		queryFn: () => {
			if (!milestone)
				throw new Error("No terminal report is scheduled for this project.");
			return getReportPackageFn({ data: milestone.id });
		},
		enabled: Boolean(milestone),
		staleTime: 30_000,
	});
}
export function TerminalResultsCard({
	projectId,
	status,
}: {
	projectId: string;
	status: string;
}) {
	const result = useTerminalResults(projectId);
	if (!result.data && !result.error) return null;
	return (
		<PageCard className="space-y-2 p-4">
			<h2 className="font-semibold">Project Results</h2>
			{result.error ? (
				<div role="alert">
					<p>We couldn't load the project results. Please try again.</p>
					<Button variant="outline" onClick={() => void result.refetch()}>
						Retry
					</Button>
				</div>
			) : (
				<>
					<p>
						Reported trainees:{" "}
						<strong>
							{result.data?.traineeCount?.toLocaleString() ?? "Not recorded"}
						</strong>
					</p>
					<p className="text-sm text-muted-foreground">
						{status === "Closed"
							? "Closure approved by the Director"
							: result.data?.completed
								? "Ready for the Director's closure review"
								: "Submission not yet complete"}
					</p>
					<ul className="text-sm">
						<li>
							Terminal report:{" "}
							{result.data?.documentUploaded ? "Uploaded" : "Upload required"}
						</li>
						{result.data?.reportType !== "Terminal" && (
							<li>
								Evaluation forms:{" "}
								{result.data?.evaluationUploaded
									? "Uploaded"
									: "Upload required"}
							</li>
						)}
					</ul>
					<div className="flex flex-wrap gap-2">
						{result.data?.reportId && result.data.documentUploaded && (
							<ReportDocumentButton id={result.data.reportId} />
						)}
						{result.data?.evaluationAttachmentId && (
							<ReportDocumentButton
								kind="attachment"
								id={result.data.evaluationAttachmentId}
								label="View evaluation forms"
							/>
						)}
						{result.data?.attendanceAttachmentId && (
							<ReportDocumentButton
								kind="attachment"
								id={result.data.attendanceAttachmentId}
								label="View attendance records"
							/>
						)}
					</div>
				</>
			)}
		</PageCard>
	);
}
