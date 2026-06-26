import { useQuery } from "@tanstack/react-query";
import { Download, ListFilter, MoreVertical } from "lucide-react";
import { useState } from "react";
import { MetricCard } from "@/components/custom/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchInput } from "@/components/ui/search-input";
import {
	type ReportItem,
	reportsListQueryOptions,
	reportsQueryOptions,
} from "@/lib/dashboard.functions";

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
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [typeFilter, setTypeFilter] = useState<"All" | "Progress" | "Terminal">(
		"All",
	);
	const limit = 20;

	const { data: stats, isLoading: statsLoading } = useQuery(
		reportsQueryOptions(),
	);
	const {
		data: listData,
		isLoading: listLoading,
		error,
	} = useQuery(
		reportsListQueryOptions({ page, limit, search: search || undefined }),
	);

	const reports = listData?.items ?? [];
	const filteredReports =
		typeFilter === "All"
			? reports
			: reports.filter((r) => r.reportType === typeFilter);
	const totalReports = stats?.total ?? 0;
	const progressCount = stats?.progress ?? 0;
	const terminalCount = stats?.terminal ?? 0;
	const isLoading = statsLoading || listLoading;
	const totalPages = Math.max(1, Math.ceil(totalReports / limit));

	const showTableHeader =
		filteredReports.length > 0 || search.trim().length > 0;

	const columns: DataTableColumnDef<ReportItem>[] = [
		{
			id: "project",
			header: "Project",
			headerClassName: "px-4 py-2 text-[14px] font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 font-bold text-foreground",
			cell: ({ row }) => (
				<div className="truncate max-w-[280px]" title={row.original.project}>
					{row.original.project}
				</div>
			),
		},
		{
			id: "leader",
			header: "Leader",
			headerClassName: "px-4 py-2 text-[14px] font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-[14px] text-foreground",
			cell: ({ row }) => row.original.leader,
		},
		{
			id: "department",
			header: "Department",
			headerClassName: "px-4 py-2 text-[14px] font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-[14px] text-foreground",
			cell: ({ row }) => row.original.department ?? "—",
		},
		{
			id: "reportType",
			header: () => <div className="text-center">Report Type</div>,
			headerClassName:
				"px-4 py-2 text-center text-[14px] font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center",
			cell: ({ row }) => {
				const type = row.original.reportType;
				return (
					<Badge
						variant="outline"
						className={`rounded-md font-medium text-[12px] px-2 py-0.5 border ${
							type === "Terminal"
								? "bg-[#ffee9c] text-[#ab6400] border-[#e2a336]"
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
			header: () => <div className="text-center">Submitted</div>,
			headerClassName:
				"px-4 py-2 text-center text-[14px] font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-[14px] text-foreground",
			cell: ({ row }) => formatDate(row.original.submitted),
		},
		{
			id: "actions",
			header: "",
			headerClassName: "w-[50px]",
			cellClassName: "px-4 py-3 text-right",
			cell: () => (
				<Button
					variant="ghost"
					size="icon"
					className="size-8 text-muted-foreground"
					aria-label="More actions for report"
				>
					<MoreVertical className="size-4" />
				</Button>
			),
		},
	];

	return (
		<div className="flex flex-col gap-8">
			{/* Header Section */}
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-[#11215a]">Reports</h1>
				<Button className="bg-[#1e3b8a] text-white hover:bg-[#1e3b8a]/90 rounded-[10px] gap-2">
					<Download className="size-4" />
					Export Reports
				</Button>
			</div>

			{/* Metric Cards Grid */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<MetricCard label="Total Reports" value={totalReports} />
				<MetricCard label="Progress Reports" value={progressCount} />
				<MetricCard label="Terminal Reports" value={terminalCount} />
			</div>

			{/* Search and Filters */}
			<div className="flex items-center justify-between">
				<SearchInput
					value={search}
					onChange={(val) => {
						setSearch(val);
						setPage(1);
					}}
					placeholder="Search reports"
					ariaLabel="Search reports"
					className="max-w-[352px]"
				/>
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
							onValueChange={(val) => setTypeFilter(val as any)}
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
			</div>

			{/* Data Table */}
			<div className="overflow-hidden rounded-[12px] border border-border bg-background shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
				<DataTable
					columns={columns}
					data={filteredReports}
					showHeader={showTableHeader}
					isLoading={isLoading}
					error={error ? "Failed to load reports." : null}
					emptyMessage="No reports found."
					ariaLabel="Reports"
				/>
			</div>

			<PaginationBar
				page={page}
				totalPages={totalPages}
				onPageChange={setPage}
				total={totalReports}
				limit={limit}
				isLoading={isLoading}
			/>
		</div>
	);
}
