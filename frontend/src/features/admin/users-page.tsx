import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	MoreVertical,
	Search,
	Filter,
	CheckCircle2,
	XCircle,
	Loader2,
	Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	bulkUpdateUserStatusFn,
	adminStatsQueryOptions,
	adminUsersQueryOptions,
} from "@/lib/admin.functions";
import { toast } from "sonner";

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

	const [searchInput, setSearchInput] = React.useState(search ?? "");

	// ── Queries ──────────────────────────────────────────────

	const statsQuery = useQuery(adminStatsQueryOptions());

	const usersQuery = useQuery(adminUsersQueryOptions({ page, pageSize, search }));

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

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSearch(searchInput || undefined);
	};

	const stats = [
		{
			label: "Total Accounts",
			value: statsQuery.data?.totalAccounts ?? "...",
		},
		{
			label: "Pending Approval",
			value: statsQuery.data?.pendingApproval ?? "...",
		},
		{
			label: "Deactivated",
			value: statsQuery.data?.deactivated ?? "...",
		},
	];

	const isLoading = usersQuery.isLoading || statsQuery.isLoading;
	const users = usersQuery.data?.users ?? [];
	const hasUsers = users.length > 0;
	const hasSearch = !!search?.trim();

	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-[#11215a]">
					User Management
				</h1>
				<Button
					className="bg-[#1e3b8a] hover:bg-[#1e3b8a]/90 text-white rounded-[10px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]"
					disabled={updateStatusMutation.isPending}
				>
					<CheckCircle2 className="mr-2 h-4 w-4" />
					Bulk approve
				</Button>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				{stats.map((stat) => (
					<Card
						key={stat.label}
						className="border-[#ebebeb] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] rounded-[12px]"
					>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-normal text-[#666]">
								{stat.label}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-4xl font-semibold text-[#11215a]">
								{stat.value}
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="flex items-center justify-between gap-4">
				<form
					onSubmit={handleSearchSubmit}
					className="relative w-full max-w-[352px]"
				>
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search users"
						className="h-9 w-full rounded-lg border-[#e5e5e5] pl-9"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
					/>
				</form>
				<Button
					variant="outline"
					size="icon"
					className="h-9 w-9 rounded-lg border-[#e5e5e5]"
				>
					<Filter className="h-4 w-4" />
				</Button>
			</div>

			<div className="rounded-[12px] border border-[#ebebeb] bg-[#f9f9f9] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden min-h-[400px] relative">
				{usersQuery.isFetching && (
					<div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				)}
				{hasUsers || isLoading ? (
					<Table>
						<TableHeader className="bg-white">
							<TableRow className="hover:bg-transparent">
								<TableHead className="w-[320px] font-medium text-[#666]">
									Faculty Name
								</TableHead>
								<TableHead className="text-center font-medium text-[#666]">
									Department
								</TableHead>
								<TableHead className="text-center font-medium text-[#666]">
									Role
								</TableHead>
								<TableHead className="text-center font-medium text-[#666]">
									Status
								</TableHead>
								<TableHead className="w-[50px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.map((user) => (
								<TableRow
									key={user.userId}
									className="bg-white border-b-[#ebebeb] hover:bg-[#fcfcfc]"
								>
									<TableCell className="py-4">
										<div className="flex items-center gap-3">
											<Avatar className="h-9 w-9">
												<AvatarImage src="" />
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
													{user.academicRank ?? "Faculty"}
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
												render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
												aria-label="Open user actions"
												>
												<MoreVertical className="h-4 w-4" />
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
							))}
						</TableBody>
					</Table>
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

			<div className="flex items-center justify-between">
				<p className="text-xs text-[#666]">
					Showing{" "}
					<span className="font-bold">
						{usersQuery.data?.users.length ?? 0}
					</span>{" "}
					of <span className="font-bold">{usersQuery.data?.total ?? 0}</span>{" "}
					results
				</p>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-9 gap-1 px-3 font-medium"
						onClick={() => onPageChange(Math.max(1, page - 1))}
						disabled={page <= 1 || isLoading}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="h-9 w-9 bg-white font-medium border-[#e5e5e5]"
					>
						{page}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-9 gap-1 px-3 font-medium"
						onClick={() => onPageChange(page + 1)}
						disabled={
							!usersQuery.data ||
							page * pageSize >= usersQuery.data.total ||
							isLoading
						}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}

function StatusBadge({ isActive }: { isActive: boolean }) {
	if (isActive) {
		return (
			<Badge
				variant="outline"
				className="h-[22px] gap-1 rounded-lg border-[#e5e5e5] px-2 font-medium text-[#737373] bg-white"
			>
				<CheckCircle2 className="h-3 w-3 text-[#10b981]" />
				Active
			</Badge>
		);
	}

	return (
		<Badge
			variant="outline"
			className="h-[22px] gap-1 rounded-lg border-[#e5e5e5] px-2 font-medium text-[#737373] bg-white"
		>
			<XCircle className="h-3 w-3 text-[#ef4444]" />
			Deactivated
		</Badge>
	);
}
