import { useQuery } from "@tanstack/react-query";
import { ClientOnly, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { EllipsisVertical, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
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
	projectHubQueryOptions,
	type HubProject,
} from "@/lib/dashboard.functions";
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

	const columns: DataTableColumnDef<HubProject>[] = [
		{
			id: "title",
			header: "Project Title",
			headerClassName: "w-[30%] font-medium text-[#666]",
			cellClassName: "font-bold text-[#0a0a0a]",
			cell: ({ row }) => {
				const project = row.original;
				return (
					<Link
						to="/projects/$projectId"
						params={{ projectId: project.id }}
						className="truncate max-w-[280px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs inline-block text-left"
						title={project.title}
						onClick={(e) => {
							e.stopPropagation();
						}}
					>
						{project.title}
					</Link>
				);
			},
		},
		{
			id: "leader",
			header: "Project Leader",
			headerClassName: "w-[20%] font-medium text-[#666]",
			cell: ({ row }) => {
				const project = row.original;
				return (
					<div className="flex flex-col text-left">
						<span className="text-[14px] text-[#0a0a0a]">
							{project.leaderName}
						</span>
						<span className="text-[12px] text-[#666]">
							{project.leaderRank}
						</span>
					</div>
				);
			},
		},
		{
			id: "college",
			header: "College",
			headerClassName: "w-[15%] font-medium text-[#666]",
			cellClassName: "text-[#0a0a0a] text-left",
			cell: ({ row }) => row.original.college,
		},
		{
			id: "dateSubmitted",
			header: "Date Submitted",
			headerClassName: "w-[15%] font-medium text-[#666]",
			cellClassName: "text-[#0a0a0a] text-left",
			cell: ({ row }) => (
				<ClientOnly fallback="...">
					{format(new Date(row.original.dateSubmitted), "MMM dd, yyyy")}
				</ClientOnly>
			),
		},
		{
			id: "status",
			header: "Status",
			headerClassName: "w-[15%] font-medium text-[#666]",
			cellClassName: "text-left",
			cell: ({ row }) => <ProjectStatusBadge status={row.original.status} />,
		},
		{
			id: "actions",
			header: "",
			headerClassName: "w-[5%]",
			cellClassName: "text-right",
			cell: () => (
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					aria-label="More actions for project"
				>
					<EllipsisVertical className="size-4 text-[#737373]" />
				</Button>
			),
		},
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
					isLoading={isLoading}
					emptyMessage="No projects found."
					ariaLabel="Projects"
					onRowClick={(project) => onProjectClick?.(project.id)}
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
