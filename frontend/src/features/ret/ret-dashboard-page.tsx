import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { EllipsisVertical, Plus } from "lucide-react";
import * as React from "react";
import { DataTableFilter } from "@/components/custom/data-table-filter";
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
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuthUser } from "@/lib/auth";
import {
	type ProposalItem,
	retDashboardStatsQueryOptions,
	retProposalsQueryOptions,
} from "@/lib/ret.functions";
import { formatAcademicRank } from "@/lib/utils";
import { PageHeader } from "@/components/custom/page-header";
import { CreateProposalModal } from "../proposals/components/create-proposal-modal";
import { StatusBadge } from "@/components/ui/status-badge";

interface RETDashboardPageProps {
	user: AuthUser;
	page: number;
	pageSize: number;
	search?: string;
	onSearch: (search: string | undefined) => void;
	onPageChange: (page: number) => void;
}

export function RETDashboardPage({
	user,
	page,
	pageSize,
	search,
	onSearch,
	onPageChange,
}: RETDashboardPageProps) {
	const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
	const [statusFilter, setStatusFilter] = React.useState<string>("all");
	const navigate = useNavigate();

	const { data: statsData, isLoading: isStatsLoading } = useQuery(
		retDashboardStatsQueryOptions(),
	);
	const { data: proposalsData, isLoading: isProposalsLoading } = useQuery(
		retProposalsQueryOptions({
			page,
			limit: pageSize,
			search,
			status: statusFilter,
		}),
	);

	const stats = [
		{
			label: "Pending Review",
			value: statsData?.pendingReview,
		},
		{
			label: "Approved Projects",
			value: statsData?.approvedProjects,
		},
		{
			label: "Denied Projects",
			value: statsData?.deniedProjects,
		},
	];

	const proposals = proposalsData?.items ?? [];
	const total = proposalsData?.total ?? 0;
	const isLoading = isProposalsLoading || isStatsLoading;

	const columns: DataTableColumnDef<ProposalItem>[] = [
		{
			id: "title",
			header: "Project Title",
			headerClassName: "w-[352px] font-medium text-muted-foreground px-4",
			cellClassName: "px-4 py-3 align-middle",
			cell: ({ row }) => {
				const proposal = row.original;
				return (
					<p className="text-sm font-medium text-foreground line-clamp-2 leading-5">
						{proposal.title}
					</p>
				);
			},
			skeleton: (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-4 w-3/4 rounded" />
					<Skeleton className="h-3 w-1/2 rounded" />
				</div>
			),
		},
		{
			id: "leader",
			header: "Project Leader",
			headerClassName: "w-[228px] font-medium text-muted-foreground px-4",
			cellClassName: "px-4 py-3 align-middle",
			cell: ({ row }) => {
				const proposal = row.original;
				return (
					<div className="flex items-center gap-2">
						<Avatar className="size-9 rounded-full">
							<AvatarImage src="" alt="Leader" />
							<AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
								{proposal.leaderFirstName?.charAt(0) ?? ""}
								{proposal.leaderLastName?.charAt(0) ?? ""}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col gap-[2px]">
							<span className="text-sm font-normal text-foreground leading-5">
								{proposal.leaderFirstName} {proposal.leaderLastName}
							</span>
							<span className="text-xs text-muted-foreground leading-[14px]">
								{formatAcademicRank(proposal.leaderAcademicRank ?? null)}
							</span>
						</div>
					</div>
				);
			},
			skeleton: (
				<div className="flex items-center gap-2">
					<Skeleton className="size-9 rounded-full" />
					<div className="flex flex-col gap-1.5 w-[140px]">
						<Skeleton className="h-3.5 w-3/4 rounded" />
						<Skeleton className="h-2.5 w-1/2 rounded" />
					</div>
				</div>
			),
		},
		{
			id: "dateSubmitted",
			header: "Date Submitted",
			headerClassName: "w-[134px] font-medium text-muted-foreground px-4",
			cellClassName: "px-4 py-3 align-middle text-sm text-foreground",
			cell: ({ row }) => {
				const proposal = row.original;
				return format(new Date(proposal.createdAt), "MMM dd, yyyy");
			},
			skeleton: <Skeleton className="h-4 w-20 rounded" />,
		},
		{
			id: "status",
			header: "Status",
			headerClassName: "w-[188px] font-medium text-muted-foreground px-4",
			cellClassName: "px-4 py-3 align-middle",
			cell: ({ row }) => {
				const proposal = row.original;
				return <StatusBadge status={proposal.status} variant="outline" />;
			},
			skeleton: <Skeleton className="h-6 w-24 rounded-full" />,
		},
		createActionsColumn({
			cell: ({ row }) => {
				const proposal = row.original;
				return (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									className="size-8 text-muted-foreground"
								/>
							}
							aria-label="Open proposal actions"
						>
							<EllipsisVertical className="size-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() =>
									navigate({
										to: "/projects/$projectId",
										params: { projectId: proposal.proposalId },
									})
								}
							>
								View Details
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() =>
									navigate({
										to: "/proposals/$proposalId",
										params: { proposalId: proposal.proposalId },
									})
								}
							>
								Review Proposal
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
			skeleton: <Skeleton className="size-8 rounded-md ml-auto" />,
		}),
	];

	return (
		<div className="flex flex-col gap-8">
			{/* Welcome Header */}
			<PageHeader
				title={
					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-semibold text-heading">
							Welcome, {user.firstName}!
						</h1>
						<p className="text-sm text-brand-primary">
							{user.departmentName ?? user.campusName}
						</p>
					</div>
				}
				actions={
					<BrandButton
						onClick={() => setIsCreateModalOpen(true)}
						className="h-9 gap-1.5 px-[10px] py-2 shadow-[0px_1px_2px_0px_var(--shadow-card)]"
					>
						<Plus className="size-4" />
						<span className="font-medium">Start New Project Proposal</span>
					</BrandButton>
				}
			/>

			{/* Stats Cards */}
			<div className="grid gap-6 md:grid-cols-3">
				{stats.map((stat) => (
					<MetricCard
						key={stat.label}
						label={stat.label}
						value={stat.value}
						isLoading={isStatsLoading}
					/>
				))}
			</div>

			{/* Filters */}
			<div className="flex items-center justify-between gap-4">
				<SearchInput
					value={search ?? ""}
					onChange={(val) => onSearch(val || undefined)}
					placeholder="Search by project proposals"
					ariaLabel="Search by project proposals"
					className="max-w-[352px]"
				/>
				<div className="flex items-center gap-2">
					<DataTableFilter
						value={statusFilter}
						onValueChange={(v) => {
							if (v) {
								setStatusFilter(v);
								onPageChange(1);
							}
						}}
						placeholder="All Statuses"
						options={[
							{ value: "all", label: "All Statuses" },
							{ value: "submitted", label: "Pending" },
							{ value: "endorsed", label: "For Endorsement" },
							{ value: "approved", label: "Approved" },
						]}
					/>
				</div>
			</div>

			{/* Proposals Table */}
			<PageCard className="min-h-[400px]">
			<DataTable
				columns={columns}
				data={proposals}
				activeFilters={{ search, statusFilter }}
				isLoading={isProposalsLoading}
				emptyMessage="No proposals found."
				ariaLabel="Proposals table"
			/>
			</PageCard>

			<PaginationBar
				page={page}
				totalPages={Math.ceil(total / pageSize)}
				onPageChange={onPageChange}
				total={total}
				limit={pageSize}
				isLoading={isLoading}
			/>

			<CreateProposalModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
				user={user}
			/>
		</div>
	);
}
