import { useQuery } from "@tanstack/react-query";
import {
	ChevronLeft,
	ChevronRight,
	EllipsisVertical,
	ListFilter,
} from "lucide-react";
import { MetricCard } from "@/components/custom/metric-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthUser } from "@/lib/auth";
import {
	type FacultyInvolvement,
	facultyDirectoryQueryOptions,
} from "@/lib/dashboard.functions";
import { formatAcademicRank } from "@/lib/utils";

interface RetFacultyDirectoryPageProps {
	user?: AuthUser | null;
	page: number;
	limit: number;
	search?: string;
	onPageChange: (page: number) => void;
	onSearchChange: (search: string) => void;
}

export function RetFacultyDirectoryPage({
	user,
	page,
	limit,
	search,
	onPageChange,
	onSearchChange,
}: RetFacultyDirectoryPageProps) {
	// The RET Chair view is scoped to their college by default (handled by backend)
	const { data, isLoading } = useQuery(
		facultyDirectoryQueryOptions({ page, limit, search }),
	);

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	// metrics from existing API might need extension later to match the design's specific stats
	const metrics = data?.metrics;
	const totalPages = Math.ceil(total / limit);

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
			id: "department",
			header: "Department",
			headerClassName:
				"w-[200px] px-4 py-2 text-[14px] font-medium text-[#666]",
			cellClassName: "px-4 py-3 text-[14px] text-[#0a0a0a]",
			cell: ({ row }) => row.original.departmentCode,
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
			{/* Page Header */}
			<div className="flex flex-col gap-2">
				<h1 className="text-[24px] font-semibold leading-[35px] text-[#11215a]">
					Faculty Directory
				</h1>
				<p className="text-[14px] font-normal leading-4 text-[#14369c]">
					{user?.departmentName ||
						"College of Information and Communications Technology"}
				</p>
			</div>

			{/* Metric Cards */}
			<div className="flex items-center gap-6">
				<MetricCard
					label="Total Faculty"
					value={total.toLocaleString()}
					className="flex-1"
				/>
				<MetricCard
					label="Active Faculty"
					value={(metrics?.totalActiveExtension ?? 0).toLocaleString()}
					className="flex-1"
				/>
				<MetricCard
					label="Faculty without Extension Projects"
					value="0"
					className="flex-1"
				/>
			</div>

			{/* Controls: Search & Filter */}
			<div className="flex items-center justify-between">
				<SearchInput
					value={search ?? ""}
					onChange={onSearchChange}
					placeholder="Search faculty"
					ariaLabel="Search faculty directory"
					className="max-w-[352px]"
				/>
				<Button
					variant="outline"
					size="icon"
					className="size-9 rounded-lg border-[#e5e5e5] bg-white shadow-sm"
				>
					<ListFilter className="size-4" />
				</Button>
			</div>

			{/* Content Section with Tabs and Table */}
			<div className="flex flex-col gap-6">
				<div className="overflow-hidden rounded-[12px] border border-[#ebebeb] bg-[#f9f9f9] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
					{/* Tabs Header */}
					<div className="border-b border-[#ebebeb] bg-white p-2">
						<Tabs defaultValue="college" className="w-fit">
							<TabsList className="bg-[#fafafa]">
								<TabsTrigger
									value="pending"
									className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
								>
									Pending Verifications
								</TabsTrigger>
								<TabsTrigger
									value="college"
									className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
								>
									College Directory
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					{/* Table */}
					<div className="bg-white">
						<DataTable
							columns={columns}
							data={items}
							isLoading={isLoading}
							emptyMessage="No faculty records found."
							ariaLabel="Faculty directory"
						/>
					</div>
				</div>

				{/* Pagination Section */}
				<div className="flex items-center justify-between">
					<p className="text-[12px] text-[#666]">
						Showing <span className="font-bold">{items.length}</span> of{" "}
						<span className="font-bold">{total.toLocaleString()}</span> results
					</p>

					{totalPages > 1 && (
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								className="gap-1 text-[14px] font-medium text-[#0a0a0a] hover:bg-transparent"
								onClick={() => onPageChange(page - 1)}
								disabled={page <= 1}
							>
								<ChevronLeft className="size-4" />
								<span>Previous</span>
							</Button>

							{[...Array(totalPages)].map((_, i) => {
								const p = i + 1;
								if (
									p === 1 ||
									p === totalPages ||
									(p >= page - 1 && p <= page + 1)
								) {
									return (
										<Button
											key={p}
											variant={page === p ? "outline" : "ghost"}
											size="icon"
											onClick={() => onPageChange(p)}
											className={
												page === p
													? "size-9 border-[#e5e5e5] bg-white text-[14px] font-medium text-[#0a0a0a] shadow-sm"
													: "size-9 text-[14px] font-medium text-[#0a0a0a] hover:bg-transparent"
											}
										>
											{p}
										</Button>
									);
								}
								return null;
							})}

							<Button
								variant="ghost"
								size="sm"
								className="gap-1 text-[14px] font-medium text-[#0a0a0a] hover:bg-transparent"
								onClick={() => onPageChange(page + 1)}
								disabled={page >= totalPages}
							>
								<span>Next</span>
								<ChevronRight className="size-4" />
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
