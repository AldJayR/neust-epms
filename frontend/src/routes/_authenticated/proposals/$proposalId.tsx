import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProposalReviewPage } from "@/features/director/proposal-review-page";
import { projectDetailsQueryOptions } from "@/lib/dashboard.functions";
import { requireRole } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/proposals/$proposalId")({
	beforeLoad: ({ context }) => {
		if (requireRole(context.auth.user, 'Director', 'RET Chair')) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			projectDetailsQueryOptions(params.proposalId),
		);
	},
	component: ProposalReviewComponent,
});

function ProposalReviewComponent() {
	const { proposalId } = Route.useParams();
	return <ProposalReviewPage proposalId={proposalId} />;
}
