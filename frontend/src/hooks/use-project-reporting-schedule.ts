import { useQuery } from "@tanstack/react-query";
import { projectReportingScheduleQueryOptions } from "@/features/projects/public";

export function useProjectReportingSchedule(projectId: string) {
	return useQuery(projectReportingScheduleQueryOptions(projectId));
}
