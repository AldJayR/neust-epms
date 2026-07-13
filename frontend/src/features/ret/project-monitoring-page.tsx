import { useQuery } from "@tanstack/react-query";
import { ClientOnly, Link } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { useState } from "react";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import { DataTableFilter } from "@/components/custom/data-table-filter";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthUser } from "@/lib/auth";
import { directorDashboardQueryOptions } from "@/features/dashboard";
import {
	type HubProject,
	projectHubQueryOptions,
} from "@/features/projects";
import { formatAcademicRank } from "@/lib/utils";

interface ProjectMonitoringPageProps {
	user?: AuthUser | null;
	page: number;
	limit: number;
	search?: string;
	status?: string;
	myProjectsOnly?: boolean;
	onPageChange: (page: number) => void;
	onSearchChange: (search: string) => void;
	onStatusChange: (status: string) => void;
	onMyProjectsOnlyChange: (myProjectsOnly: boolean) => void;
	onProjectClick?: (projectId: string) => void;
}

export function ProjectMonitoringPage({
	user,
	page,
	limit,
	search,
	status,
	myProjectsOnly,
	onPageChange,
	onSearchChange,
	onStatusChange,
	onMyProjectsOnlyChange,
	onProjectClick,
}: ProjectMonitoringPageProps) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const { data, isLoading } = useQuery(
		projectHubQueryOptions({
			page,
			limit,
			search,
			status,
			myProjectsOnly: myProjectsOnly ? "true" : undefined,
		}),
	);
	const { data: statsData } = useQuery(directorDashboardQueryOptions());
	const metrics = statsData?.metrics;

	const items = data?.items ?? [];
	const total = data?.total ?? 0;

	const columns: DataTableColumnDef<HubProject>[] = [
		{
			id: "title",
			accessorKey: "title",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Project Name" />
			),
			headerClassName: "w-[35%] font-medium text-muted-foreground",
			cellClassName: "font-bold text-foreground",
			cell: ({ row }) => {
				const project = row.original;
				return (
					<Link
						to="/projects/$projectId"
						params={{ projectId: project.id }}
						className="truncate max-w-[320px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs inline-block text-left"
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
			headerClassName: "w-[25%] font-medium text-muted-foreground",
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
			id: "lastReport",
			accessorKey: "lastReportDate",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Last Report" />
			),
			headerClassName: "w-[20%] font-medium text-muted-foreground",
			cellClassName: "text-foreground text-left",
			cell: ({ row }) => (
				<ClientOnly fallback="...">
					{row.original.lastReportDate ? (
						format(new Date(row.original.lastReportDate), "MMM dd, yyyy")
					) : (
						<span className="text-muted-foreground/60">—</span>
					)}
				</ClientOnly>
			),
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
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-2xl font-semibold text-heading">
					Project Monitoring
				</h1>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
				<MetricCard
					label="Total Projects"
					value={metrics?.totalProjects ?? "..."}
				/>
				<MetricCard
					label="Ongoing Projects"
					value={metrics?.ongoingProjects ?? "..."}
				/>
				<MetricCard
					label="Overdue Reports"
					value={metrics?.overdueProjects ?? "..."}
				/>
				<MetricCard
					label="Pending Closure"
					value={metrics?.pendingClosureProjects ?? "..."}
				/>
			</div>

			<DataTablePage
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
					<DataTableFilter
						value={status || "all"}
						onValueChange={(val: string | null) =>
							onStatusChange(val === "all" ? "" : (val ?? ""))
						}
						placeholder="All Statuses"
						options={[
							{ value: "all", label: "All Statuses" },
							{ value: "Approved", label: "Approved" },
							{ value: "Ongoing", label: "Ongoing" },
							{ value: "Pending Closure", label: "Pending Closure" },
							{ value: "Overdue", label: "Overdue" },
						]}
					/>
				}
				activeFilters={{ search, status }}
				emptyMessage="No projects found."
				ariaLabel="Projects"
				onRowClick={(project) => onProjectClick?.(project.id)}
				cardHeader={
					<div className="border-b border-border bg-background p-2">
						<Tabs
							value={myProjectsOnly ? "my" : "all"}
							onValueChange={(val) => {
								onMyProjectsOnlyChange(val === "my");
							}}
							className="w-fit"
						>
							<TabsList className="bg-muted">
								<TabsTrigger
									value="all"
									className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
								>
									{user?.isMainCampus
										? "Department Projects"
										: "Campus Projects"}
								</TabsTrigger>
								<TabsTrigger
									value="my"
									className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
								>
									My Projects
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				}
			/>
		</div>
	);
}
