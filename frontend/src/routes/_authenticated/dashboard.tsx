import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminShell } from "@/features/admin/admin-shell";
import { UsersPage } from "@/features/admin/users-page";
import { DirectorDashboardPage } from "@/features/director/director-dashboard-page";
import { directorDashboardQueryOptions } from "@/lib/director.functions";
import {
	adminStatsQueryOptions,
	adminUsersQueryOptions,
} from "@/lib/admin.functions";

const dashboardSearchSchema = z.object({
	page: z.number().optional().default(1),
	pageSize: z.number().optional().default(10),
	search: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
	validateSearch: (search) => dashboardSearchSchema.parse(search),
	loaderDeps: ({ search }) => ({
		page: search.page,
		pageSize: search.pageSize,
		search: search.search,
	}),
	loader: async ({ context, deps }) => {
		if (context.auth.user?.roleName !== "Super Admin" && context.auth.user?.roleName !== "Director") {
			return null;
		}

		if (context.auth.user?.roleName === "Super Admin") {
			await Promise.all([
				context.queryClient.ensureQueryData(adminStatsQueryOptions()),
				context.queryClient.ensureQueryData(
					adminUsersQueryOptions({
						page: deps.page,
						pageSize: deps.pageSize,
						search: deps.search,
					}),
				),
			]);
			return null;
		}

		await context.queryClient.ensureQueryData(directorDashboardQueryOptions());
	},
	component: DashboardPage,
});

function DashboardPage() {
	const { user } = Route.useRouteContext();
	const { page, pageSize, search } = Route.useSearch();
	const navigate = Route.useNavigate();

	const handleSearch = (newSearch: string | undefined) => {
		navigate({
			search: (old) => ({ ...old, search: newSearch, page: 1 }),
		});
	};

	const handlePageChange = (newPage: number) => {
		navigate({
			search: (old) => ({ ...old, page: newPage }),
		});
	};

	if (user.roleName === "Super Admin") {
		return (
			<AdminShell>
				<UsersPage
					page={page}
					pageSize={pageSize}
					search={search}
					onSearch={handleSearch}
					onPageChange={handlePageChange}
				/>
			</AdminShell>
		);
	}

	if (user.roleName === "Director") {
		return <DirectorDashboardPage user={user} />;
	}

	return (
		<main className="flex min-h-dvh items-center justify-center p-8">
			<div className="text-center">
				<h1 className="text-2xl font-bold text-card-foreground">Dashboard</h1>
				<p className="mt-2 text-muted-foreground">
					Welcome! This page is under construction.
				</p>
			</div>
		</main>
	);
}
