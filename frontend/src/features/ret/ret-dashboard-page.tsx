import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	CircleCheck,
	EllipsisVertical,
	Filter,
	Loader2,
	Plus,
	Search,
} from "lucide-react";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { AuthUser } from "@/lib/auth";
import {
	retDashboardStatsQueryOptions,
	retProposalsQueryOptions,
} from "@/lib/ret.functions";
import { formatAcademicRank } from "@/lib/utils";

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
	const [searchInput, setSearchInput] = React.useState(search ?? "");
	const [statusFilter, setStatusFilter] = React.useState<string>("all");

	const statsQuery = useQuery(retDashboardStatsQueryOptions());
	const proposalsQuery = useQuery(
		retProposalsQueryOptions({ page, limit: pageSize, search }),
	);

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSearch(searchInput || undefined);
	};

	const stats = [
		{
			label: "Pending Review",
			value: statsQuery.data?.pendingReview ?? "...",
		},
		{
			label: "Approved Projects",
			value: statsQuery.data?.approvedProjects ?? "...",
		},
		{
			label: "Denied Projects",
			value: statsQuery.data?.deniedProjects ?? "...",
		},
	];

	const proposals = proposalsQuery.data?.items ?? [];
	const total = proposalsQuery.data?.total ?? 0;
	const isLoading = proposalsQuery.isLoading || statsQuery.isLoading;
	const showTableHeader =
		proposals.length > 0 || (search ?? "").trim().length > 0;

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
				<Button className="bg-[#1e3b8a] hover:bg-[#1e3b8a]/90 text-[#fafafa] rounded-[10px] h-9 gap-1.5 px-[10px] py-2 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)]">
					<Plus className="size-4" />
					<span className="font-medium">Start New Project Proposal</span>
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-6 md:grid-cols-3">
				{stats.map((stat) => (
					<div
						key={stat.label}
						className="flex h-[104px] flex-col gap-4 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]"
					>
						<p className="text-[14px] leading-4 text-[#666]">{stat.label}</p>
						<p className="text-[36px] font-semibold leading-9 text-[#11215a]">
							{stat.value}
						</p>
					</div>
				))}
			</div>

			{/* Filters */}
			<div className="flex items-center justify-between gap-4">
				<form
					onSubmit={handleSearchSubmit}
					className="relative w-full max-w-[352px]"
				>
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search by project proposals"
						aria-label="Search by project proposals"
						className="h-9 rounded-lg border-[#e5e5e5] bg-white pl-9 shadow-none placeholder:text-[#737373] text-sm"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
					/>
				</form>
				<div className="flex items-center gap-2">
					<Select
						value={statusFilter}
						onValueChange={(v) => {
							if (v) setStatusFilter(v);
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
			<div className="rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden min-h-[400px] relative">
				{proposalsQuery.isFetching && (
					<div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				)}
				<Table>
					{showTableHeader && (
						<TableHeader className="bg-white border-b-[#ebebeb]">
							<TableRow className="hover:bg-transparent h-10">
								<TableHead className="w-[352px] font-medium text-[#666] px-4">
									Project Title
								</TableHead>
								<TableHead className="w-[228px] font-medium text-[#666] px-4">
									Project Leader
								</TableHead>
								<TableHead className="w-[134px] font-medium text-[#666] px-4">
									Date Submitted
								</TableHead>
								<TableHead className="w-[188px] font-medium text-[#666] px-4">
									Status
								</TableHead>
								<TableHead className="w-[50px]"></TableHead>
							</TableRow>
						</TableHeader>
					)}
					<TableBody>
						{proposals.map((proposal) => (
							<TableRow
								key={proposal.proposalId}
								className="border-b-[#ebebeb] hover:bg-[#fcfcfc] py-2"
							>
								<TableCell className="px-4 py-3 align-middle">
									<p className="text-sm font-medium text-[#0a0a0a] line-clamp-2 leading-5">
										{proposal.title}
									</p>
								</TableCell>
								<TableCell className="px-4 py-3 align-middle">
									<div className="flex items-center gap-2">
										<Avatar className="size-9 rounded-full">
											<AvatarImage src="" alt="Leader" />
											<AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
												{proposal.leaderFirstName?.[0]}
												{proposal.leaderLastName?.[0]}
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col gap-[2px]">
											<span className="text-sm font-normal text-[#0a0a0a] leading-5">
												{proposal.leaderFirstName} {proposal.leaderLastName}
											</span>
											<span className="text-xs text-[#666] leading-[14px]">
												{formatAcademicRank(
													proposal.leaderAcademicRank ?? null,
												)}
											</span>
										</div>
									</div>
								</TableCell>
								<TableCell className="px-4 py-3 align-middle text-sm text-[#0a0a0a]">
									{format(new Date(proposal.createdAt), "MMM dd, yyyy")}
								</TableCell>
								<TableCell className="px-4 py-3 align-middle">
									<ProposalStatusBadge status={proposal.status} />
								</TableCell>
								<TableCell className="px-4 py-3 align-middle">
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
											<DropdownMenuItem>View Details</DropdownMenuItem>
											<DropdownMenuItem>Review Proposal</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				{proposals.length === 0 && !isLoading && (
					<div className="flex min-h-[400px] items-center justify-center bg-white px-6">
						<p className="text-sm text-muted-foreground italic">
							No proposals found.
						</p>
					</div>
				)}
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<p className="text-xs text-[#666]">
					Showing <span className="font-bold">{proposals.length}</span> of{" "}
					<span className="font-bold">{total}</span> results
				</p>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-9 gap-1 px-3 font-medium text-sm text-[#0a0a0a]"
						onClick={() => onPageChange(Math.max(1, page - 1))}
						disabled={page <= 1 || isLoading}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="h-9 w-9 bg-white font-medium border-[#e5e5e5] text-sm text-[#0a0a0a] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.1)]"
					>
						{page}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-9 gap-1 px-3 font-medium text-sm text-[#0a0a0a]"
						onClick={() => onPageChange(page + 1)}
						disabled={
							!proposalsQuery.data || page * pageSize >= total || isLoading
						}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}

function ProposalStatusBadge({ status }: { status: string }) {
	let label = status;
	let icon = <CircleCheck className="size-3 text-[#737373]" />;

	if (status === "Submitted") {
		label = "Pending";
	} else if (status === "Endorsed") {
		label = "For Endorsement";
		icon = <CircleCheck className="size-3 text-[#10b981]" />;
	} else if (status === "Approved") {
		label = "Approved";
		icon = <CircleCheck className="size-3 text-[#10b981]" />;
	}

	return (
		<Badge
			variant="outline"
			className="h-[22px] gap-1 rounded-lg border-[#e5e5e5] px-1.5 py-0.5 font-medium text-xs text-[#737373] bg-white shadow-none"
		>
			{icon}
			{label}
		</Badge>
	);
}
