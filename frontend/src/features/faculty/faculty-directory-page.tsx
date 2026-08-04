import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
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
import { getDepartmentsFn } from "@/features/auth";
import type { AuthUser } from "@/lib/auth";
import { getFacultyDirectoryColumns } from "./components/director-directory-columns";
import { FacultyInvolvementTrendChart } from "./components/faculty-involvement-trend";
import { useFacultyDirectoryExport } from "./faculty-directory-export";
import { facultyDirectoryQueryOptions } from "./functions";

interface FacultyDirectoryPageProps {
	user?: AuthUser | null;
	page: number;
	limit: number;
	search?: string;
	college?: string;
	departmentId?: number;
	load: "all" | "none" | "active";
	sort: "load-desc" | "load-asc" | "name";
	trendMonths: 6 | 12 | 24;
	onPageChange: (page: number) => void;
	onSearchChange: (search: string) => void;
	onDepartmentChange: (departmentId: number | undefined) => void;
	onLoadChange: (load: "all" | "none" | "active") => void;
	onSortChange: (sort: "load-desc" | "load-asc" | "name") => void;
	onTrendMonthsChange: (months: 6 | 12 | 24) => void;
}

export function FacultyDirectoryPage({
	page,
	limit,
	search,
	college,
	departmentId,
	load,
	sort,
	trendMonths,
	onPageChange,
	onSearchChange,
	onDepartmentChange,
	onLoadChange,
	onSortChange,
	onTrendMonthsChange,
}: FacultyDirectoryPageProps) {
	const { data, isLoading } = useQuery(
		facultyDirectoryQueryOptions({
			page,
			limit,
			search,
			college,
			departmentId,
			load,
			sort,
			trendMonths,
		}),
	);
	const { data: departments = [] } = useQuery({
		queryKey: ["departments"],
		queryFn: () => getDepartmentsFn(),
		staleTime: 1000 * 60 * 60,
	});

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const metrics = data?.metrics ?? {
		totalActiveExtension: 0,
		averageProjectsPerFaculty: 0,
		mostActiveCollege: { name: "", contributors: 0, contributorAvatars: [] },
		facultyWithNoActiveProjects: 0,
		facultyWithActiveProjects: 0,
		averageActiveProjectsPerFaculty: 0,
		highestCurrentLoad: 0,
	};
	const handleExport = useFacultyDirectoryExport({
		items,
		search,
		college,
		departmentId,
	});

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

			<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
				<MetricCard
					label="Faculty with No Active Projects"
					value={metrics.facultyWithNoActiveProjects.toLocaleString()}
					className="flex-1"
				/>
				<MetricCard
					label="Faculty with Active Projects"
					value={metrics.facultyWithActiveProjects.toLocaleString()}
					className="flex-1"
				/>
				<MetricCard
					label="Average Active Projects"
					value={metrics.averageActiveProjectsPerFaculty.toFixed(1)}
					className="flex-1"
				/>
				<MetricCard
					label="Highest Current Load"
					value={metrics.highestCurrentLoad.toLocaleString()}
					className="flex-1"
				/>
			</div>

			<FacultyInvolvementTrendChart
				data={data?.involvementTrend ?? []}
				months={trendMonths}
				onMonthsChange={onTrendMonthsChange}
			/>

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
				searchPlaceholder="Search faculty by name..."
				filters={
					<>
						<DataTableFilter
							value={departmentId ? String(departmentId) : "all"}
							onValueChange={(value) =>
								onDepartmentChange(value === "all" ? undefined : Number(value))
							}
							placeholder="All Departments"
							options={[
								{ value: "all", label: "All Departments" },
								...departments.map((department) => ({
									value: String(department.id),
									label: department.name,
								})),
							]}
						/>
						<DataTableFilter
							value={load}
							onValueChange={(value) =>
								onLoadChange(value as "all" | "none" | "active")
							}
							placeholder="All Workloads"
							options={[
								{ value: "all", label: "All Workloads" },
								{ value: "active", label: "Active Projects" },
								{ value: "none", label: "No Active Projects" },
							]}
						/>
						<DataTableFilter
							value={sort}
							onValueChange={(value) =>
								onSortChange(value as "load-desc" | "load-asc" | "name")
							}
							placeholder="Sort"
							options={[
								{ value: "load-desc", label: "Highest Load" },
								{ value: "load-asc", label: "Lowest Load" },
								{ value: "name", label: "Name" },
							]}
						/>
					</>
				}
				activeFilters={{
					search,
					departmentId,
					load: load === "all" ? undefined : load,
					sort: sort === "load-desc" ? undefined : sort,
				}}
				emptyMessage="No faculty records found."
				ariaLabel="Faculty directory"
			/>
		</div>
	);
}
