import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { useState } from "react";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import { DataTableFilter } from "@/components/custom/data-table-filter";
import { DataTablePage } from "@/components/custom/data-table-page";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCampusesFn, getDepartmentsFn } from "@/features/auth";
import type { AuthUser } from "@/lib/auth";
import type { DirectorDashboardState } from "@/lib/director-dashboard-state";
import { formatAcademicRank, toStableDate } from "@/lib/utils";
import type { ProjectHubParams } from "@/types/project";
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
	scope?: Pick<ProjectHubParams, "year" | "campusId" | "departmentId" | "kind">;
	dashboardContext?: DirectorDashboardState;
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
	scope = {},
	dashboardContext,
}: ProjectHubPageProps) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const { data, isLoading } = useQuery(
		projectHubQueryOptions({ page, limit, search, college, status, ...scope }),
	);
	const { data: departments = [] } = useQuery({
		queryKey: ["departments"],
		queryFn: () => getDepartmentsFn(),
		staleTime: 60 * 60 * 1000,
	});
	const { data: campuses = [] } = useQuery({
		queryKey: ["campuses"],
		queryFn: () => getCampusesFn(),
		staleTime: 60 * 60 * 1000,
	});
	const selectedDepartment =
		scope.departmentId === 0
			? "Unassigned"
			: departments.find((department) => department.id === scope.departmentId)
					?.name;

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
						search={{ dashboard: dashboardContext }}
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
			id: "implementingUnit",
			accessorFn: (row) => row.departmentCode ?? row.college ?? "",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Implementing Unit" />
			),
			headerClassName: "w-[15%] font-medium text-muted-foreground",
			cellClassName: "text-foreground text-left",
			cell: ({ row }) => {
				const project = row.original;
				return (
					<div className="flex flex-col text-left">
						<span className="text-sm text-foreground">
							{project.departmentCode ?? project.college ?? "—"}
						</span>
						{project.campusName && (
							<span className="text-xs text-muted-foreground">
								{project.campusName}
							</span>
						)}
					</div>
				);
			},
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
				<div className="space-y-2">
					{dashboardContext && (
						<Link
							to="/dashboard"
							search={{ page: 1, pageSize: 10, ...dashboardContext }}
							className="text-sm text-primary underline"
						>
							Back to dashboard
						</Link>
					)}
					<h1 className="text-2xl font-semibold text-heading">Project Hub</h1>
				</div>
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
						value={selectedDepartment || college || "all"}
						onValueChange={(val: string | null) =>
							onCollegeChange(val === "all" ? "" : (val ?? ""))
						}
						placeholder="All Implementing Units"
						options={[
							{ value: "all", label: "All Implementing Units" },
							...departments.map((department) => ({
								value: department.name,
								label: department.name,
							})),
							{ value: "Unassigned", label: "Unassigned" },
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
							...(scope.kind === "submitted"
								? []
								: [{ value: "Active", label: "Active (all active statuses)" }]),
							{ value: "Endorsed", label: "Endorsed" },
							{
								value: "Institutionally Approved",
								label: "Institutionally Approved",
							},
							{ value: "Rejected", label: "Rejected" },
							...(scope.kind === "submitted"
								? []
								: [{ value: "Overdue", label: "Overdue" }]),
							{ value: "Approved", label: "Approved" },
							{ value: "Pending Review", label: "For Review" },
							{ value: "Returned", label: "Needs Revision" },
							...(scope.kind === "submitted"
								? []
								: [
										{ value: "Ongoing", label: "Ongoing" },
										{
											value: "Pending Completion",
											label: "Pending Completion",
										},
										{ value: "Completed", label: "Completed" },
									]),
						]}
					/>
					{(scope.year || scope.campusId || scope.kind) && (
						<div className="flex flex-wrap items-center gap-2 text-xs">
							<Badge variant="secondary">
								{[
									scope.year,
									campuses.find((campus) => campus.id === scope.campusId)?.name,
									scope.kind === "submitted"
										? "Submitted proposals"
										: scope.kind === "projects"
											? "Projects only"
											: undefined,
								]
									.filter(Boolean)
									.join(" · ")}
							</Badge>
							<Link
								to="/projects"
								search={{ page: 1, limit: 10, dashboard: dashboardContext }}
								className="text-primary underline"
							>
								Clear dashboard scope
							</Link>
						</div>
					)}
				</>
			}
			activeFilters={{ search, college, status }}
			emptyMessage="No projects found."
			ariaLabel="Projects"
		/>
	);
}
