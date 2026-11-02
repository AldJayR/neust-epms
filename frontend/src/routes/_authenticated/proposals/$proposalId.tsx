import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { projectDetailsQueryOptions } from "@/features/projects/public";
import {
	ProposalReviewPage,
	ProposalReviewSkeleton,
} from "@/features/proposals";
import { dashboardReturnSchema } from "@/lib/director-dashboard-state";
import { isDeniedAccess } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/proposals/$proposalId")({
	validateSearch: z.object({
		dashboard: dashboardReturnSchema,
		intent: z.literal("signing").optional().catch(undefined),
		documentId: z
			.union([
				z.uuid(),
				z.enum(["institutional-approval", "signed-special-order"]),
			])
			.optional()
			.catch(undefined),
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
	pendingComponent: ProposalReviewSkeleton,
	component: ProposalReviewComponent,
});

function ProposalReviewComponent() {
	const { proposalId } = Route.useParams();
	const { documentId, dashboard, intent } = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<ProposalReviewPage
			key={`${proposalId}:${documentId ?? ""}`}
			proposalId={proposalId}
			initialDocumentId={documentId}
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
