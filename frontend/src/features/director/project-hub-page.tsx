import {
	ChevronLeft,
	ChevronRight,
	EllipsisVertical,
	Search,
	Loader2,
	CheckCircle2,
	RotateCcw,
	Filter,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";

import { projectHubQueryOptions } from "@/lib/director.functions";
import type { AuthUser } from "@/lib/auth";
import { AppShell } from "../layout/app-shell";

function ProjectStatusBadge({ status }: { status: string }) {
	if (status === "Approved") {
		return (
			<Badge variant="secondary" className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373]">
				<CheckCircle2 className="size-3 text-green-500" />
				Approved
			</Badge>
		);
	}
	if (status === "Submitted" || status === "Endorsed") {
		return (
			<Badge variant="secondary" className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373]">
				<Loader2 className="size-3 animate-spin" />
				For Review
			</Badge>
		);
	}
	if (status === "Returned") {
		return (
			<Badge variant="secondary" className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373]">
				<RotateCcw className="size-3 text-orange-500" />
				Needs Revision
			</Badge>
		);
	}

	return (
		<Badge variant="outline" className="text-[#737373]">
			{status}
		</Badge>
	);
}

interface ProjectHubPageProps {
	user?: AuthUser | null;
	page: number;
	limit: number;
	search?: string;
	college?: string;
	status?: string;
	onPageChange: (page: number) => void;
	onSearchChange: (search: string) => void;
	onCollegeChange: (college: string) => void;
	onStatusChange: (status: string) => void;
}

export function ProjectHubPage({
	user,
	page,
	limit,
	search,
	college,
	status,
	onPageChange,
	onSearchChange,
	onCollegeChange,
	onStatusChange,
}: ProjectHubPageProps) {
	const { data, isLoading } = useQuery(
		projectHubQueryOptions({ page, limit, search, college, status }),
	);

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return (
		<AppShell>
			<div className="flex flex-col gap-8">
				<div>
					<h1 className="text-[24px] font-semibold leading-[35px] text-[#11215a]">Project Hub</h1>
				</div>

				<div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
					<div className="relative w-full max-w-[352px]">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
						<Input
							placeholder="Search by project title or faculty name..."
							className="h-9 rounded-lg border-[#e5e5e5] bg-white pl-9 shadow-sm"
							value={search}
							onChange={(e) => onSearchChange(e.target.value)}
						/>
					</div>
					<div className="flex w-full items-center gap-4 sm:w-auto">
						<Select value={college || "all"} onValueChange={(val) => onCollegeChange(val === "all" ? "" : val)}>
							<SelectTrigger className="h-9 w-full rounded-lg border-[#e5e5e5] bg-white shadow-sm sm:w-[180px]">
								<div className="flex items-center gap-2">
									<Filter className="size-4 text-[#737373]" />
									<SelectValue placeholder="All Colleges" />
								</div>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Colleges</SelectItem>
								<SelectItem value="CICT">CICT</SelectItem>
								<SelectItem value="COE">Engineering</SelectItem>
								<SelectItem value="CAS">Arts & Sciences</SelectItem>
							</SelectContent>
						</Select>

						<Select value={status || "all"} onValueChange={(val) => onStatusChange(val === "all" ? "" : val)}>
							<SelectTrigger className="h-9 w-full rounded-lg border-[#e5e5e5] bg-white shadow-sm sm:w-[180px]">
								<div className="flex items-center gap-2">
									<Filter className="size-4 text-[#737373]" />
									<SelectValue placeholder="All Statuses" />
								</div>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="Approved">Approved</SelectItem>
								<SelectItem value="Submitted">For Review</SelectItem>
								<SelectItem value="Returned">Needs Revision</SelectItem>
								<SelectItem value="Ongoing">Ongoing</SelectItem>
								<SelectItem value="Completed">Completed</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="rounded-lg border border-[#ebebeb] bg-white shadow-sm overflow-hidden min-h-[400px]">
					<Table>
						<TableHeader>
							<TableRow className="border-[#ebebeb] hover:bg-transparent">
								<TableHead className="w-[30%] font-medium text-[#666]">Project Title</TableHead>
								<TableHead className="w-[20%] font-medium text-[#666]">Project Leader</TableHead>
								<TableHead className="w-[15%] font-medium text-[#666]">College</TableHead>
								<TableHead className="w-[15%] font-medium text-[#666]">Date Submitted</TableHead>
								<TableHead className="w-[15%] font-medium text-[#666]">Status</TableHead>
								<TableHead className="w-[5%]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={6} className="h-24 text-center">
										<Loader2 className="mx-auto size-6 animate-spin text-[#11215a]" />
									</TableCell>
								</TableRow>
							) : items.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
										No projects found.
									</TableCell>
								</TableRow>
							) : (
								items.map((project) => (
									<TableRow key={project.id} className="border-[#ebebeb] py-2 hover:bg-[#fcfcfc]">
										<TableCell className="font-bold text-[#0a0a0a]">
											<div className="truncate max-w-[280px]" title={project.title}>
												{project.title}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-col">
												<span className="text-[14px] text-[#0a0a0a]">{project.leaderName}</span>
												<span className="text-[12px] text-[#666]">{project.leaderRank}</span>
											</div>
										</TableCell>
										<TableCell className="text-[#0a0a0a]">{project.college}</TableCell>
										<TableCell className="text-[#0a0a0a]">
											{format(new Date(project.dateSubmitted), "MMM dd, yyyy")}
										</TableCell>
										<TableCell>
											<ProjectStatusBadge status={project.status} />
										</TableCell>
										<TableCell className="text-right">
											<Button variant="ghost" size="icon" className="size-8">
												<EllipsisVertical className="size-4 text-[#737373]" />
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				<div className="flex flex-col items-center justify-between gap-4 border-t border-transparent pt-4 sm:flex-row">
					<p className="text-xs text-[#666]">
						Showing <span className="font-bold">{Math.min((page - 1) * limit + 1, total)}</span> to{" "}
						<span className="font-bold">{Math.min(page * limit, total)}</span> of{" "}
						<span className="font-bold">{total}</span> results
					</p>

					{totalPages > 1 && (
						<Pagination className="w-auto mx-0">
							<PaginationContent className="gap-1">
								<PaginationItem>
									<Button
										variant="ghost"
										size="sm"
										className="gap-1 pl-2.5 text-[#0a0a0a] hover:bg-transparent"
										onClick={() => onPageChange(page - 1)}
										disabled={page <= 1}
									>
										<ChevronLeft className="size-4" />
										<span>Previous</span>
									</Button>
								</PaginationItem>
								
								{[...Array(totalPages)].map((_, i) => {
									const p = i + 1;
									if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
										return (
											<PaginationItem key={p}>
												<PaginationLink
													isActive={page === p}
													onClick={() => onPageChange(p)}
													className={
														page === p
															? "border-[#e5e5e5] bg-white text-[#0a0a0a] shadow-sm"
															: "border-transparent text-[#0a0a0a] hover:bg-transparent"
													}
												>
													{p}
												</PaginationLink>
											</PaginationItem>
										);
									}
									if (p === page - 2 || p === page + 2) {
										return (
											<PaginationItem key={p}>
												<PaginationEllipsis />
											</PaginationItem>
										);
									}
									return null;
								})}

								<PaginationItem>
									<Button
										variant="ghost"
										size="sm"
										className="gap-1 pr-2.5 text-[#0a0a0a] hover:bg-transparent"
										onClick={() => onPageChange(page + 1)}
										disabled={page >= totalPages}
									>
										<span>Next</span>
										<ChevronRight className="size-4" />
									</Button>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					)}
				</div>
			</div>
		</AppShell>
	);
}
