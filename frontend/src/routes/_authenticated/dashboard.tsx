import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
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
	isActive: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
	validateSearch: (search) => dashboardSearchSchema.parse(search),
	loaderDeps: ({ search }) => ({
		page: search.page,
		pageSize: search.pageSize,
		search: search.search,
		isActive: search.isActive,
	}),
	loader: ({ context, deps }) => {
		if (
			requireRole(context.auth.user, "Super Admin", "Director", "RET Chair")
		) {
			return null;
		}

		if (isSuperAdmin(context.auth.user)) {
			context.queryClient.prefetchQuery(adminStatsQueryOptions());
			context.queryClient.prefetchQuery(
				adminUsersQueryOptions({
					page: deps.page,
					pageSize: deps.pageSize,
					search: deps.search,
					isActive: deps.isActive,
				}),
			);
			return null;
		}

		if (isRETChair(context.auth.user)) {
			context.queryClient.prefetchQuery(retDashboardStatsQueryOptions());
			context.queryClient.prefetchQuery(
				retProposalsQueryOptions({
					page: deps.page,
					limit: deps.pageSize,
					search: deps.search,
				}),
			);
			return null;
		}

		// Director path
		context.queryClient.prefetchQuery(directorDashboardQueryOptions());
		return null;
	},
	component: DashboardPage,
});

function DashboardPage() {
	const { user } = Route.useRouteContext();
	const { page, pageSize, search, isActive } = Route.useSearch();
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

	const handleIsActiveChange = (newIsActive: string | undefined) => {
		navigate({
			search: (old) => ({
				...old,
				isActive: newIsActive || undefined,
				page: 1,
			}),
		});
	};

	if (!user) {
		return (
			<div className="flex flex-col gap-8">
				{/* Welcome Header Skeleton */}
				<div className="flex items-start justify-between">
					<div className="flex flex-col gap-2 w-1/3">
						<Skeleton className="h-8 w-3/4 rounded-md" />
						<Skeleton className="h-4 w-1/2 rounded-md" />
					</div>
					<Skeleton className="h-9 w-48 rounded-[10px]" />
				</div>

				{/* Stats Cards Skeleton */}
				<div className="grid gap-6 md:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-[104px] rounded-[12px] border border-[#ebebeb] bg-white p-4 flex flex-col gap-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]"
						>
							<Skeleton className="h-4 w-1/3 rounded-md" />
							<Skeleton className="h-9 w-1/4 rounded-md" />
						</div>
					))}
				</div>

				{/* Filters Skeleton */}
				<div className="flex items-center justify-between gap-4">
					<Skeleton className="h-9 w-[352px] rounded-lg" />
					<Skeleton className="h-9 w-[180px] rounded-lg" />
				</div>

				{/* Proposals Table Skeleton */}
				<div className="rounded-[12px] border border-[#ebebeb] bg-white overflow-hidden min-h-[400px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-4 flex flex-col gap-4">
					<div className="flex justify-between border-b pb-4">
						<Skeleton className="h-4 w-1/4 rounded-md" />
						<Skeleton className="h-4 w-1/5 rounded-md" />
						<Skeleton className="h-4 w-1/6 rounded-md" />
					</div>
					{[1, 2, 3, 4, 5].map((i) => (
						<div key={i} className="flex justify-between py-2 items-center">
							<Skeleton className="h-4 w-1/3 rounded-md" />
							<Skeleton className="h-4 w-1/4 rounded-md" />
							<Skeleton className="h-4 w-1/6 rounded-md" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (isSuperAdmin(user)) {
		return (
			<UsersPage
				page={page}
				pageSize={pageSize}
				search={search}
				isActive={isActive}
				onSearch={handleSearch}
				onPageChange={handlePageChange}
				onIsActiveChange={handleIsActiveChange}
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
