import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CheckCircle2,
	Filter,
	Loader2,
	MoreVertical,
	Users,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/custom/metric-card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { TableCell, TableRow } from "@/components/ui/table";
import {
	adminStatsQueryOptions,
	adminUsersQueryOptions,
	bulkUpdateUserStatusFn,
} from "@/lib/admin.functions";
import { formatAcademicRank } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";
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

	const columns: DataTableColumn[] = [
		{ key: "name", label: "Faculty Name", className: "w-[320px] font-medium text-[#666]" },
		{ key: "department", label: "Department", className: "text-center font-medium text-[#666]" },
		{ key: "role", label: "Role", className: "text-center font-medium text-[#666]" },
		{ key: "status", label: "Status", className: "text-center font-medium text-[#666]" },
		{ key: "actions", label: "", className: "w-[50px]" },
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
					<Filter className="size-4" />
				</Button>
			</div>

			<div className="rounded-[12px] border border-[#ebebeb] bg-[#f9f9f9] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden min-h-[400px] relative">
				{isUsersFetching && (
					<div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				)}
				{hasUsers || isLoading ? (
					<DataTable
						columns={columns}
						data={users}
						renderRow={(user) => (
							<TableRow
								key={user.userId}
								className="bg-white border-b-[#ebebeb] hover:bg-[#fcfcfc]"
							>
								<TableCell className="py-4">
									<div className="flex items-center gap-3">
										<Avatar className="h-9 w-9">
											<AvatarImage
												src=""
												alt={`${user.firstName} ${user.lastName}`}
											/>
											<AvatarFallback className="bg-primary/10 text-primary font-medium">
												{user.firstName[0]}
												{user.lastName[0]}
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col">
											<span className="text-sm font-normal text-[#0a0a0a]">
												{user.firstName} {user.lastName}
											</span>
											<span className="text-xs text-[#666]">
												{formatAcademicRank(user.academicRank)}
											</span>
										</div>
									</div>
								</TableCell>
								<TableCell className="text-center text-sm text-[#0a0a0a]">
									{user.departmentName ?? user.campusName}
								</TableCell>
								<TableCell className="text-center text-sm text-[#0a0a0a]">
									{user.roleName}
								</TableCell>
								<TableCell>
									<div className="flex justify-center">
										<StatusBadge isActive={user.isActive} />
									</div>
								</TableCell>
								<TableCell>
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													variant="ghost"
													size="icon"
													className="size-8"
												/>
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
								</TableCell>
							</TableRow>
						)}
						isLoading={isLoading}
						isEmpty={!hasUsers}
						colSpan={5}
						ariaLabel="User management"
					/>
				) : (
					<div className="flex min-h-[400px] items-center justify-center bg-white px-6">
						<Empty className="border-0 p-0">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Users className="size-5" />
								</EmptyMedia>
								<EmptyTitle>No users found</EmptyTitle>
								<EmptyDescription>
									{hasSearch
										? "Try adjusting your search term to find matching accounts."
										: "No user accounts are available yet."}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					</div>
				)}
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


