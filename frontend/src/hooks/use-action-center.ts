import { useQuery } from "@tanstack/react-query";
import { actionCenterQueryOptions } from "@/features/action-center";

export function useActionCenter() {
	return useQuery(actionCenterQueryOptions());
}
