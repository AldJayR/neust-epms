import { useQuery } from "@tanstack/react-query";
import { projectReadinessQueryOptions } from "@/lib/project-readiness.functions";

export function useProjectReadiness(projectId: string) {
	return useQuery(projectReadinessQueryOptions(projectId));
}
