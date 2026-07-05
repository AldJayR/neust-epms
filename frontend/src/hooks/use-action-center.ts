import { useQuery } from "@tanstack/react-query";
import { actionCenterQueryOptions } from "@/lib/action-center.functions";

export function useActionCenter() {
	return useQuery(actionCenterQueryOptions());
}
