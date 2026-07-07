import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { PageSkeleton } from "@/components/custom/page-skeleton";
import { UsersPage } from "@/features/admin/users-page";
import {
	adminStatsQueryOptions,
	adminUsersQueryOptions,
} from "@/lib/admin.functions";
import { isDeniedAccess } from "@/lib/permissions";

const usersSearchSchema = z.object({
	page: z.number().optional().default(1),
	pageSize: z.number().optional().default(10),
	search: z.string().optional(),
	isActive: z.string().optional(),
});

const UsersPendingComponent = () => (
	<PageSkeleton
		title="User Management"
		actionText="Bulk Approval"
		columnWidths={["w-[320px]", "w-[200px]", "w-[180px]", "w-[150px]"]}
	/>
);

export const Route = createFileRoute("/_authenticated/admin/users/")({
	validateSearch: usersSearchSchema,
	loaderDeps: ({ search }) => ({
		page: search.page,
		pageSize: search.pageSize,
		search: search.search,
		isActive: search.isActive,
	}),
	beforeLoad: ({ context }) => {
		if (isDeniedAccess(context.auth.user, "Super Admin")) {
			throw redirect({
				to: "/dashboard",
				search: { page: 1, pageSize: 10 },
			});
		}
	},
	loader: async ({ context, deps }) => {
		if (isDeniedAccess(context.auth.user, "Super Admin")) {
			return null;
		}

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
	},
	pendingComponent: UsersPendingComponent,
	component: UsersPageRoute,
});

function UsersPageRoute() {
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
