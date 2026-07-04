import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { PageSkeleton } from "@/components/custom/page-skeleton";
import { MoaRepositoryPage } from "@/features/director/moa-repository-page";
import { moaRepositoryQueryOptions } from "@/lib/dashboard.functions";
import { requireRole } from "@/lib/permissions";

const moasSearchSchema = z.object({
	page: z.number().optional().default(1),
	limit: z.number().optional().default(10),
	search: z.string().optional(),
	status: z.string().optional(),
});

const MoasPendingComponent = () => (
	<PageSkeleton
		title="Memoranda of Agreements (MOA)"
		actionText="Add New MOA"
		columnWidths={["w-[250px]", "w-[150px]", "w-[150px]", "w-[120px]"]}
	/>
);

export const Route = createFileRoute("/_authenticated/moas/")({
	validateSearch: (search) => moasSearchSchema.parse(search),
	loaderDeps: ({ search }) => ({
		page: search.page,
		limit: search.limit,
		search: search.search,
		status: search.status,
	}),
	beforeLoad: ({ context }) => {
		if (
			requireRole(context.auth.user, "Director", "RET Chair")
		) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loader: async ({ context, deps }) => {
		await context.queryClient.ensureQueryData(
			moaRepositoryQueryOptions({
				page: deps.page,
				limit: deps.limit,
				search: deps.search,
				status: deps.status,
			}),
		);
	},
	pendingComponent: MoasPendingComponent,
	component: MoasIndexPage,
});

function MoasIndexPage() {
	const { user } = Route.useRouteContext();
	const { page, limit, search, status } = Route.useSearch();
	const navigate = Route.useNavigate();

	const handleSearch = (newSearch: string) => {
		navigate({
			search: (old) => ({ ...old, search: newSearch || undefined, page: 1 }),
		});
	};

	const handlePageChange = (newPage: number) => {
		navigate({
			search: (old) => ({ ...old, page: newPage }),
		});
	};

	const handleStatusChange = (newStatus: string) => {
		navigate({
			search: (old) => ({ ...old, status: newStatus || undefined, page: 1 }),
		});
	};

	return (
		<MoaRepositoryPage
			user={user}
			page={page}
			limit={limit}
			search={search}
			status={status}
			onPageChange={handlePageChange}
			onSearchChange={handleSearch}
			onStatusChange={handleStatusChange}
		/>
	);
}
