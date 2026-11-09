import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import { currentManilaYear } from "@/lib/dashboard-year";
import {
	type DirectorDashboardState,
	directorDashboardStateSchema,
} from "@/lib/director-dashboard-state";

export function useDirectorDashboardState() {
	const search = useSearch({ from: "/_authenticated/dashboard" });
	const navigate = useNavigate({ from: "/dashboard" });
	const state = directorDashboardStateSchema.parse({
		...search,
		year: search.year ?? currentManilaYear(),
	});
	const update = useCallback(
		(patch: Partial<DirectorDashboardState>) =>
			navigate({
				to: "/dashboard",
				search: (old) => ({ ...old, ...patch }),
				resetScroll: false,
			}),
		[navigate],
	);
	return { state, update };
}
