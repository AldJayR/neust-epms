import { useQuery } from "@tanstack/react-query";
import { Download, ListFilter } from "lucide-react";
import { useState } from "react";
import { MetricCard } from "@/components/custom/metric-card";
import { DataTablePage } from "@/components/custom/data-table-page";
import { Badge } from "@/components/ui/badge";
import { BrandButton } from "@/components/custom/brand-button";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	type ReportItem,
	reportsListQueryOptions,
	reportsQueryOptions,
} from "@/lib/dashboard.functions";
import { PageHeader } from "@/components/custom/page-header";

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
	const { data: listData, isLoading: listLoading } = useQuery(
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

	const columns: DataTableColumnDef<ReportItem>[] = [
		{
			id: "project",
			header: "Project",
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
			header: "Leader",
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-sm text-foreground",
			cell: ({ row }) => row.original.leader,
		},
		{
			id: "department",
			header: "Department",
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-sm text-foreground",
			cell: ({ row }) => row.original.department ?? "—",
		},
		{
			id: "reportType",
			header: () => <div className="text-center">Report Type</div>,
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
			header: () => <div className="text-center">Submitted</div>,
			headerClassName:
				"px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => formatDate(row.original.submitted),
		},
		createActionsColumn(),
	];

	return (
		<div className="flex flex-col gap-8">
			{/* Header Section */}
			<PageHeader
				title={<h1 className="text-2xl font-semibold text-heading">Reports</h1>}
				actions={
					<BrandButton className="gap-2">
						<Download className="size-4" />
						Export Reports
					</BrandButton>
				}
			/>

			{/* Metric Cards Grid */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<MetricCard label="Total Reports" value={totalReports} />
				<MetricCard label="Progress Reports" value={progressCount} />
				<MetricCard label="Terminal Reports" value={terminalCount} />
			</div>

			<DataTablePage
				columns={columns}
				data={filteredReports}
				total={totalReports}
				isLoading={isLoading}
				page={page}
				pageSize={limit}
				onPageChange={setPage}
				search={search}
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
								onValueChange={(val) => setTypeFilter(val as "All" | "Progress" | "Terminal")}
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
				activeFilters={{ search }}
				emptyMessage="No reports found."
				ariaLabel="Reports"
			/>
		</div>
	);
}
