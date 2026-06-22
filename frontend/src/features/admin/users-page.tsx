import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListFilter, Loader2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/custom/metric-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchInput } from "@/components/ui/search-input";
import {
	adminStatsQueryOptions,
	adminUsersQueryOptions,
	bulkUpdateUserStatusFn,
	type UserResponse,
} from "@/lib/admin.functions";
import { formatAcademicRank } from "@/lib/utils";
import { BulkApproveDialog } from "./bulk-approve-dialog";
import { StatusBadge } from "./components/status-badge";

interface UsersPageProps {
	page: number;
	pageSize: number;
	search?: string;
	onSearch: (search: string | undefined) => void;
	onPageChange: (page: number) => void;
}

export function UsersPage({
	page,
	pageSize,
	search,
	onSearch,
	onPageChange,
}: UsersPageProps) {
	const queryClient = useQueryClient();

	// ── Queries ──────────────────────────────────────────────

	const { data: statsData, isLoading: isStatsLoading } = useQuery(
		adminStatsQueryOptions(),
	);

	const {
		data: usersData,
		isLoading: isUsersLoading,
		isFetching: isUsersFetching,
	} = useQuery(adminUsersQueryOptions({ page, pageSize, search }));

	// ── Mutations ────────────────────────────────────────────

	const updateStatusMutation = useMutation({
		mutationFn: (variables: { userIds: string[]; isActive: boolean }) =>
			bulkUpdateUserStatusFn({ data: variables }),
		onSuccess: (data, variables) => {
			toast.success(
				`Successfully ${variables.isActive ? "activated" : "deactivated"} ${data.updatedCount} user(s)`,
			);
			queryClient.invalidateQueries({ queryKey: ["admin"] });
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	// ── Handlers ─────────────────────────────────────────────

	const stats = [
		{
			label: "Total Accounts",
			value: statsData?.totalAccounts ?? "...",
		},
		{
			label: "Pending Approval",
			value: statsData?.pendingApproval ?? "...",
		},
		{
			label: "Deactivated",
			value: statsData?.deactivated ?? "...",
		},
	];

	const isLoading = isUsersLoading || isStatsLoading;
	const users = usersData?.users ?? [];
	const hasUsers = users.length > 0;
	const hasSearch = !!search?.trim();
	const showTableHeader = hasUsers || hasSearch;

	const columns: DataTableColumnDef<UserResponse>[] = [
		{
			id: "name",
			header: "Faculty Name",
			headerClassName: "w-[320px] font-medium text-[#666]",
			cellClassName: "py-4",
			cell: ({ row }) => {
				const user = row.original;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="h-9 w-9">
							<AvatarImage src="" alt={`${user.firstName} ${user.lastName}`} />
							<AvatarFallback className="bg-primary/10 text-primary font-medium">
								{user.firstName?.charAt(0) ?? ""}
								{user.lastName?.charAt(0) ?? ""}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col text-left">
							<span className="text-sm font-normal text-[#0a0a0a]">
								{user.firstName} {user.lastName}
							</span>
							<span className="text-xs text-[#666]">
								{formatAcademicRank(user.academicRank)}
							</span>
						</div>
					</div>
				);
			},
		},
		{
			id: "department",
			header: () => <div className="text-center">Department</div>,
			headerClassName: "text-center font-medium text-[#666]",
			cellClassName: "text-center text-sm text-[#0a0a0a]",
			cell: ({ row }) => row.original.departmentName ?? row.original.campusName,
		},
		{
			id: "role",
			header: () => <div className="text-center">Role</div>,
			headerClassName: "text-center font-medium text-[#666]",
			cellClassName: "text-center text-sm text-[#0a0a0a]",
			cell: ({ row }) => row.original.roleName,
		},
		{
			id: "status",
			header: () => <div className="text-center">Status</div>,
			headerClassName: "text-center font-medium text-[#666]",
			cell: ({ row }) => (
				<div className="flex justify-center">
					<StatusBadge isActive={row.original.isActive} />
				</div>
			),
		},
		{
			id: "actions",
			header: "",
			headerClassName: "w-[50px]",
			cell: ({ row }) => {
				const user = row.original;
				return (
					<div className="flex justify-end pr-2">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button variant="ghost" size="icon" className="size-8" />
								}
								aria-label="Open user actions"
							>
								<MoreVertical className="size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem>View Details</DropdownMenuItem>
								<DropdownMenuItem>Edit User</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className={
										user.isActive ? "text-destructive" : "text-primary"
									}
									onClick={() =>
										updateStatusMutation.mutate({
											userIds: [user.userId],
											isActive: !user.isActive,
										})
									}
									disabled={updateStatusMutation.isPending}
								>
									{user.isActive ? "Deactivate" : "Activate"}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];

	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-[#11215a]">
					User Management
				</h1>
				<BulkApproveDialog>
					<Button
						className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-[10px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]"
						disabled={updateStatusMutation.isPending}
					>
						<CheckCircle2 className="mr-2 size-4" />
						Bulk approve
					</Button>
				</BulkApproveDialog>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				{stats.map((stat) => (
					<MetricCard
						key={stat.label}
						label={stat.label}
						value={stat.value}
						variant="card"
					/>
				))}
			</div>

			<div className="flex items-center justify-between gap-4">
				<SearchInput
					value={search ?? ""}
					onChange={(val) => onSearch(val || undefined)}
					placeholder="Search users"
					ariaLabel="Search users"
					className="max-w-[352px]"
				/>
				<Button
					variant="outline"
					size="icon"
					className="h-9 w-9 rounded-lg border-[#e5e5e5]"
				>
					<ListFilter className="size-4" />
				</Button>
			</div>

			<div className="rounded-[12px] border border-[#ebebeb] bg-[#f9f9f9] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden min-h-[400px] relative">
				{isUsersFetching && (
					<div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				)}
				<DataTable
					columns={columns}
					data={users}
					isLoading={isLoading}
					ariaLabel="User management"
					showHeader={showTableHeader}
					emptyMessage={
						hasSearch
							? "Try adjusting your search term to find matching accounts."
							: "No user accounts are available yet."
					}
				/>
			</div>

			<PaginationBar
				page={page}
				totalPages={Math.ceil((usersData?.total ?? 0) / pageSize)}
				onPageChange={onPageChange}
				total={usersData?.total ?? 0}
				limit={pageSize}
				isLoading={isLoading}
			/>
		</div>
	);
}
