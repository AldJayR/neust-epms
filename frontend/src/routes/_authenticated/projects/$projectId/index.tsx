import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProjectDetailsPage } from "@/features/director/project-details-page";
import { projectDetailsQueryOptions } from "@/lib/dashboard.functions";
import { requireRole } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/projects/$projectId/")({
	beforeLoad: ({ context }) => {
		if (requireRole(context.auth.user, "Director", "RET Chair")) {
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
	component: ProjectDetailsRoutePage,
});

function ProjectDetailsRoutePage() {
	const { projectId } = Route.useParams();

	return <ProjectDetailsPage proposalId={projectId} />;
}
