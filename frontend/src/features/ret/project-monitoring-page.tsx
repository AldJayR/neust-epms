import { useQuery } from "@tanstack/react-query";
import { ClientOnly, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { EllipsisVertical, Filter } from "lucide-react";
import { MetricCard } from "@/components/custom/metric-card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AuthUser } from "@/lib/auth";
import {
	directorDashboardQueryOptions,
	type HubProject,
	projectHubQueryOptions,
} from "@/lib/dashboard.functions";

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
	const totalPages = Math.ceil(total / limit);
	const showTableHeader =
		items.length > 0 ||
		(search ?? "").trim().length > 0 ||
		(status ?? "").trim().length > 0;

	const columns: DataTableColumnDef<HubProject>[] = [
		{
			id: "title",
			header: "Project Name",
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
							{project.leaderRank}
						</span>
					</div>
				);
			},
		},
		{
			id: "lastReport",
			header: "Last Report",
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
			header: "Status",
			headerClassName: "w-[15%] font-medium text-muted-foreground",
			cellClassName: "text-left",
			cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
					<EllipsisVertical className="size-4 text-muted-foreground" />
				</Button>
			),
		},
	];

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-xl font-semibold leading-[35px] text-heading">
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
						value={status || "all"}
						onValueChange={(val: string | null) =>
							onStatusChange(val === "all" ? "" : (val ?? ""))
						}
					>
						<SelectTrigger className="h-9 w-full rounded-lg border-border bg-background shadow-sm sm:w-[180px]">
							<div className="flex items-center gap-2">
								<Filter className="size-4 text-muted-foreground" />
								<SelectValue placeholder="All Statuses" />
							</div>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="Approved">Approved</SelectItem>
							<SelectItem value="Ongoing">Ongoing</SelectItem>
							<SelectItem value="Pending Closure">Pending Closure</SelectItem>
							<SelectItem value="Overdue">Overdue</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="overflow-hidden rounded-[12px] border border-border bg-muted shadow-[0px_1px_3px_0px_var(--shadow-card)]">
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
								{user?.isMainCampus ? "Department Projects" : "Campus Projects"}
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

				<div className="bg-background">
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
