import { REPORT_TYPE } from "@/lib/types.js";

export const PROGRESS_REPORT_TYPES = [
	REPORT_TYPE.PROGRESS,
	REPORT_TYPE.PROGRESS_REPORT,
] as const;

export const TERMINAL_REPORT_TYPES = [
	REPORT_TYPE.TERMINAL,
	REPORT_TYPE.FINAL_ACCOMPLISHMENT,
	REPORT_TYPE.ACCOMPLISHMENT_AND_TERMINAL,
] as const;

export function getReportMetricCategory(
	reportType: string,
): "progress" | "terminal" | null {
	if (PROGRESS_REPORT_TYPES.some((type) => type === reportType))
		return "progress";
	if (TERMINAL_REPORT_TYPES.some((type) => type === reportType))
		return "terminal";
	return null;
}
