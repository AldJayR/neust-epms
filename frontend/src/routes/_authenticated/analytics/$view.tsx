import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AnalyticsPage } from "@/features/analytics/analytics-page";
import { analyticsQueryOptions } from "@/features/analytics/functions";
import {
	analyticsSearchSchema,
	analyticsViews,
} from "@/features/analytics/schema";

export const Route = createFileRoute("/_authenticated/analytics/$view")({
	validateSearch: analyticsSearchSchema,
	beforeLoad: ({ context, params }) => {
		z.enum(analyticsViews).parse(params.view);
		if (!["Director", "RET Chair"].includes(context.user.roleName))
			throw redirect({ to: "/dashboard", search: { page: 1, pageSize: 10 } });
	},
	loaderDeps: ({ search }) => search,
	loader: ({ context, params, deps }) =>
		context.queryClient.ensureQueryData(
			analyticsQueryOptions(z.enum(analyticsViews).parse(params.view), deps),
		),
	component: AnalyticsRoute,
});
function AnalyticsRoute() {
	const { user } = Route.useRouteContext();
	const { view } = Route.useParams();
	const filters = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<AnalyticsPage
			user={user}
			view={z.enum(analyticsViews).parse(view)}
			filters={filters}
			onFiltersChange={(next) =>
				void navigate({ search: (previous) => ({ ...previous, ...next }) })
			}
		/>
	);
}
