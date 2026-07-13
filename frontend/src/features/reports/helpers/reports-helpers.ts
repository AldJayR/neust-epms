import type { ReportItem } from "@/types/report";

export function filterReportsForView(
	reports: ReportItem[],
	{
		activeTab,
		isRET,
		userFullName,
		myProjectIds,
	}: {
		activeTab: "my" | "college";
		isRET: boolean;
		userFullName: string;
		myProjectIds: ReadonlySet<string>;
	},
): ReportItem[] {
	if (activeTab !== "my") return reports;
	return reports.filter((report) => {
		const isLeader = report.leader === userFullName;
		if (isRET) return isLeader;
		return isLeader || myProjectIds.has(report.projectId);
	});
}

export function filterReportsByType(
	reports: ReportItem[],
	typeFilter: "All" | "Progress" | "Terminal",
): ReportItem[] {
	return typeFilter === "All"
		? reports
		: reports.filter((report) => report.reportType === typeFilter);
}

export function getProgressReportSequences(
	reports: ReportItem[],
): Map<string, number> {
	const progressByProject: Record<string, ReportItem[]> = {};
	for (const report of reports) {
		if (report.reportType !== "Progress") continue;
		if (!progressByProject[report.projectId]) {
			progressByProject[report.projectId] = [];
		}
		progressByProject[report.projectId].push(report);
	}

	const sequenceMap = new Map<string, number>();
	for (const projectReports of Object.values(progressByProject)) {
		projectReports.sort(
			(a, b) =>
				new Date(a.submitted).getTime() - new Date(b.submitted).getTime(),
		);
		projectReports.forEach((report, index) => {
			sequenceMap.set(report.reportId, index + 1);
		});
	}

	return sequenceMap;
}

export function paginateReports(
	reports: ReportItem[],
	page: number,
	limit: number,
): ReportItem[] {
	const startIndex = (page - 1) * limit;
	return reports.slice(startIndex, startIndex + limit);
}
