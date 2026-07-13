import { useQuery } from "@tanstack/react-query";
import { projectReadinessQueryOptions } from "@/features/projects/public";

export function useProjectReadiness(projectId: string) {
	return useQuery(projectReadinessQueryOptions(projectId));
}
