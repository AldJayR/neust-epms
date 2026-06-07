import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { MoaRepositoryPage } from "@/features/director/moa-repository-page";
import { moaRepositoryQueryOptions } from "@/lib/director.functions";

const moasSearchSchema = z.object({
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
			throw redirect({ to: "/dashboard" });
		}
	},
	loaderDeps: ({ search }) => ({
		search: search.search,
		status: search.status,
	}),
	loader: async ({ context, deps }) => {
		await context.queryClient.ensureQueryData(
			moaRepositoryQueryOptions({
				search: deps.search,
				status: deps.status,
			}),
		);
	},
	component: MoasIndexPage,
});

function MoasIndexPage() {
	const { user } = Route.useRouteContext();
	const { search, status } = Route.useSearch();
	const navigate = Route.useNavigate();

	const handleSearch = (newSearch: string) => {
		navigate({
			search: (old) => ({ ...old, search: newSearch || undefined }),
		});
	};

	return (
		<MoaRepositoryPage
			user={user}
			search={search}
			status={status}
			onSearchChange={handleSearch}
		/>
	);
}
