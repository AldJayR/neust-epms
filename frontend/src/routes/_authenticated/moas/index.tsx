import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { MoaRepositoryPage } from "@/features/director/moa-repository-page";
import { moaRepositoryQueryOptions } from "@/lib/director.functions";

const moasSearchSchema = z.object({
	page: z.number().optional().default(1),
	limit: z.number().optional().default(10),
	search: z.string().optional(),
	status: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/moas/")({
	validateSearch: (search) => moasSearchSchema.parse(search),
	beforeLoad: ({ context }) => {
		if (
			context.auth.user?.roleName !== "Director" &&
			context.auth.user?.roleName !== "Super Admin"
		) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loaderDeps: ({ search }) => ({
		page: search.page,
		limit: search.limit,
		search: search.search,
		status: search.status,
	}),
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

	return (
		<MoaRepositoryPage
			user={user}
			page={page}
			limit={limit}
			search={search}
			status={status}
			onPageChange={handlePageChange}
			onSearchChange={handleSearch}
		/>
	);
}
