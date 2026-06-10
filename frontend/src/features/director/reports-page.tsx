import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Search,
	SlidersHorizontal,
	MoreVertical,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { AppShell } from "../layout/app-shell";
import { reportsQueryOptions } from "@/lib/dashboard.functions";

export function ReportsPage() {
	const [search, setSearch] = useState("");
	const { data, isLoading, error } = useQuery(reportsQueryOptions());

	const reports = data?.items ?? [];
	const totalReports = data?.total ?? 0;
	const progressCount = reports.filter(
		(r) => r.reportType === "Progress",
	).length;
	const terminalCount = reports.filter(
		(r) => r.reportType === "Terminal",
	).length;

	const showTableHeader = reports.length > 0 || search.trim().length > 0;

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
					<div className="flex h-[104px] flex-col gap-4 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
						<p className="text-[14px] leading-4 text-[#666]">Total Reports</p>
						<p className="text-[36px] font-semibold leading-9 text-[#11215a]">
							{totalReports}
						</p>
					</div>
					<div className="flex h-[104px] flex-col gap-4 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
						<p className="text-[14px] leading-4 text-[#666]">
							Progress Reports
						</p>
						<p className="text-[36px] font-semibold leading-9 text-[#11215a]">
							{progressCount}
						</p>
					</div>
					<div className="flex h-[104px] flex-col gap-4 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
						<p className="text-[14px] leading-4 text-[#666]">
							Terminal Reports
						</p>
						<p className="text-[36px] font-semibold leading-9 text-[#11215a]">
							{terminalCount}
						</p>
					</div>
				</div>

				{/* Search and Filters */}
				<div className="flex items-center justify-between">
					<div className="relative w-full max-w-[352px]">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							placeholder="Search reports"
							aria-label="Search reports"
							className="pl-9 h-9 border-[#e5e5e5] rounded-[8px]"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
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
					<Table aria-label="Reports">
						{showTableHeader && (
							<TableHeader>
								<TableRow className="border-b border-[#ebebeb] hover:bg-transparent">
									<TableHead className="px-4 py-2 text-[14px] font-medium text-[#666]">
										Project
									</TableHead>
									<TableHead className="px-4 py-2 text-[14px] font-medium text-[#666]">
										Leader
									</TableHead>
									<TableHead className="px-4 py-2 text-[14px] font-medium text-[#666]">
										Department
									</TableHead>
									<TableHead className="px-4 py-2 text-center text-[14px] font-medium text-[#666]">
										Report Type
									</TableHead>
									<TableHead className="px-4 py-2 text-center text-[14px] font-medium text-[#666]">
										Submitted
									</TableHead>
									<TableHead className="w-[50px]"></TableHead>
								</TableRow>
							</TableHeader>
						)}
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={6} className="h-24 text-center">
										<Loader2
											className="mx-auto size-6 animate-spin text-[#11215a]"
											role="status"
											aria-label="Loading reports"
										/>
									</TableCell>
								</TableRow>
							) : error ? (
								<TableRow>
									<TableCell
										colSpan={6}
										className="h-24 text-center text-muted-foreground"
									>
										Failed to load reports.
									</TableCell>
								</TableRow>
							) : reports.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={6}
										className="h-24 text-center text-muted-foreground"
									>
										No reports found.
									</TableCell>
								</TableRow>
							) : (
								reports.map((report) => (
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
								))
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination Controls */}
				<div className="flex items-center justify-between mt-2">
					<p className="text-xs text-[#666]">
						Showing <span className="font-bold">{reports.length}</span> of{" "}
						<span className="font-bold">{totalReports}</span> results
					</p>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							className="gap-1 font-medium text-sm"
						>
							<ChevronLeft className="size-4" />
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="h-9 w-9 p-0 border-[#e5e5e5] shadow-sm font-medium"
						>
							1
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="gap-1 font-medium text-sm"
						>
							Next
							<ChevronRight className="size-4" />
						</Button>
					</div>
				</div>
			</div>
		</AppShell>
	);
}
