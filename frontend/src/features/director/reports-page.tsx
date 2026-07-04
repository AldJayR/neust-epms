import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { Download, ListFilter, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { BrandButton } from "@/components/custom/brand-button";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import { PageHeader } from "@/components/custom/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthUser } from "@/lib/auth";
import {
	type ReportItem,
	reportsListQueryOptions,
} from "@/lib/dashboard.functions";
import { facultyProjectsQueryOptions } from "@/lib/faculty.functions";
import { SubmitReportModal } from "../reports/components/submit-report-modal";

const formatDate = (dateStr: string) => {
	try {
		return new Date(dateStr).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return dateStr;
	}
};

export function ReportsPage() {
	const user = useRouterState({
		select: (s) => {
			const authMatch = s.matches.find((m) => m.routeId === "/_authenticated");
			return (
				(authMatch?.context as { user: AuthUser | null } | undefined)?.user ??
				null
			);
		},
	});

	const isFaculty = user?.roleName === "Faculty";
	const userFullName = user ? `${user.firstName} ${user.lastName}` : "";

	const [activeTab, setActiveTab] = useState<"my" | "college">(
		isFaculty ? "my" : "college",
	);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [typeFilter, setTypeFilter] = useState<"All" | "Progress" | "Terminal">(
		"All",
	);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
	const limit = 10;

	const { data: listData, isLoading: listLoading } = useQuery(
		reportsListQueryOptions({
			page: 1,
			limit: 100,
			search: search || undefined,
		}),
	);

	const { data: projectsData, isLoading: projectsLoading } = useQuery({
		...facultyProjectsQueryOptions(),
		enabled: !!user,
	});

	const reports = listData?.items ?? [];
	const myProjectIds = useMemo(() => {
		return new Set(projectsData?.items?.map((p) => p.projectId) ?? []);
	}, [projectsData]);

	const tabFilteredReports = useMemo(() => {
		if (activeTab === "my") {
			return reports.filter((r) => {
				const isLeader = r.leader === userFullName;
				const isMember = myProjectIds.has(r.projectId);
				return isLeader || isMember;
			});
		}
		return reports;
	}, [reports, activeTab, userFullName, myProjectIds]);

	const filteredReports = useMemo(() => {
		return typeFilter === "All"
			? tabFilteredReports
			: tabFilteredReports.filter((r) => r.reportType === typeFilter);
	}, [tabFilteredReports, typeFilter]);

	const totalReports = tabFilteredReports.length;
	const progressCount = tabFilteredReports.filter(
		(r) => r.reportType === "Progress",
	).length;
	const terminalCount = tabFilteredReports.filter(
		(r) => r.reportType === "Terminal",
	).length;

	const isLoading = listLoading || (!!user && projectsLoading);

	const paginatedReports = useMemo(() => {
		const startIndex = (page - 1) * limit;
		return filteredReports.slice(startIndex, startIndex + limit);
	}, [filteredReports, page, limit]);

	const handleTabChange = (tab: "my" | "college") => {
		setActiveTab(tab);
		setPage(1);
	};

	const columns: DataTableColumnDef<ReportItem>[] = [
		{
			id: "project",
			accessorKey: "project",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Project" />
			),
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 font-bold text-foreground",
			cell: ({ row }) => (
				<div className="truncate max-w-[280px]" title={row.original.project}>
					{row.original.project}
				</div>
			),
		},
		{
			id: "leader",
			accessorKey: "leader",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Leader" />
			),
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-sm text-foreground",
			cell: ({ row }) => row.original.leader,
		},
		{
			id: "department",
			accessorKey: "department",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Department" />
			),
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-sm text-foreground",
			cell: ({ row }) => row.original.department ?? "—",
		},
		{
			id: "reportType",
			accessorKey: "reportType",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Report Type"
					className="justify-center"
				/>
			),
			headerClassName:
				"px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center",
			cell: ({ row }) => {
				const type = row.original.reportType;
				return (
					<Badge
						variant="outline"
						className={`rounded-md font-medium text-xs px-2 py-0.5 border ${
							type === "Terminal"
								? "bg-[#ffee9c] text-amber-700 border-[#e2a336]"
								: "bg-[#c4e8d1] text-[#218358] border-[#2b9a66]"
						}`}
					>
						{type}
					</Badge>
				);
			},
		},
		{
			id: "submitted",
			accessorKey: "submitted",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Submitted"
					className="justify-center"
				/>
			),
			headerClassName:
				"px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => formatDate(row.original.submitted),
		},
		createActionsColumn(),
	];

	const progressReportSequences = useMemo(() => {
		const progressByProject: Record<string, typeof reports> = {};
		for (const r of reports) {
			if (r.reportType === "Progress") {
				if (!progressByProject[r.projectId]) {
					progressByProject[r.projectId] = [];
				}
				progressByProject[r.projectId].push(r);
			}
		}

		const sequenceMap = new Map<string, number>();
		for (const projectId in progressByProject) {
			const projectReports = progressByProject[projectId];
			projectReports.sort(
				(a, b) =>
					new Date(a.submitted).getTime() - new Date(b.submitted).getTime(),
			);
			projectReports.forEach((r, idx) => {
				sequenceMap.set(r.reportId, idx + 1);
			});
		}

		return sequenceMap;
	}, [reports]);

	const facultyColumns: DataTableColumnDef<ReportItem>[] = [
		{
			id: "reportName",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Report" />
			),
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 font-medium text-foreground",
			cell: ({ row }) => {
				const item = row.original;
				if (item.reportType === "Progress") {
					const seq = progressReportSequences.get(item.reportId) ?? 1;
					return `Progress Report #${seq}`;
				}
				return "Terminal Report";
			},
		},
		{
			id: "project",
			accessorKey: "project",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Project" />
			),
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-sm text-foreground",
			cell: ({ row }) => (
				<div className="truncate max-w-[280px]" title={row.original.project}>
					{row.original.project}
				</div>
			),
		},
		{
			id: "reportType",
			accessorKey: "reportType",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Report Type"
					className="justify-center"
				/>
			),
			headerClassName:
				"px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center",
			cell: ({ row }) => {
				const type = row.original.reportType;
				return (
					<Badge
						variant="outline"
						className={`rounded-md font-medium text-xs px-2 py-0.5 border ${
							type === "Terminal"
								? "bg-[#ffee9c] text-amber-700 border-[#e2a336]"
								: "bg-[#c4e8d1] text-[#218358] border-[#2b9a66]"
						}`}
					>
						{type}
					</Badge>
				);
			},
		},
		{
			id: "submitted",
			accessorKey: "submitted",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Submitted"
					className="justify-center"
				/>
			),
			headerClassName:
				"px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => formatDate(row.original.submitted),
		},
		createActionsColumn(),
	];

	const columnsToUse = isFaculty ? facultyColumns : columns;

	return (
		<div className="flex flex-col gap-8">
			{/* Header Section */}
			<PageHeader
				title={<h1 className="text-2xl font-semibold text-heading">Reports</h1>}
				actions={
					<div className="flex items-center gap-3">
						{isFaculty && (
							<BrandButton
								className="gap-2"
								onClick={() => setIsSubmitModalOpen(true)}
							>
								<Plus className="size-4" />
								Submit Report
							</BrandButton>
						)}
						<Button
							variant="outline"
							className="border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg gap-2"
						>
							<Download className="size-4" />
							Export Reports
						</Button>
					</div>
				}
			/>

			{/* Metric Cards Grid */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<MetricCard label="Total Reports" value={totalReports} />
				<MetricCard label="Progress Reports" value={progressCount} />
				<MetricCard label="Terminal Reports" value={terminalCount} />
			</div>

			<DataTablePage
				columns={columnsToUse}
				data={paginatedReports}
				total={filteredReports.length}
				isLoading={isLoading}
				page={page}
				pageSize={limit}
				onPageChange={setPage}
				search={search}
				sorting={sorting}
				onSortingChange={setSorting}
				enableSorting
				onSearch={(val) => {
					setSearch(val);
					setPage(1);
				}}
				searchPlaceholder="Search reports"
				filters={
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="outline"
									className="h-9 w-9 p-0 border-border rounded-[8px] shadow-sm animate-fade-in"
									aria-label="Filter reports"
								>
									<ListFilter className="size-4" />
								</Button>
							}
						/>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuRadioGroup
								value={typeFilter}
								onValueChange={(val) =>
									setTypeFilter(val as "All" | "Progress" | "Terminal")
								}
							>
								<DropdownMenuRadioItem value="All">
									All Types
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="Progress">
									Progress Reports
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="Terminal">
									Terminal Reports
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				}
				cardHeader={
					isFaculty ? (
						<div className="border-b border-border bg-background p-2">
							<Tabs
								value={activeTab}
								onValueChange={(val) =>
									handleTabChange(val as "my" | "college")
								}
								className="w-fit"
							>
								<TabsList className="bg-muted">
									<TabsTrigger
										value="my"
										className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
									>
										My Reports
									</TabsTrigger>
									<TabsTrigger
										value="college"
										className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
									>
										College-wide Reports
									</TabsTrigger>
								</TabsList>
							</Tabs>
						</div>
					) : undefined
				}
				activeFilters={{ search }}
				emptyMessage="No reports found."
				ariaLabel="Reports"
			/>

			{isFaculty && (
				<SubmitReportModal
					open={isSubmitModalOpen}
					onOpenChange={setIsSubmitModalOpen}
				/>
			)}
		</div>
	);
}
