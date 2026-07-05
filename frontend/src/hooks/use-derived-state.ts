import { useQuery } from "@tanstack/react-query";
import {
	projectDerivedStateQueryOptions,
	proposalDerivedStateQueryOptions,
} from "@/lib/derived-states.functions";

export function useProposalDerivedState(proposalId: string) {
	return useQuery(proposalDerivedStateQueryOptions(proposalId));
}

export function useProjectDerivedState(projectId: string) {
	return useQuery(projectDerivedStateQueryOptions(projectId));
}
