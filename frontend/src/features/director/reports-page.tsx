import { useQuery } from "@tanstack/react-query";
import {
	Download,
	MoreVertical,
	SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/custom/metric-card";
import { Button } from "@/components/ui/button";

import { SearchInput } from "@/components/ui/search-input";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TableCell, TableRow } from "@/components/ui/table";
import {
	reportsListQueryOptions,
	reportsQueryOptions,
} from "@/lib/dashboard.functions";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { AppShell } from "../layout/app-shell";

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
	const totalReports = stats?.total ?? 0;
	const progressCount = stats?.progress ?? 0;
	const terminalCount = stats?.terminal ?? 0;
	const isLoading = statsLoading || listLoading;
	const totalPages = Math.max(1, Math.ceil(totalReports / limit));

	const showTableHeader = reports.length > 0 || search.trim().length > 0;

	const columns: DataTableColumn[] = [
		{ key: "project", label: "Project", className: "px-4 py-2 text-[14px] font-medium text-[#666]" },
		{ key: "leader", label: "Leader", className: "px-4 py-2 text-[14px] font-medium text-[#666]" },
		{ key: "department", label: "Department", className: "px-4 py-2 text-[14px] font-medium text-[#666]" },
		{ key: "reportType", label: "Report Type", className: "px-4 py-2 text-center text-[14px] font-medium text-[#666]" },
		{ key: "submitted", label: "Submitted", className: "px-4 py-2 text-center text-[14px] font-medium text-[#666]" },
		{ key: "actions", label: "", className: "w-[50px]" },
	];

	return (
		<AppShell>
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
						onChange={(val) => setSearch(val)}
						placeholder="Search reports"
						ariaLabel="Search reports"
						className="max-w-[352px]"
					/>
					<Button
						variant="outline"
						className="h-9 w-9 p-0 border-[#e5e5e5] rounded-[8px] shadow-sm"
						aria-label="Filter reports"
					>
						<SlidersHorizontal className="size-4" />
					</Button>
				</div>

				{/* Data Table */}
				<div className="overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
					<DataTable
						columns={columns}
						data={reports}
						showHeader={showTableHeader}
						renderRow={(report) => (
							<TableRow
								key={report.reportId}
								className="border-b border-[#ebebeb] py-2 hover:bg-[#fcfcfc]"
							>
								<TableCell className="px-4 py-3 font-bold text-[#0a0a0a]">
									<div
										className="truncate max-w-[280px]"
										title={report.project}
									>
										{report.project}
									</div>
								</TableCell>
								<TableCell className="px-4 py-3 text-[14px] text-[#0a0a0a]">
									{report.leader}
								</TableCell>
								<TableCell className="px-4 py-3 text-[14px] text-[#0a0a0a]">
									{report.department ?? "—"}
								</TableCell>
								<TableCell className="px-4 py-3 text-center">
									<Badge
										variant="outline"
										className={`rounded-md font-medium text-[12px] px-2 py-0.5 border ${
											report.reportType === "Terminal"
												? "bg-[#ffee9c] text-[#ab6400] border-[#e2a336]"
												: "bg-[#c4e8d1] text-[#218358] border-[#2b9a66]"
										}`}
									>
										{report.reportType}
									</Badge>
								</TableCell>
								<TableCell className="px-4 py-3 text-center text-[14px] text-[#0a0a0a]">
									{formatDate(report.submitted)}
								</TableCell>
								<TableCell className="px-4 py-3 text-right">
									<Button
										variant="ghost"
										size="icon"
										className="size-8 text-[#737373]"
										aria-label="More actions for report"
									>
										<MoreVertical className="size-4" />
									</Button>
								</TableCell>
							</TableRow>
						)}
						isLoading={isLoading}
						error={error ? "Failed to load reports." : null}
						isEmpty={reports.length === 0}
						emptyMessage="No reports found."
						colSpan={6}
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
		</AppShell>
	);
}
