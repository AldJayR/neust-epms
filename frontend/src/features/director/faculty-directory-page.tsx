import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { Calendar, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/custom/metric-card";
import { PageCard } from "@/components/custom/page-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandButton } from "@/components/custom/brand-button";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchInput } from "@/components/ui/search-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AuthUser } from "@/lib/auth";
import {
	emailReportFn,
	type FacultyInvolvement,
	facultyDirectoryQueryOptions,
} from "@/lib/dashboard.functions";
import { formatAcademicRank } from "@/lib/utils";

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
								body { font-family: sans-serif; padding: 30px; color: #333; line-height: 1.4; }
								h1 { color: #11215a; margin-bottom: 2px; font-size: 24px; }
								p { color: #666; margin-bottom: 24px; font-size: 14px; }
								table { width: 100%; border-collapse: collapse; margin-top: 10px; }
								th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; font-size: 12px; }
								th { background-color: #f4f7fc; color: #11215a; font-weight: bold; }
								tr:nth-child(even) { background-color: #f9f9f9; }
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
		mostActiveCollege: { name: "...", contributors: 0 },
	};
	const totalPages = Math.ceil(total / limit);
	const showTableHeader =
		items.length > 0 ||
		(search ?? "").trim().length > 0 ||
		(college ?? "").trim().length > 0;

	const columns: DataTableColumnDef<FacultyInvolvement>[] = [
		{
			id: "rank",
			header: () => <div className="text-center">Rank</div>,
			headerClassName:
				"w-[60px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-center text-sm font-bold text-foreground",
			cell: ({ row }) => (page - 1) * limit + row.index + 1,
		},
		{
			id: "name",
			header: "Faculty Name",
			headerClassName:
				"w-[300px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3",
			cell: ({ row }) => {
				const faculty = row.original;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="size-9">
							<AvatarFallback className="bg-[#ddd] text-muted-foreground">
								{faculty.firstName?.charAt(0) ?? ""}
								{faculty.lastName?.charAt(0) ?? ""}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col text-left">
							<span className="text-sm font-normal text-foreground">
								{faculty.firstName} {faculty.lastName}
							</span>
							<span className="text-xs text-muted-foreground">
								{formatAcademicRank(faculty.academicRank)}
							</span>
						</div>
					</div>
				);
			},
		},
		{
			id: "college",
			header: "Department",
			headerClassName:
				"w-[200px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-sm",
			cell: ({ row }) => {
				const faculty = row.original;
				return (
					<div className="flex flex-col text-left">
						<span className="font-normal text-foreground">
							{faculty.departmentCode ?? faculty.college}
						</span>
						{faculty.isMainCampus === false && faculty.campusName && (
							<span className="text-xs text-muted-foreground leading-4 mt-0.5">
								{faculty.campusName}
							</span>
						)}
					</div>
				);
			},
		},
		{
			id: "leadProjects",
			header: () => <div className="text-right">Lead Projects</div>,
			headerClassName:
				"w-[120px] px-4 py-2 text-right text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-right text-sm font-medium text-foreground",
			cell: ({ row }) => row.original.leadProjects,
		},
		{
			id: "collaboratorProjects",
			header: () => <div className="text-right">Collaborator Projects</div>,
			headerClassName:
				"w-[150px] px-4 py-2 text-right text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-right text-sm font-medium text-foreground",
			cell: ({ row }) => row.original.collaboratorProjects,
		},
		{
			id: "totalInvolvement",
			header: () => <div className="text-right">Total Involvement</div>,
			headerClassName:
				"w-[150px] px-4 py-2 text-right text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-right text-sm font-medium text-foreground",
			cell: ({ row }) => row.original.totalInvolvement,
		},
		createActionsColumn(),
	];

	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold leading-[35px] text-heading">
					Faculty Directory
				</h1>
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
			</div>

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
					className="flex-1"
				/>
			</div>

			<div className="flex items-center justify-between">
				<SearchInput
					value={search ?? ""}
					onChange={onSearchChange}
					placeholder="Search by project title or faculty name..."
					ariaLabel="Search faculty directory"
					className="max-w-[352px]"
				/>
				<Select
					value={college || "all"}
					onValueChange={(val) =>
						onCollegeChange(val === "all" ? "" : val || "")
					}
				>
					<SelectTrigger className="h-9 w-[180px] rounded-lg border border-border bg-background shadow-sm text-muted-foreground">
						<div className="flex items-center gap-2">
							<Filter className="size-4" />
							<SelectValue placeholder="All Colleges" />
						</div>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Colleges</SelectItem>
						<SelectItem value="CICT">CICT</SelectItem>
						<SelectItem value="COE">Engineering</SelectItem>
						<SelectItem value="CAS">Arts & Sciences</SelectItem>
						<SelectItem value="COA">Agriculture</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<PageCard>
				<DataTable
					columns={columns}
					data={items}
					showHeader={showTableHeader}
					isLoading={isLoading}
					emptyMessage="No faculty records found."
					ariaLabel="Faculty directory"
				/>
			</PageCard>

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
