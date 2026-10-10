import type { QueryClient } from "@tanstack/react-query";

/** Refresh the views affected by a proposal/project lifecycle change. */
export function invalidateWorkflowQueries(client: QueryClient) {
	return Promise.all(
		[
			"dashboard",
			"faculty",
			"ret",
			"proposals",
			"proposal",
			"proposal-revisions",
			"proposal-comments",
			"projects",
			"project-readiness",
			"project-derived-state",
			"project-reporting-schedule",
			"report-package",
			"analytics",
			"action-center",
			"notifications",
		].map((key) => client.invalidateQueries({ queryKey: [key] })),
	);
}
