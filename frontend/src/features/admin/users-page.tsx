import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListFilter, Loader2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/custom/metric-card";
import { PageCard } from "@/components/custom/page-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandButton } from "@/components/custom/brand-button";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
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
import { StatusBadge } from "@/components/ui/status-badge";

interface UsersPageProps {
	page: number;
	pageSize: number;
	search?: string;
	isActive?: string;
	onSearch: (search: string | undefined) => void;
	onPageChange: (page: number) => void;
	onIsActiveChange: (isActive: string | undefined) => void;
}

export function UsersPage({
	page,
	pageSize,
	search,
	isActive,
	onSearch,
	onPageChange,
	onIsActiveChange,
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
	} = useQuery(adminUsersQueryOptions({ page, pageSize, search, isActive }));

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
	const hasSearch = !!search?.trim();

	const columns: DataTableColumnDef<UserResponse>[] = [
		{
			id: "name",
			header: "Faculty Name",
			headerClassName: "w-[320px] font-medium text-muted-foreground",
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
							<span className="text-sm font-normal text-foreground">
								{user.firstName} {user.lastName}
							</span>
							<span className="text-xs text-muted-foreground">
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
			headerClassName: "text-center font-medium text-muted-foreground",
			cellClassName: "text-center text-sm text-foreground",
			cell: ({ row }) => row.original.departmentName ?? row.original.campusName,
		},
		{
			id: "role",
			header: () => <div className="text-center">Role</div>,
			headerClassName: "text-center font-medium text-muted-foreground",
			cellClassName: "text-center text-sm text-foreground",
			cell: ({ row }) => row.original.roleName,
		},
		{
			id: "status",
			header: () => <div className="text-center">Status</div>,
			headerClassName: "text-center font-medium text-muted-foreground",
			cell: ({ row }) => (
				<div className="flex justify-center">
					<StatusBadge status={row.original.isActive ? "Active" : "Deactivated"} variant="outline" />
				</div>
			),
		},
		createActionsColumn({
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
		}),
	];

	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-heading">
					User Management
				</h1>
				<BulkApproveDialog>
					<BrandButton
						className="hover:bg-brand-primary-hover shadow-[0px_1px_2px_0px_var(--shadow-card)]"
						disabled={updateStatusMutation.isPending}
					>
						<CheckCircle2 className="mr-2 size-4" />
						Bulk approve
					</BrandButton>
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
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="outline"
								size="icon"
								className="h-9 w-9 rounded-lg border-border"
							>
								<ListFilter className="size-4" />
							</Button>
						}
					/>
					<DropdownMenuContent align="end" className="w-48">
						<DropdownMenuRadioGroup
							value={isActive || "all"}
							onValueChange={(val) =>
								onIsActiveChange(val === "all" ? undefined : val)
							}
						>
							<DropdownMenuRadioItem value="all">
								All Statuses
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="true">
								Active Only
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="false">
								Inactive Only
							</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<PageCard className="bg-muted min-h-[400px] relative">
				{isUsersFetching && (
					<div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				)}
				<DataTable
					columns={columns}
					data={users}
					activeFilters={{ search }}
					isLoading={isLoading}
					ariaLabel="User management"
					emptyMessage={
						hasSearch
							? "Try adjusting your search term to find matching accounts."
							: "No user accounts are available yet."
					}
				/>
			</PageCard>

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
