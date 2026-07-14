import { useQuery } from "@tanstack/react-query";
import { projectDerivedStateQueryOptions } from "@/features/projects/public";
import { proposalDerivedStateQueryOptions } from "@/features/proposals/public";

export function useProposalDerivedState(proposalId: string) {
	return useQuery(proposalDerivedStateQueryOptions(proposalId));
}

export function useProjectDerivedState(projectId: string) {
	return useQuery(projectDerivedStateQueryOptions(projectId));
}
