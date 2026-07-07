import { createFileRoute, redirect } from "@tanstack/react-router";
import { MoaDetailsPage } from "@/features/moa/moa-details-page";
import { MoaDetailsSkeleton } from "@/features/moa/moa-details-skeleton";
import {
	moaDetailsQueryOptions,
	moaLinkedProjectsQueryOptions,
} from "@/lib/moa.functions";
import { isDeniedAccess } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/moas/$moaId/")({
	beforeLoad: ({ context }) => {
		if (
			isDeniedAccess(context.auth.user, "Director", "RET Chair")
		) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				moaDetailsQueryOptions(params.moaId),
			),
			context.queryClient.ensureQueryData(
				moaLinkedProjectsQueryOptions(params.moaId),
			),
		]);
	},
	pendingComponent: MoaDetailsSkeleton,
	component: MoaRouteComponent,
});

function MoaRouteComponent() {
	const { moaId } = Route.useParams();
	const { user } = Route.useRouteContext();

	return <MoaDetailsPage moaId={moaId} currentUser={user} />;
}
