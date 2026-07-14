import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PageHeader } from "@/components/custom/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { actionCenterQueryOptions } from "@/features/action-center";
import {
	adminStatsQueryOptions,
	adminUsersQueryOptions,
} from "@/features/admin";
import { UsersPage } from "@/features/admin/users-page";
import { getCampusesFn } from "@/features/auth";
import {
	DirectorDashboardPage,
	directorDashboardQueryOptions,
} from "@/features/dashboard";
import { FacultyDashboardPage } from "@/features/faculty/faculty-dashboard-page";
import {
	facultyProjectsQueryOptions,
	facultyProposalsQueryOptions,
} from "@/features/faculty/public";
import {
	retDashboardStatsQueryOptions,
	retProposalsQueryOptions,
} from "@/features/proposals/public";
import { RETDashboardPage } from "@/features/ret/ret-dashboard-page";
import {
	isDeniedAccess,
	isDirector,
	isRETChair,
	isSuperAdmin,
} from "@/lib/permissions";

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
	loader: async ({ context, deps }) => {
		if (
			isDeniedAccess(context.auth.user, "Super Admin", "Director", "RET Chair")
		) {
			await Promise.all([
				context.queryClient.ensureQueryData(actionCenterQueryOptions()),
				context.queryClient.ensureQueryData(
					facultyProposalsQueryOptions({ page: 1, limit: 100 }),
				),
				context.queryClient.ensureQueryData(
					facultyProjectsQueryOptions({ page: 1, limit: 100 }),
				),
			]);
			return null;
		}

		if (isSuperAdmin(context.auth.user)) {
			await Promise.all([
				context.queryClient.ensureQueryData(adminStatsQueryOptions()),
				context.queryClient.ensureQueryData(
					adminUsersQueryOptions({
						page: deps.page,
						pageSize: deps.pageSize,
						search: deps.search,
						isActive: deps.isActive,
					}),
				),
			]);
			return null;
		}

		if (isRETChair(context.auth.user)) {
			await Promise.all([
				context.queryClient.ensureQueryData(actionCenterQueryOptions()),
				context.queryClient.ensureQueryData(retDashboardStatsQueryOptions()),
				context.queryClient.ensureQueryData(
					retProposalsQueryOptions({
						page: deps.page,
						limit: deps.pageSize,
						search: deps.search,
					}),
				),
			]);
			return null;
		}

		// Director path
		await Promise.all([
			context.queryClient.ensureQueryData(actionCenterQueryOptions()),
			context.queryClient.ensureQueryData(directorDashboardQueryOptions()),
			context.queryClient.ensureQueryData({
				queryKey: ["campuses"],
				queryFn: () => getCampusesFn(),
				staleTime: Number.POSITIVE_INFINITY,
			}),
		]);
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
				<PageHeader
					title={
						<div className="flex flex-col gap-2 w-1/3">
							<Skeleton className="h-8 w-3/4 rounded-md" />
							<Skeleton className="h-4 w-1/2 rounded-md" />
						</div>
					}
					actions={<Skeleton className="h-9 w-48 rounded-[10px]" />}
				/>

				{/* Stats Cards Skeleton */}
				<div className="grid gap-6 md:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-[104px] rounded-[12px] border border-border bg-background p-4 flex flex-col gap-4 shadow-[0px_1px_3px_0px_var(--shadow-card)]"
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
				<div className="rounded-[12px] border border-border bg-background overflow-hidden min-h-[400px] shadow-[0px_1px_3px_0px_var(--shadow-card)] p-4 flex flex-col gap-4">
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

	return <FacultyDashboardPage user={user} />;
}
