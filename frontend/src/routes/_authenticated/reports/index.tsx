import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageSkeleton } from "@/components/custom/page-skeleton";
import { ReportsPage } from "@/features/director/reports-page";
import { reportsListQueryOptions } from "@/lib/dashboard.functions";
import { requireRole } from "@/lib/permissions";

const ReportsPendingComponent = () => (
	<PageSkeleton
		title="Reports"
		actionText="Export Reports"
		columnWidths={[
			"w-[280px]",
			"w-[150px]",
			"w-[180px]",
			"w-[150px]",
			"w-[120px]",
		]}
	/>
);

export const Route = createFileRoute("/_authenticated/reports/")({
	beforeLoad: ({ context }) => {
		if (requireRole(context.auth.user, "Director", "RET Chair", "Faculty")) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			reportsListQueryOptions({ page: 1, limit: 100 }),
		);
	},
	pendingComponent: ReportsPendingComponent,
	component: ReportsPage,
});
