import { useQuery } from "@tanstack/react-query";
import { projectReportingScheduleQueryOptions } from "@/lib/reporting-schedule.functions";

export function useProjectReportingSchedule(projectId: string) {
	return useQuery(projectReportingScheduleQueryOptions(projectId));
}
