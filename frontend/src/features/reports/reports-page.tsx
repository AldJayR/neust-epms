import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { Download, EllipsisVertical, ListFilter, Plus } from "lucide-react";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { BrandButton } from "@/components/custom/brand-button";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import { PageHeader } from "@/components/custom/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthUser } from "@/lib/auth";
import { reportsListQueryOptions } from "./functions";
import type { ReportItem } from "@/types/report";
import { facultyProjectsQueryOptions } from "@/lib/faculty.functions";
import { formatAcademicRank } from "@/lib/utils";
import { SubmitReportModal } from "./components/submit-report-modal";

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
	const isRET = user?.roleName === "RET Chair";
	const userFullName = user ? `${user.firstName} ${user.lastName}` : "";

	const [activeTab, setActiveTab] = useState<"my" | "college">(
		isFaculty || isRET ? "my" : "college",
	);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [typeFilter, setTypeFilter] = useState<"All" | "Progress" | "Terminal">(
		"All",
	);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
	const limit = 10;
	const deferredSearch = useDeferredValue(search);

	const { data: listData, isLoading: listLoading } = useQuery(
		reportsListQueryOptions({
			page: 1,
			limit: 100,
			search: deferredSearch || undefined,
		}),
	);

	const { data: projectsData, isLoading: projectsLoading } = useQuery({
		...facultyProjectsQueryOptions(),
		enabled: !!user,
	});

	const reports = listData?.items ?? [];
	const myProjectIds = new Set(
		projectsData?.items?.map((p) => p.projectId) ?? [],
	);

	const tabFilteredReports =
		activeTab === "my"
			? reports.filter((r) => {
					const isLeader = r.leader === userFullName;
					if (isRET) {
						return isLeader;
					}
					const isMember = myProjectIds.has(r.projectId);
					return isLeader || isMember;
				})
			: reports;

	const filteredReports =
		typeFilter === "All"
			? tabFilteredReports
			: tabFilteredReports.filter((r) => r.reportType === typeFilter);

	const totalReports = tabFilteredReports.length;
	const progressCount = tabFilteredReports.filter(
		(r) => r.reportType === "Progress",
	).length;
	const terminalCount = tabFilteredReports.filter(
		(r) => r.reportType === "Terminal",
	).length;

	const isLoading = listLoading || (!!user && projectsLoading);

	const startIndex = (page - 1) * limit;
	const paginatedReports = filteredReports.slice(
		startIndex,
		startIndex + limit,
	);

	const handleTabChange = (tab: "my" | "college") => {
		setActiveTab(tab);
		startTransition(() => setPage(1));
	};

	const columns = useMemo<DataTableColumnDef<ReportItem>[]>(() => {
		const baseColumns: DataTableColumnDef<ReportItem>[] = [
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
				cell: ({ row }) => {
					const item = row.original;
					if (isRET) {
						const initials = item.leader
							.split(" ")
							.map((n) => n[0])
							.join("")
							.slice(0, 2);
						return (
							<div className="flex items-center gap-3">
								<Avatar className="size-9">
									{item.avatarUrl && (
										<AvatarImage src={item.avatarUrl} alt={item.leader} />
									)}
									<AvatarFallback className="bg-muted text-muted-foreground">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className="flex flex-col">
									<span className="text-sm font-medium text-foreground">
										{item.leader}
									</span>
									<span className="text-xs text-muted-foreground">
										{formatAcademicRank(item.academicRank)}
									</span>
								</div>
							</div>
						);
					}
					return item.leader;
				},
			},
		];

		if (!isRET) {
			baseColumns.push({
				id: "department",
				accessorKey: "department",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Department" />
				),
				headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
				cellClassName: "px-4 py-3 text-sm text-foreground",
				cell: ({ row }) => row.original.department ?? "—",
			});
		}

		baseColumns.push(
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
						<div className="flex justify-center">
							<StatusBadge status={type} variant="outline" />
						</div>
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
			createActionsColumn({
				cell: ({ row }) => (
					<div className="flex justify-end pr-2">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button variant="ghost" size="icon" className="size-8" />
								}
								aria-label="Open report actions"
							>
								<EllipsisVertical className="size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-40">
								<DropdownMenuItem
									disabled={!row.original.storagePath}
									render={
										// biome-ignore lint/a11y/useAnchorContent: DropdownMenuItem provides the link content.
										<a
											href={row.original.storagePath ?? "#"}
											target="_blank"
											rel="noopener noreferrer"
											aria-label="View report"
										/>
									}
								>
									View Report
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				),
			}),
		);

		return baseColumns;
	}, [isRET]);

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

	const facultyColumns = useMemo<DataTableColumnDef<ReportItem>[]>(
		() => [
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
						<div className="flex justify-center">
							<StatusBadge status={type} variant="outline" />
						</div>
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
			createActionsColumn({
				cell: ({ row }) => (
					<div className="flex justify-end pr-2">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button variant="ghost" size="icon" className="size-8" />
								}
								aria-label="Open report actions"
							>
								<EllipsisVertical className="size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-40">
								<DropdownMenuItem
									disabled={!row.original.storagePath}
									render={
										// biome-ignore lint/a11y/useAnchorContent: DropdownMenuItem provides the link content.
										<a
											href={row.original.storagePath ?? "#"}
											target="_blank"
											rel="noopener noreferrer"
											aria-label="View report"
										/>
									}
								>
									View Report
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				),
			}),
		],
		[progressReportSequences],
	);

	const columnsToUse = isFaculty ? facultyColumns : columns;

	return (
		<div className="flex flex-col gap-8">
			{/* Header Section */}
			<PageHeader
				title={<h1 className="text-2xl font-semibold text-heading">Reports</h1>}
				actions={
					<div className="flex items-center gap-3">
						{(isFaculty || isRET) && (
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
					startTransition(() => setPage(1));
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
					isFaculty || isRET ? (
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

			{(isFaculty || isRET) && (
				<SubmitReportModal
					open={isSubmitModalOpen}
					onOpenChange={setIsSubmitModalOpen}
				/>
			)}
		</div>
	);
}
