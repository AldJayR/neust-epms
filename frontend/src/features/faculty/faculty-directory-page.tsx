import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { Calendar, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { emailReportFn } from "@/features/reports/public";
import { formatAcademicRank } from "@/lib/utils";
import { getFacultyDirectoryColumns } from "./components/director-directory-columns";

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

	const sendEmailReport = useServerFn(emailReportFn);

	const handleExport = async (exportFormat: "pdf" | "excel" | "email") => {
		if (items.length === 0) {
			toast.error("No data available to export.");
			return;
		}

		if (exportFormat === "pdf") {
			toast.info("Generating PDF report...");
			const printWindow = window.open("", "_blank");
			if (printWindow) {
				const html = `
					<html>
						<head>
							<title>Faculty Directory Report</title>
							<style>
								body { font-family: sans-serif; padding: 30px; color: var(--foreground); line-height: 1.4; }
								h1 { color: var(--heading); margin-bottom: 2px; font-size: 24px; }
								p { color: var(--muted-foreground); margin-bottom: 24px; font-size: 14px; }
								table { width: 100%; border-collapse: collapse; margin-top: 10px; }
								th, td { border: 1px solid var(--border); padding: 10px 12px; text-align: left; font-size: 12px; }
								th { background-color: var(--muted); color: var(--heading); font-weight: bold; }
								tr:nth-child(even) { background-color: var(--muted); }
								.text-right { text-align: right; }
							</style>
						</head>
						<body>
							<h1>Faculty Directory Report</h1>
							<p>Academic Year 2024-2025 | Generated on ${format(new Date(), "MMMM dd, yyyy")}</p>
							<table>
								<thead>
									<tr>
										<th>Rank</th>
										<th>Faculty Name</th>
										<th>Academic Rank</th>
										<th>Department</th>
										<th class="text-right">Lead Projects</th>
										<th class="text-right">Collaborator Projects</th>
										<th class="text-right">Total Involvement</th>
									</tr>
								</thead>
								<tbody>
									${items
										.map(
											(faculty, index) => `
										<tr>
											<td>${index + 1}</td>
											<td>${faculty.firstName} ${faculty.lastName}</td>
											<td>${formatAcademicRank(faculty.academicRank)}</td>
											<td>${faculty.departmentCode ?? faculty.college ?? ""}</td>
											<td class="text-right">${faculty.leadProjects}</td>
											<td class="text-right">${faculty.collaboratorProjects}</td>
											<td class="text-right">${faculty.totalInvolvement}</td>
										</tr>
									`,
										)
										.join("")}
								</tbody>
							</table>
							<script>
								window.onload = function() {
									window.print();
									window.close();
								}
							</script>
						</body>
					</html>
				`;
				printWindow.document.write(html);
				printWindow.document.close();
				toast.success("PDF report generated.");
			} else {
				toast.error("Failed to open print window. Check popup blocker.");
			}
		} else if (exportFormat === "excel") {
			toast.info("Preparing Excel spreadsheet...");
			try {
				const headers = [
					"Rank",
					"Faculty Name",
					"Academic Rank",
					"Department",
					"Lead Projects",
					"Collaborator Projects",
					"Total Involvement",
				];
				const rows = items.map((faculty, index) => [
					index + 1,
					`"${faculty.firstName} ${faculty.lastName}"`,
					`"${formatAcademicRank(faculty.academicRank)}"`,
					`"${faculty.departmentCode ?? faculty.college ?? ""}"`,
					faculty.leadProjects,
					faculty.collaboratorProjects,
					faculty.totalInvolvement,
				]);

				const csvContent = [
					headers.join(","),
					...rows.map((e) => e.join(",")),
				].join("\n");
				const blob = new Blob([csvContent], {
					type: "text/csv;charset=utf-8;",
				});
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.setAttribute("href", url);
				link.setAttribute(
					"download",
					`Faculty_Directory_Report_${format(new Date(), "yyyy-MM-dd")}.csv`,
				);
				link.style.visibility = "hidden";
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				toast.success("Excel spreadsheet downloaded successfully.");
			} catch {
				toast.error("Failed to generate Excel spreadsheet.");
			}
		} else if (exportFormat === "email") {
			toast.info("Sending report to your email...");
			try {
				const response = await sendEmailReport({
					data: {
						search: search || undefined,
						college: college || undefined,
					},
				});
				if (response.success) {
					toast.success(response.message || "Email report sent successfully.");
				} else {
					toast.error(response.message || "Failed to send email report.");
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Failed to send email report.";
				toast.error(message);
			}
		}
	};

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const metrics = data?.metrics ?? {
		totalActiveExtension: 0,
		averageProjectsPerFaculty: 0,
		mostActiveCollege: { name: "", contributors: 0, contributorAvatars: [] },
	};

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
					<div className="flex items-center gap-4">
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

			<div className="flex items-center gap-6">
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
