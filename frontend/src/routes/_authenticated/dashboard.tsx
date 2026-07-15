import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { actionCenterQueryOptions } from "@/features/action-center";
import {
	adminStatsQueryOptions,
	adminUsersQueryOptions,
} from "@/features/admin";
import { UsersPage } from "@/features/admin/users-page";
import { getCampusesFn } from "@/features/auth";
import {
	DashboardPendingSkeleton,
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
	pendingComponent: DashboardPendingComponent,
	component: DashboardPage,
});

function DashboardPendingComponent() {
	const { user } = Route.useRouteContext();
	return <DashboardPendingSkeleton user={user} />;
}

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
