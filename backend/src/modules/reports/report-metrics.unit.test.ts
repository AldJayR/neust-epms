import { describe, expect, it } from "vitest";
import { REPORT_TYPE } from "@/lib/types.js";
import { getReportMetricCategory } from "./report-metrics.js";

describe("getReportMetricCategory", () => {
	it.each([
		[REPORT_TYPE.PROGRESS, "progress"],
		[REPORT_TYPE.PROGRESS_REPORT, "progress"],
		[REPORT_TYPE.TERMINAL, "terminal"],
		[REPORT_TYPE.FINAL_ACCOMPLISHMENT, "terminal"],
		[REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL, "terminal"],
	] as const)("categorizes %s as %s", (reportType, category) => {
		expect(getReportMetricCategory(reportType)).toBe(category);
	});

	it("does not categorize unrelated report types", () => {
		expect(getReportMetricCategory("Attendance Records")).toBeNull();
	});
});
