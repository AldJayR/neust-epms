import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { UsersPage } from "@/features/admin/users-page";
import { DirectorDashboardPage } from "@/features/director/director-dashboard-page";
import { RETDashboardPage } from "@/features/ret/ret-dashboard-page";
import {
	adminStatsQueryOptions,
	adminUsersQueryOptions,
} from "@/lib/admin.functions";
import { directorDashboardQueryOptions } from "@/lib/dashboard.functions";
import {
	isDirector,
	isRETChair,
	isSuperAdmin,
	requireRole,
} from "@/lib/permissions";
import {
	retDashboardStatsQueryOptions,
	retProposalsQueryOptions,
} from "@/lib/ret.functions";

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
		if (
			requireRole(context.auth.user, "Super Admin", "Director", "RET Chair")
		) {
			return null;
		}

		if (isSuperAdmin(context.auth.user)) {
			const statsPromise = context.queryClient.ensureQueryData(
				adminStatsQueryOptions(),
			);
			const usersPromise = context.queryClient.ensureQueryData(
				adminUsersQueryOptions({
					page: deps.page,
					pageSize: deps.pageSize,
					search: deps.search,
				}),
			);
			await Promise.all([statsPromise, usersPromise]);
			return null;
		}

		if (isRETChair(context.auth.user)) {
			const statsPromise = context.queryClient.ensureQueryData(
				retDashboardStatsQueryOptions(),
			);
			const proposalsPromise = context.queryClient.ensureQueryData(
				retProposalsQueryOptions({
					page: deps.page,
					limit: deps.pageSize,
					search: deps.search,
				}),
			);
			await Promise.all([statsPromise, proposalsPromise]);
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

	if (!user) {
		return (
			<main className="flex min-h-dvh items-center justify-center p-8">
				<p className="text-sm text-muted-foreground">Loading dashboard...</p>
			</main>
		);
	}

	if (isSuperAdmin(user)) {
		return (
			<UsersPage
				page={page}
				pageSize={pageSize}
				search={search}
				onSearch={handleSearch}
				onPageChange={handlePageChange}
			/>
		);
	}

	if (isDirector(user)) {
		return <DirectorDashboardPage user={user} />;
	}

	if (isRETChair(user)) {
		return (
			<RETDashboardPage
				user={user}
				page={page}
				pageSize={pageSize}
				search={search}
				onSearch={handleSearch}
				onPageChange={handlePageChange}
			/>
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
