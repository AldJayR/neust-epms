import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { useState } from "react";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import { DataTableFilter } from "@/components/custom/data-table-filter";
import { DataTablePage } from "@/components/custom/data-table-page";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AuthUser } from "@/lib/auth";
import { formatAcademicRank, toStableDate } from "@/lib/utils";
import { type HubProject, projectHubQueryOptions } from "./functions";

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
	const [sorting, setSorting] = useState<SortingState>([]);

	const { data, isLoading } = useQuery(
		projectHubQueryOptions({ page, limit, search, college, status }),
	);

	const items = data?.items ?? [];
	const total = data?.total ?? 0;

	const columns: DataTableColumnDef<HubProject>[] = [
		{
			id: "title",
			accessorKey: "title",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Project Title" />
			),
			headerClassName: "w-[30%] font-medium text-muted-foreground",
			cellClassName: "font-bold text-foreground",
			cell: ({ row }) => {
				const project = row.original;
				return (
					<Link
						to="/projects/$projectId"
						params={{ projectId: project.id }}
						className="!text-foreground truncate max-w-[280px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs inline-block text-left"
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
			headerClassName: "w-[20%] font-medium text-muted-foreground",
			cell: ({ row }) => {
				const project = row.original;
				return (
					<div className="flex flex-col text-left">
						<span className="text-sm text-foreground">
							{project.leaderName}
						</span>
						<span className="text-xs text-muted-foreground">
							{formatAcademicRank(project.leaderRank)}
						</span>
					</div>
				);
			},
		},
		{
			id: "college",
			accessorKey: "college",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="College" />
			),
			headerClassName: "w-[15%] font-medium text-muted-foreground",
			cellClassName: "text-foreground text-left",
			cell: ({ row }) => row.original.college,
		},
		{
			id: "dateSubmitted",
			accessorKey: "dateSubmitted",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Date Submitted" />
			),
			headerClassName: "w-[15%] font-medium text-muted-foreground",
			cellClassName: "text-foreground text-left",
			cell: ({ row }) =>
				format(toStableDate(row.original.dateSubmitted), "MMM dd, yyyy"),
		},
		{
			id: "status",
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			headerClassName: "w-[15%] font-medium text-muted-foreground",
			cellClassName: "text-left",
			cell: ({ row }) => <StatusBadge status={row.original.status} />,
		},
		createActionsColumn(),
	];

	return (
		<DataTablePage
			title={
				<h1 className="text-2xl font-semibold text-heading">Project Hub</h1>
			}
			columns={columns}
			data={items}
			total={total}
			isLoading={isLoading}
			page={page}
			pageSize={limit}
			onPageChange={onPageChange}
			search={search}
			onSearch={onSearchChange}
			searchPlaceholder="Search by project title or faculty name..."
			sorting={sorting}
			onSortingChange={setSorting}
			enableSorting
			filters={
				<>
					<DataTableFilter
						value={college || "all"}
						onValueChange={(val: string | null) =>
							onCollegeChange(val === "all" ? "" : (val ?? ""))
						}
						placeholder="All Colleges"
						options={[
							{ value: "all", label: "All Colleges" },
							{ value: "CICT", label: "CICT" },
							{ value: "COE", label: "Engineering" },
							{ value: "CAS", label: "Arts & Sciences" },
						]}
					/>
					<DataTableFilter
						value={status || "all"}
						onValueChange={(val: string | null) =>
							onStatusChange(val === "all" ? "" : (val ?? ""))
						}
						placeholder="All Statuses"
						options={[
							{ value: "all", label: "All Statuses" },
							{ value: "Approved", label: "Approved" },
							{ value: "Pending Review", label: "For Review" },
							{ value: "Returned", label: "Needs Revision" },
							{ value: "Ongoing", label: "Ongoing" },
							{ value: "Completed", label: "Completed" },
						]}
					/>
				</>
			}
			activeFilters={{ search, college, status }}
			emptyMessage="No projects found."
			ariaLabel="Projects"
		/>
	);
}
