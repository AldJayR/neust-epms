import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProjectDetailsPage } from "@/features/director/project-details-page";
import { ProjectDetailsSkeleton } from "@/features/director/project-details-skeleton";
import { projectDetailsQueryOptions } from "@/lib/dashboard.functions";
import { isDeniedAccess } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/projects/$projectId/")({
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

	return <ProjectDetailsPage proposalId={projectId} currentUser={user} />;
}
