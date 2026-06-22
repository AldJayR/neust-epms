import { createFileRoute, redirect } from "@tanstack/react-router";
import { ReportsPage } from "@/features/director/reports-page";
import { reportsQueryOptions } from "@/lib/dashboard.functions";
import { requireRole } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/reports/")({
	beforeLoad: ({ context }) => {
		if (requireRole(context.auth.user, "Director", "RET Chair")) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(reportsQueryOptions());
	},
	component: ReportsPage,
});
