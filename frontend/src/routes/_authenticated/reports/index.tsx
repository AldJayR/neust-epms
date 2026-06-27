import { createFileRoute, redirect } from "@tanstack/react-router";
import { ReportsPage } from "@/features/director/reports-page";
import { PageSkeleton } from "@/components/custom/page-skeleton";
import { reportsQueryOptions } from "@/lib/dashboard.functions";
import { requireRole } from "@/lib/permissions";

const ReportsPendingComponent = () => (
	<PageSkeleton
		title="Reports"
		actionText="Export Reports"
		columnWidths={["w-[280px]", "w-[150px]", "w-[180px]", "w-[150px]", "w-[120px]"]}
	/>
);

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
	pendingComponent: ReportsPendingComponent,
	component: ReportsPage,
});
