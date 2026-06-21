import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { format } from "date-fns";
import {
	EllipsisVertical,
	Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { SearchInput } from "@/components/ui/search-input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AuthUser } from "@/lib/auth";
import { projectHubQueryOptions } from "@/lib/dashboard.functions";
import { ProjectStatusBadge } from "./components/project-status-badge";



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
	onProjectClick?: (projectId: string) => void;
}

export function ProjectHubPage({
	page,
	limit,
	search,
	college,
	status,
	onPageChange,
	onSearchChange,
	onCollegeChange,
	onStatusChange,
	onProjectClick,
}: ProjectHubPageProps) {
	const { data, isLoading } = useQuery(
		projectHubQueryOptions({ page, limit, search, college, status }),
	);


	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / limit);
	const showTableHeader =
		items.length > 0 ||
		(search ?? "").trim().length > 0 ||
		(college ?? "").trim().length > 0 ||
		(status ?? "").trim().length > 0;

	const columns: DataTableColumn[] = [
		{ key: "title", label: "Project Title", className: "w-[30%] font-medium text-[#666]" },
		{ key: "leader", label: "Project Leader", className: "w-[20%] font-medium text-[#666]" },
		{ key: "college", label: "College", className: "w-[15%] font-medium text-[#666]" },
		{ key: "dateSubmitted", label: "Date Submitted", className: "w-[15%] font-medium text-[#666]" },
		{ key: "status", label: "Status", className: "w-[15%] font-medium text-[#666]" },
		{ key: "actions", label: "", className: "w-[5%]" },
	];

	return (
		<div className="flex flex-col gap-8">
				<div>
					<h1 className="text-[24px] font-semibold leading-[35px] text-[#11215a]">
						Project Hub
					</h1>
				</div>

				<div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
					<SearchInput
						value={search ?? ""}
						onChange={onSearchChange}
						placeholder="Search by project title or faculty name..."
						ariaLabel="Search projects"
						className="max-w-[352px]"
					/>
					<div className="flex w-full items-center gap-4 sm:w-auto">
						<Select
							value={college || "all"}
							onValueChange={(val: string | null) =>
								onCollegeChange(val === "all" ? "" : (val ?? ""))
							}
						>
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

						<Select
							value={status || "all"}
							onValueChange={(val: string | null) =>
								onStatusChange(val === "all" ? "" : (val ?? ""))
							}
						>
							<SelectTrigger className="h-9 w-full rounded-lg border-[#e5e5e5] bg-white shadow-sm sm:w-[180px]">
								<div className="flex items-center gap-2">
									<Filter className="size-4 text-[#737373]" />
									<SelectValue placeholder="All Statuses" />
								</div>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="Approved">Approved</SelectItem>
								<SelectItem value="Pending Review">For Review</SelectItem>
								<SelectItem value="Returned">Needs Revision</SelectItem>
								<SelectItem value="Ongoing">Ongoing</SelectItem>
								<SelectItem value="Completed">Completed</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="rounded-lg border border-[#ebebeb] bg-white shadow-sm overflow-hidden min-h-[400px]">
					<DataTable
						columns={columns}
						data={items}
						showHeader={showTableHeader}
						renderRow={(project) => (
							<TableRow
								key={project.id}
								className="cursor-pointer border-[#ebebeb] py-2 hover:bg-[#fcfcfc]"
								onClick={() => onProjectClick?.(project.id)}
							>
								<TableCell className="font-bold text-[#0a0a0a]">
									<div
										className="truncate max-w-[280px]"
										title={project.title}
									>
										{project.title}
									</div>
								</TableCell>
								<TableCell>
									<div className="flex flex-col">
										<span className="text-[14px] text-[#0a0a0a]">
											{project.leaderName}
										</span>
										<span className="text-[12px] text-[#666]">
											{project.leaderRank}
										</span>
									</div>
								</TableCell>
								<TableCell className="text-[#0a0a0a]">
									{project.college}
								</TableCell>
								<TableCell className="text-[#0a0a0a]">
									<ClientOnly fallback="...">
										{format(
											new Date(project.dateSubmitted),
											"MMM dd, yyyy",
										)}
									</ClientOnly>
								</TableCell>
								<TableCell>
									<ProjectStatusBadge status={project.status} />
								</TableCell>
								<TableCell className="text-right">
									<Button
										variant="ghost"
										size="icon"
										className="size-8"
										aria-label="More actions for project"
									>
										<EllipsisVertical className="size-4 text-[#737373]" />
									</Button>
								</TableCell>
							</TableRow>
						)}
						isLoading={isLoading}
						isEmpty={items.length === 0}
						emptyMessage="No projects found."
						colSpan={6}
						ariaLabel="Projects"
					/>
				</div>

				<PaginationBar
					page={page}
					totalPages={totalPages}
					onPageChange={onPageChange}
					total={total}
					limit={limit}
					isLoading={isLoading}
				/>
			</div>
	);
}
