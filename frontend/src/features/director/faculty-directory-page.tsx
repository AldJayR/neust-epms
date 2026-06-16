import { useQuery } from "@tanstack/react-query";
import {
	Calendar,
	Download,
	EllipsisVertical,
	Filter,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MetricCard } from "@/components/custom/metric-card";
import { Button } from "@/components/ui/button";

import { SearchInput } from "@/components/ui/search-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AuthUser } from "@/lib/auth";
import { facultyDirectoryQueryOptions } from "@/lib/dashboard.functions";
import { formatAcademicRank } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";



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

	const columns: DataTableColumn[] = [
		{ key: "rank", label: "Rank", className: "w-[60px] px-4 py-2 text-center text-[14px] font-medium text-[#666]" },
		{ key: "name", label: "Faculty Name", className: "w-[300px] px-4 py-2 text-[14px] font-medium text-[#666]" },
		{ key: "college", label: "College", className: "w-[200px] px-4 py-2 text-[14px] font-medium text-[#666]" },
		{ key: "leadProjects", label: "Lead Projects", className: "w-[120px] px-4 py-2 text-right text-[14px] font-medium text-[#666]" },
		{ key: "collaboratorProjects", label: "Collaborator Projects", className: "w-[150px] px-4 py-2 text-right text-[14px] font-medium text-[#666]" },
		{ key: "totalInvolvement", label: "Total Involvement", className: "w-[150px] px-4 py-2 text-right text-[14px] font-medium text-[#666]" },
		{ key: "actions", label: "", className: "w-[50px]" },
	];

	return (
		<div className="flex flex-col gap-8">
				<div className="flex items-center justify-between">
					<h1 className="text-[24px] font-semibold leading-[35px] text-[#11215a]">
						Faculty Directory
					</h1>
					<div className="flex items-center gap-4">
						<div className="flex h-9 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 shadow-sm">
							<Calendar className="size-4 text-[#0a0a0a]" />
							<span className="text-sm font-medium text-[#0a0a0a]">
								A.Y. 2024-2025
							</span>
						</div>
						<Button className="flex items-center gap-1.5 rounded-[10px] bg-brand-primary px-4 py-2 text-[#fafafa] shadow-sm hover:bg-brand-primary-hover">
							<Download className="size-4" />
							<span className="text-[14px] font-medium">Export Report</span>
						</Button>
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
						<SelectTrigger className="h-9 w-[180px] rounded-lg border border-[#e5e5e5] bg-white shadow-sm text-[#737373]">
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

				<div className="overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
					<DataTable
						columns={columns}
						data={items}
						showHeader={showTableHeader}
						renderRow={(faculty, index) => (
							<TableRow
								key={faculty.userId}
								className="border-b border-[#ebebeb] py-2 hover:bg-[#fcfcfc]"
							>
								<TableCell className="px-4 py-3 text-center text-[14px] font-bold text-[#0a0a0a]">
									{(page - 1) * limit + index + 1}
								</TableCell>
								<TableCell className="px-4 py-3">
									<div className="flex items-center gap-3">
										<Avatar className="size-9">
											<AvatarFallback className="bg-[#ddd] text-[#666]">
												{faculty.firstName[0]}
												{faculty.lastName[0]}
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col">
											<span className="text-[14px] font-normal text-[#0a0a0a]">
												{faculty.firstName} {faculty.lastName}
											</span>
											<span className="text-[12px] text-[#666]">
												{formatAcademicRank(faculty.academicRank)}
											</span>
										</div>
									</div>
								</TableCell>
								<TableCell className="px-4 py-3 text-[14px] text-[#0a0a0a]">
									{faculty.college}
								</TableCell>
								<TableCell className="px-4 py-3 text-right text-[14px] font-medium text-[#0a0a0a]">
									{faculty.leadProjects}
								</TableCell>
								<TableCell className="px-4 py-3 text-right text-[14px] font-medium text-[#0a0a0a]">
									{faculty.collaboratorProjects}
								</TableCell>
								<TableCell className="px-4 py-3 text-right text-[14px] font-medium text-[#0a0a0a]">
									{faculty.totalInvolvement}
								</TableCell>
								<TableCell className="px-4 py-3 text-right">
									<Button
										variant="ghost"
										size="icon"
										className="size-8 text-[#737373]"
										aria-label="More actions for faculty member"
									>
										<EllipsisVertical className="size-4" />
									</Button>
								</TableCell>
							</TableRow>
						)}
						isLoading={isLoading}
						isEmpty={items.length === 0}
						emptyMessage="No faculty records found."
						colSpan={7}
						ariaLabel="Faculty directory"
					/>
				</div>

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
