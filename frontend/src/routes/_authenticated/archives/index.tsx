import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageSkeleton } from "@/components/custom/page-skeleton";
import { ArchivesPage } from "@/features/archives/archives-page";
import {
	archivedProjectsQueryOptions,
	archivedProposalsQueryOptions,
} from "@/lib/archives.functions";
import { isDeniedAccess } from "@/lib/permissions";

const ArchivesPendingComponent = () => (
	<PageSkeleton
		title="Compliance Archives"
		actionText=""
		columnWidths={["w-[380px]", "w-[180px]", "w-[180px]", "w-[100px]"]}
	/>
);

export const Route = createFileRoute("/_authenticated/archives/")({
	beforeLoad: ({ context }) => {
		if (isDeniedAccess(context.auth.user, "Director", "RET Chair", "Faculty")) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loader: async ({ context }) => {
		// Pre-fetch first page of archived proposals and projects
		await Promise.all([
			context.queryClient.ensureQueryData(
				archivedProposalsQueryOptions({ page: 1, limit: 10 }),
			),
			context.queryClient.ensureQueryData(
				archivedProjectsQueryOptions({ page: 1, limit: 10 }),
			),
		]);
	},
	pendingComponent: ArchivesPendingComponent,
	component: ArchivesIndexPage,
});

function ArchivesIndexPage() {
	const { user } = Route.useRouteContext();
	return <ArchivesPage user={user} />;
}
