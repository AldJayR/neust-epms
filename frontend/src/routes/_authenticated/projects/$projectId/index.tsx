import { createFileRoute } from "@tanstack/react-router";
import { ProjectDetailsPage } from "@/features/director/project-details-page";
import { projectDetailsQueryOptions } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/projects/$projectId/")({
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
