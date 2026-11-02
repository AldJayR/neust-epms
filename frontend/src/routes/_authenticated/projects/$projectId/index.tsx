import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import {
	ProjectDetailsPage,
	ProjectDetailsSkeleton,
} from "@/features/projects";
import { projectDetailsQueryOptions } from "@/features/projects/public";
import { dashboardReturnSchema } from "@/lib/director-dashboard-state";
import { isDeniedAccess } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/projects/$projectId/")({
	validateSearch: z.object({
		dashboard: dashboardReturnSchema,
		intent: z.literal("activation").optional().catch(undefined),
	}),
	beforeLoad: ({ context }) => {
		if (isDeniedAccess(context.auth.user, "Director", "RET Chair", "Faculty")) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			projectDetailsQueryOptions(params.projectId),
		);
	},
	pendingComponent: ProjectDetailsSkeleton,
	component: ProjectDetailsRoutePage,
});

function ProjectDetailsRoutePage() {
	const { projectId } = Route.useParams();
	const { user } = Route.useRouteContext();
	const { dashboard, intent } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<ProjectDetailsPage
			proposalId={projectId}
			currentUser={user}
			dashboardContext={dashboard}
			initialAction={intent}
			onActionHandled={() =>
				void navigate({
					search: (old) => ({ ...old, intent: undefined }),
					replace: true,
					resetScroll: false,
				})
			}
		/>
	);
}
