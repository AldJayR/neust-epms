import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { UsersPage } from "@/features/admin/users-page";
import { DirectorDashboardPage } from "@/features/director/director-dashboard-page";
import { AppShell } from "@/features/layout/app-shell";
import {
	adminStatsQueryOptions,
	adminUsersQueryOptions,
} from "@/lib/admin.functions";
import { directorDashboardQueryOptions } from "@/lib/director.functions";

const dashboardSearchSchema = z.object({
	search: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
	validateSearch: (search) => dashboardSearchSchema.parse(search),
	loaderDeps: ({ search }) => ({
		search: search.search,
	}),
	loader: async ({ context, deps }) => {
		if (
			context.auth.user?.roleName !== "Super Admin" &&
			context.auth.user?.roleName !== "Director"
		) {
			return null;
		}

		if (context.auth.user?.roleName === "Super Admin") {
			const statsPromise = context.queryClient.ensureQueryData(
				adminStatsQueryOptions(),
			);
			const usersPromise = context.queryClient.ensureQueryData(
				adminUsersQueryOptions({
					search: deps.search,
				}),
			);
			await Promise.all([statsPromise, usersPromise]);
			return null;
		}

		// Director path
		await context.queryClient.ensureQueryData(directorDashboardQueryOptions());
		return null;
	},
	component: DashboardPage,
});

function DashboardPage() {
	const { user } = Route.useRouteContext();
	const { search } = Route.useSearch();
	const navigate = Route.useNavigate();

	const handleSearch = (newSearch: string | undefined) => {
		navigate({
			search: (old) => ({ ...old, search: newSearch }),
		});
	};

	if (user?.roleName === "Super Admin") {
		return (
			<AppShell>
				<UsersPage
					search={search}
					onSearch={handleSearch}
				/>
			</AppShell>
		);
	}

	if (user?.roleName === "Director") {
		return (
			<AppShell>
				<DirectorDashboardPage user={user} />
			</AppShell>
		);
	}

	return (
		<main className="flex min-h-dvh items-center justify-center p-8">
			<div className="text-center">
				<h1 className="text-2xl font-semibold text-card-foreground">
					Dashboard
				</h1>
				<p className="mt-2 text-muted-foreground">
					Welcome! This page is under construction.
				</p>
			</div>
		</main>
	);
}
