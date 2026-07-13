import { useQuery } from "@tanstack/react-query";
import { proposalDerivedStateQueryOptions } from "@/features/proposals";
import { projectDerivedStateQueryOptions } from "@/features/projects";

export function useProposalDerivedState(proposalId: string) {
	return useQuery(proposalDerivedStateQueryOptions(proposalId));
}

export function useProjectDerivedState(projectId: string) {
	return useQuery(projectDerivedStateQueryOptions(projectId));
}
