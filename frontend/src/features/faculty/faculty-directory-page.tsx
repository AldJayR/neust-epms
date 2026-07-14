import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { Calendar, Download } from "lucide-react";
import { useState } from "react";
import { BrandButton } from "@/components/custom/brand-button";
import { DataTableFilter } from "@/components/custom/data-table-filter";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import { PageHeader } from "@/components/custom/page-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/lib/auth";
import { facultyDirectoryQueryOptions } from "./functions";
import { getFacultyDirectoryColumns } from "./components/director-directory-columns";
import { useFacultyDirectoryExport } from "./faculty-directory-export";

interface FacultyDirectoryPageProps {
	user?: AuthUser | null;
	page: number;
	limit: number;
	search?: string;
	college?: string;
	onPageChange: (page: number) => void;
	onSearchChange: (search: string) => void;
	onCollegeChange: (college: string) => void;
}

export function FacultyDirectoryPage({
	page,
	limit,
	search,
	college,
	onPageChange,
	onSearchChange,
	onCollegeChange,
}: FacultyDirectoryPageProps) {
	const [sorting, setSorting] = useState<SortingState>([]);

	const { data, isLoading } = useQuery(
		facultyDirectoryQueryOptions({ page, limit, search, college }),
	);

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const metrics = data?.metrics ?? {
		totalActiveExtension: 0,
		averageProjectsPerFaculty: 0,
		mostActiveCollege: { name: "", contributors: 0, contributorAvatars: [] },
	};
	const handleExport = useFacultyDirectoryExport({ items, search, college });

	const columns = getFacultyDirectoryColumns(page, limit);

	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title={
					<h1 className="text-2xl font-semibold text-heading">
						Faculty Directory
					</h1>
				}
				actions={
					<div className="flex flex-wrap items-center justify-end gap-4">
						<div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 shadow-sm">
							<Calendar className="size-4 text-foreground" />
							<span className="text-sm font-medium text-foreground">
								A.Y. 2024-2025
							</span>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<BrandButton className="flex items-center gap-1.5 px-4 py-2 shadow-sm hover:bg-brand-primary-hover cursor-pointer">
										<Download className="size-4" />
										<span className="text-sm font-medium">Export Report</span>
									</BrandButton>
								}
							/>
							<DropdownMenuContent
								align="end"
								className="bg-background border border-border p-1 rounded-lg shadow-md min-w-[200px]"
							>
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={() => handleExport("pdf")}
								>
									Download PDF Report
								</DropdownMenuItem>
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={() => handleExport("excel")}
								>
									Download Excel Spreadsheet
								</DropdownMenuItem>
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={() => handleExport("email")}
								>
									Send to Email
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				}
			/>

			<div className="grid gap-6 md:grid-cols-3">
				<MetricCard
					label="Total Active Extension"
					value={metrics.totalActiveExtension.toLocaleString()}
					trend="+5.2%"
					className="flex-1"
				/>
				<MetricCard
					label="Average Projects per Faculty"
					value={metrics.averageProjectsPerFaculty}
					className="flex-1"
				/>
				<MetricCard
					label="Most Active College"
					college={metrics.mostActiveCollege.name}
					contributors={metrics.mostActiveCollege.contributors}
					contributorAvatars={metrics.mostActiveCollege.contributorAvatars}
					className="flex-1"
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
						value={college || "all"}
						onValueChange={(val) =>
							onCollegeChange(val === "all" ? "" : val || "")
						}
						placeholder="All Colleges"
						options={[
							{ value: "all", label: "All Colleges" },
							{ value: "CICT", label: "CICT" },
							{ value: "COE", label: "Engineering" },
							{ value: "CAS", label: "Arts & Sciences" },
							{ value: "COA", label: "Agriculture" },
						]}
					/>
				}
				activeFilters={{ search, college }}
				emptyMessage="No faculty records found."
				ariaLabel="Faculty directory"
			/>
		</div>
	);
}
