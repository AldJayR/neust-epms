import { describe, expect, it } from "vitest";
import type { ReportItem } from "@/types/report";
import {
	filterReportsByType,
	filterReportsForView,
	getProgressReportSequences,
	paginateReports,
} from "./reports-helpers";

const reports: ReportItem[] = [
	{
		reportId: "r-2",
		projectId: "p-1",
		project: "Project One",
		leader: "Leader One",
		reportType: "Progress",
		submitted: "2026-02-01T00:00:00Z",
		department: null,
		avatarUrl: null,
		academicRank: null,
		storagePath: null,
		remarks: null,
		archivedAt: null,
	},
	{
		reportId: "r-1",
		projectId: "p-1",
		project: "Project One",
		leader: "Leader One",
		reportType: "Progress",
		submitted: "2026-01-01T00:00:00Z",
		department: null,
		avatarUrl: null,
		academicRank: null,
		storagePath: null,
		remarks: null,
		archivedAt: null,
	},
	{
		reportId: "r-3",
		projectId: "p-2",
		project: "Project Two",
		leader: "Leader Two",
		reportType: "Terminal",
		submitted: "2026-03-01T00:00:00Z",
		department: null,
		avatarUrl: null,
		academicRank: null,
		storagePath: null,
		remarks: null,
		archivedAt: null,
	},
];

describe("reports helpers", () => {
	it("preserves role-aware My Reports filtering", () => {
		expect(
			filterReportsForView(reports, {
				activeTab: "my",
				isRET: true,
				userFullName: "Leader One",
				myProjectIds: new Set(["p-2"]),
			}),
		).toHaveLength(2);
		expect(
			filterReportsForView(reports, {
				activeTab: "my",
				isRET: false,
				userFullName: "Other",
				myProjectIds: new Set(["p-2"]),
			}),
		).toHaveLength(1);
	});

	it("filters types, sequences progress reports, and slices pages", () => {
		expect(filterReportsByType(reports, "Terminal")).toHaveLength(1);
		const sequences = getProgressReportSequences(reports);
		expect(sequences.get("r-1")).toBe(1);
		expect(sequences.get("r-2")).toBe(2);
		expect(
			paginateReports(reports, 2, 2).map((report) => report.reportId),
		).toEqual(["r-3"]);
	});
});
