import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { CheckCircle2, ListFilter, MoreVertical, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BrandButton } from "@/components/custom/brand-button";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import { PageHeader } from "@/components/custom/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import {
	adminStatsQueryOptions,
	adminUsersQueryOptions,
	bulkUpdateUserStatusFn,
	type UserResponse,
} from "@/lib/admin.functions";
import { formatAcademicRank } from "@/lib/utils";
import { BulkApproveDialog } from "./bulk-approve-dialog";
import { AddUserDialog } from "./add-user-dialog";
import { ViewUserDialog } from "./view-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";

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
	const [sorting, setSorting] = useState<SortingState>([]);
	const queryClient = useQueryClient();

	// ── Queries ──────────────────────────────────────────────

	const { data: statsData, isLoading: isStatsLoading } = useQuery(
		adminStatsQueryOptions(),
	);

	const { data: usersData, isLoading: isUsersLoading } = useQuery(
		adminUsersQueryOptions({ page, pageSize, search, isActive }),
	);

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
			accessorFn: (row) => `${row.firstName} ${row.lastName}`,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Faculty Name" />
			),
			headerClassName: "w-[320px] font-medium text-muted-foreground",
			cellClassName: "py-4",
			cell: ({ row }) => {
				const user = row.original;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="h-9 w-9">
							<AvatarImage src={user.avatarUrl ?? ""} alt={`${user.firstName} ${user.lastName}`} />
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
			accessorFn: (row) => row.departmentName ?? row.campusName,
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Department"
					className="justify-center"
				/>
			),
			headerClassName: "text-center font-medium text-muted-foreground",
			cellClassName: "text-center text-sm text-foreground",
			cell: ({ row }) => row.original.departmentName ?? row.original.campusName,
		},
		{
			id: "role",
			accessorKey: "roleName",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Role"
					className="justify-center"
				/>
			),
			headerClassName: "text-center font-medium text-muted-foreground",
			cellClassName: "text-center text-sm text-foreground",
			cell: ({ row }) => row.original.roleName,
		},
		{
			id: "status",
			accessorKey: "isActive",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Status"
					className="justify-center"
				/>
			),
			headerClassName: "text-center font-medium text-muted-foreground",
			cell: ({ row }) => (
				<div className="flex justify-center">
					<StatusBadge
						status={row.original.isActive ? "Active" : "Deactivated"}
						variant="outline"
					/>
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
								<ViewUserDialog user={user}>
									<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
										View Details
									</DropdownMenuItem>
								</ViewUserDialog>
								<EditUserDialog user={user}>
									<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
										Edit User
									</DropdownMenuItem>
								</EditUserDialog>
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
			<PageHeader
				title={
					<h1 className="text-2xl font-semibold text-heading">
						User Management
					</h1>
				}
				actions={
					<div className="flex gap-3">
						<BulkApproveDialog>
							<BrandButton
								variant="outline"
								className="shadow-[0px_1px_2px_0px_var(--shadow-card)] border-border bg-background"
								disabled={updateStatusMutation.isPending}
							>
								<CheckCircle2 className="mr-2 size-4" />
								Bulk approve
							</BrandButton>
						</BulkApproveDialog>
						<AddUserDialog>
							<BrandButton
								className="hover:bg-brand-primary-hover shadow-[0px_1px_2px_0px_var(--shadow-card)]"
								disabled={updateStatusMutation.isPending}
							>
								<Plus className="mr-2 size-4" />
								Add User
							</BrandButton>
						</AddUserDialog>
					</div>
				}
			/>

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

			<DataTablePage
				columns={columns}
				data={users}
				total={usersData?.total ?? 0}
				isLoading={isLoading}
				page={page}
				pageSize={pageSize}
				onPageChange={onPageChange}
				search={search}
				onSearch={(val) => onSearch(val || undefined)}
				searchPlaceholder="Search users"
				sorting={sorting}
				onSortingChange={setSorting}
				enableSorting
				filters={
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
				}
				activeFilters={{ search }}
				ariaLabel="User management"
				emptyMessage={
					hasSearch
						? "Try adjusting your search term to find matching accounts."
						: "No user accounts are available yet."
				}
			/>
		</div>
	);
}
