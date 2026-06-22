import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { EllipsisVertical, Filter, Plus } from "lucide-react";
import * as React from "react";
import { MetricCard } from "@/components/custom/metric-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchInput } from "@/components/ui/search-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AuthUser } from "@/lib/auth";
import {
	type ProposalItem,
	retDashboardStatsQueryOptions,
	retProposalsQueryOptions,
} from "@/lib/ret.functions";
import { formatAcademicRank } from "@/lib/utils";
import { CreateProposalModal } from "../proposals/components/create-proposal-modal";
import { ProposalStatusBadge } from "./components/proposal-status-badge";

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
			value: statsData?.pendingReview ?? "...",
		},
		{
			label: "Approved Projects",
			value: statsData?.approvedProjects ?? "...",
		},
		{
			label: "Denied Projects",
			value: statsData?.deniedProjects ?? "...",
		},
	];

	const proposals = proposalsData?.items ?? [];
	const total = proposalsData?.total ?? 0;
	const isLoading = isProposalsLoading || isStatsLoading;
	const showTableHeader =
		proposals.length > 0 || (search ?? "").trim().length > 0;

	const columns: DataTableColumnDef<ProposalItem>[] = [
		{
			id: "title",
			header: "Project Title",
			headerClassName: "w-[352px] font-medium text-[#666] px-4",
			cellClassName: "px-4 py-3 align-middle",
			cell: ({ row }) => {
				const proposal = row.original;
				return (
					<p className="text-sm font-medium text-[#0a0a0a] line-clamp-2 leading-5">
						{proposal.title}
					</p>
				);
			},
		},
		{
			id: "leader",
			header: "Project Leader",
			headerClassName: "w-[228px] font-medium text-[#666] px-4",
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
							<span className="text-sm font-normal text-[#0a0a0a] leading-5">
								{proposal.leaderFirstName} {proposal.leaderLastName}
							</span>
							<span className="text-xs text-[#666] leading-[14px]">
								{formatAcademicRank(proposal.leaderAcademicRank ?? null)}
							</span>
						</div>
					</div>
				);
			},
		},
		{
			id: "dateSubmitted",
			header: "Date Submitted",
			headerClassName: "w-[134px] font-medium text-[#666] px-4",
			cellClassName: "px-4 py-3 align-middle text-sm text-[#0a0a0a]",
			cell: ({ row }) => {
				const proposal = row.original;
				return format(new Date(proposal.createdAt), "MMM dd, yyyy");
			},
		},
		{
			id: "status",
			header: "Status",
			headerClassName: "w-[188px] font-medium text-[#666] px-4",
			cellClassName: "px-4 py-3 align-middle",
			cell: ({ row }) => {
				const proposal = row.original;
				return <ProposalStatusBadge status={proposal.status} />;
			},
		},
		{
			id: "actions",
			header: "",
			headerClassName: "w-[50px]",
			cellClassName: "px-4 py-3 align-middle",
			cell: ({ row }) => {
				const proposal = row.original;
				return (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									className="size-8 text-[#666]"
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
		},
	];

	return (
		<div className="flex flex-col gap-8">
			{/* Welcome Header */}
			<div className="flex items-start justify-between">
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-semibold text-[#11215a]">
						Welcome, {user.firstName}!
					</h1>
					<p className="text-sm text-[#14369c]">
						{user.departmentName ?? user.campusName}
					</p>
				</div>
				<Button
					onClick={() => setIsCreateModalOpen(true)}
					className="bg-[#1e3b8a] hover:bg-[#1e3b8a]/90 text-[#fafafa] rounded-[10px] h-9 gap-1.5 px-[10px] py-2 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]"
				>
					<Plus className="size-4" />
					<span className="font-medium">Start New Project Proposal</span>
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-6 md:grid-cols-3">
				{stats.map((stat) => (
					<MetricCard key={stat.label} label={stat.label} value={stat.value} />
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
					<Select
						value={statusFilter}
						onValueChange={(v) => {
							if (v) {
								setStatusFilter(v);
								onPageChange(1);
							}
						}}
					>
						<SelectTrigger className="h-9 w-[180px] rounded-lg border-[#e5e5e5] bg-white text-[#737373] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.1)]">
							<Filter className="mr-2 size-4 text-[#737373]" />
							<SelectValue placeholder="All Statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="submitted">Pending</SelectItem>
							<SelectItem value="endorsed">For Endorsement</SelectItem>
							<SelectItem value="approved">Approved</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Proposals Table */}
			<div className="rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden min-h-[400px]">
				<DataTable
					columns={columns}
					data={proposals}
					isLoading={isProposalsLoading}
					emptyMessage="No proposals found."
					ariaLabel="Proposals table"
					showHeader={showTableHeader}
				/>
			</div>

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
