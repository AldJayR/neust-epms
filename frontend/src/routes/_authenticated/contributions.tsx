import { createFileRoute, redirect } from "@tanstack/react-router";
import { AnalyticsPage } from "@/features/analytics/analytics-page";
import { analyticsQueryOptions } from "@/features/analytics/functions";
import { analyticsSearchSchema } from "@/features/analytics/schema";

export const Route = createFileRoute("/_authenticated/contributions")({
	validateSearch: analyticsSearchSchema,
	beforeLoad: ({ context }) => {
		if (context.user.roleName !== "Faculty")
			throw redirect({ to: "/dashboard", search: { page: 1, pageSize: 10 } });
	},
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			analyticsQueryOptions("participation", deps),
		),
	component: ContributionsRoute,
});
function ContributionsRoute() {
	const { user } = Route.useRouteContext();
	const filters = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<AnalyticsPage
			personal
			user={user}
			view="participation"
			filters={filters}
			onFiltersChange={(next) =>
				void navigate({ search: (previous) => ({ ...previous, ...next }) })
			}
		/>
	);
}
