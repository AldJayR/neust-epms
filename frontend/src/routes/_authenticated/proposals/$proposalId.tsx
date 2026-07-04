import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProjectDetailsSkeleton } from "@/features/director/project-details-skeleton";
import { ProposalReviewPage } from "@/features/director/proposal-review-page";
import { projectDetailsQueryOptions } from "@/lib/dashboard.functions";
import { requireRole } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/proposals/$proposalId")({
	beforeLoad: ({ context }) => {
		if (requireRole(context.auth.user, "Director", "RET Chair", "Faculty")) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loader: async ({ context, params }) => {
		const data = await context.queryClient.ensureQueryData(
			projectDetailsQueryOptions(params.proposalId),
		);
		const user = context.auth.user;
		if (user?.roleName === "Faculty" && data) {
			const isMember = data.members?.some((m) => m.userId === user.userId);
			if (!isMember) {
				throw redirect({
					to: "/dashboard",
					search: { page: 1, pageSize: 10 },
				});
			}
		}
	},
	pendingComponent: ProjectDetailsSkeleton,
	component: ProposalReviewComponent,
});

function ProposalReviewComponent() {
	const { proposalId } = Route.useParams();
	return <ProposalReviewPage proposalId={proposalId} />;
}
