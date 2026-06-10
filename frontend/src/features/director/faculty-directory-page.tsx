import { useQuery } from "@tanstack/react-query";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Download,
	EllipsisVertical,
	Filter,
	Loader2,
	Search,
	TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { AuthUser } from "@/lib/auth";
import { facultyDirectoryQueryOptions } from "@/lib/dashboard.functions";
import { formatAcademicRank } from "@/lib/utils";
import { AppShell } from "../layout/app-shell";

function MetricCard({
	label,
	value,
	trend,
	college,
	contributors,
}: {
	label: string;
	value?: string | number;
	trend?: string;
	college?: string;
	contributors?: number;
}) {
	return (
		<div className="flex h-[116px] flex-1 flex-col gap-4 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<p className="text-[14px] leading-4 text-[#666]">{label}</p>
			{college ? (
				<div className="flex flex-col gap-1">
					<p className="text-[16px] font-medium leading-5 text-[#11215a] truncate">
						{college}
					</p>
					<div className="flex items-center gap-2">
						<div className="flex -space-x-2">
							{[1, 2, 3].map((i) => (
								<Avatar key={i} className="size-6 border-2 border-white">
									<AvatarFallback className="bg-[#ddd] text-[8px]" />
								</Avatar>
							))}
						</div>
						<p className="text-[14px] text-[#666]">
							+{contributors} Contributors
						</p>
					</div>
				</div>
			) : (
				<div className="flex items-end gap-4">
					<p className="text-[36px] font-semibold leading-9 text-[#11215a]">
						{value}
					</p>
					{trend && (
						<div className="flex h-[22px] items-center gap-1 rounded-lg border border-[#e5e5e5] bg-white px-1.5 py-0.5 shadow-sm">
							<TrendingUp className="size-3 text-[#22c55e]" />
							<span className="text-[12px] font-medium text-[#22c55e]">
								{trend}
							</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

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

	return (
		<AppShell>
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
					/>
					<MetricCard
						label="Average Projects per Faculty"
						value={metrics.averageProjectsPerFaculty}
					/>
					<MetricCard
						label="Most Active College"
						college={metrics.mostActiveCollege.name}
						contributors={metrics.mostActiveCollege.contributors}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="relative w-full max-w-[352px]">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
						<Input
							placeholder="Search by project title or faculty name..."
							aria-label="Search faculty directory"
							className="h-9 rounded-lg border-[#e5e5e5] bg-white pl-9 shadow-none placeholder:text-[#737373]"
							value={search}
							onChange={(e) => onSearchChange(e.target.value)}
						/>
					</div>
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
					<Table aria-label="Faculty directory">
						{showTableHeader && (
							<TableHeader>
								<TableRow className="border-b border-[#ebebeb] hover:bg-transparent">
									<TableHead className="w-[60px] px-4 py-2 text-center text-[14px] font-medium text-[#666]">
										Rank
									</TableHead>
									<TableHead className="w-[300px] px-4 py-2 text-[14px] font-medium text-[#666]">
										Faculty Name
									</TableHead>
									<TableHead className="w-[200px] px-4 py-2 text-[14px] font-medium text-[#666]">
										College
									</TableHead>
									<TableHead className="w-[120px] px-4 py-2 text-right text-[14px] font-medium text-[#666]">
										Lead Projects
									</TableHead>
									<TableHead className="w-[150px] px-4 py-2 text-right text-[14px] font-medium text-[#666]">
										Collaborator Projects
									</TableHead>
									<TableHead className="w-[150px] px-4 py-2 text-right text-[14px] font-medium text-[#666]">
										Total Involvement
									</TableHead>
									<TableHead className="w-[50px]"></TableHead>
								</TableRow>
							</TableHeader>
						)}
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={7} className="h-24 text-center">
										<Loader2
											className="mx-auto size-6 animate-spin text-[#11215a]"
											role="status"
											aria-label="Loading faculty data"
										/>
									</TableCell>
								</TableRow>
							) : items.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="h-24 text-center text-muted-foreground"
									>
										No faculty records found.
									</TableCell>
								</TableRow>
							) : (
								items.map((faculty, index) => (
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
								))
							)}
						</TableBody>
					</Table>
				</div>

				<div className="flex items-center justify-between pt-4">
					<p className="text-[12px] text-[#666]">
						Showing <span className="font-bold">{(page - 1) * limit + 1}</span>{" "}
						to{" "}
						<span className="font-bold">{Math.min(page * limit, total)}</span>{" "}
						of <span className="font-bold">{total.toLocaleString()}</span>{" "}
						results
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
		</AppShell>
	);
}
