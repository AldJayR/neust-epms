import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, EllipsisVertical, Filter } from "lucide-react";
import { MetricCard } from "@/components/custom/metric-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
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
				"w-[60px] px-4 py-2 text-center text-[14px] font-medium text-[#666]",
			cellClassName:
				"px-4 py-3 text-center text-[14px] font-bold text-[#0a0a0a]",
			cell: ({ row }) => (page - 1) * limit + row.index + 1,
		},
		{
			id: "name",
			header: "Faculty Name",
			headerClassName:
				"w-[300px] px-4 py-2 text-[14px] font-medium text-[#666]",
			cellClassName: "px-4 py-3",
			cell: ({ row }) => {
				const faculty = row.original;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="size-9">
							<AvatarFallback className="bg-[#ddd] text-[#666]">
								{faculty.firstName?.charAt(0) ?? ""}
								{faculty.lastName?.charAt(0) ?? ""}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col text-left">
							<span className="text-[14px] font-normal text-[#0a0a0a]">
								{faculty.firstName} {faculty.lastName}
							</span>
							<span className="text-[12px] text-[#666]">
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
				"w-[200px] px-4 py-2 text-[14px] font-medium text-[#666]",
			cellClassName: "px-4 py-3 text-[14px]",
			cell: ({ row }) => {
				const faculty = row.original;
				return (
					<div className="flex flex-col text-left">
						<span className="font-normal text-[#0a0a0a]">
							{faculty.departmentCode ?? faculty.college}
						</span>
						{faculty.isMainCampus === false && faculty.campusName && (
							<span className="text-[12px] text-muted-foreground leading-4 mt-0.5">
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
				"w-[120px] px-4 py-2 text-right text-[14px] font-medium text-[#666]",
			cellClassName:
				"px-4 py-3 text-right text-[14px] font-medium text-[#0a0a0a]",
			cell: ({ row }) => row.original.leadProjects,
		},
		{
			id: "collaboratorProjects",
			header: () => <div className="text-right">Collaborator Projects</div>,
			headerClassName:
				"w-[150px] px-4 py-2 text-right text-[14px] font-medium text-[#666]",
			cellClassName:
				"px-4 py-3 text-right text-[14px] font-medium text-[#0a0a0a]",
			cell: ({ row }) => row.original.collaboratorProjects,
		},
		{
			id: "totalInvolvement",
			header: () => <div className="text-right">Total Involvement</div>,
			headerClassName:
				"w-[150px] px-4 py-2 text-right text-[14px] font-medium text-[#666]",
			cellClassName:
				"px-4 py-3 text-right text-[14px] font-medium text-[#0a0a0a]",
			cell: ({ row }) => row.original.totalInvolvement,
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
					className="size-8 text-[#737373]"
					aria-label="More actions for faculty member"
				>
					<EllipsisVertical className="size-4" />
				</Button>
			),
		},
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
					isLoading={isLoading}
					emptyMessage="No faculty records found."
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
