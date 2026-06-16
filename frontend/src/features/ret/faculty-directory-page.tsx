import { useQuery } from "@tanstack/react-query";
import {
	ChevronLeft,
	ChevronRight,
	CircleCheck,
	EllipsisVertical,
	ListFilter,
	Loader2,
	Search,
} from "lucide-react";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthUser } from "@/lib/auth";
import { facultyDirectoryQueryOptions } from "@/lib/dashboard.functions";
import { formatAcademicRank } from "@/lib/utils";
import { AppShell } from "../layout/app-shell";

function MetricCard({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="flex h-[104px] flex-1 flex-col gap-4 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<p className="text-[14px] font-normal leading-4 text-[#666]">{label}</p>
			<p className="text-[36px] font-semibold leading-9 text-[#11215a]">
				{value}
			</p>
		</div>
	);
}

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

	const [localSearch, setLocalSearch] = useState(search ?? "");
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
	const debouncedSearch = (value: string) => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => onSearchChange(value), 300);
	};

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	// metrics from existing API might need extension later to match the design's specific stats
	const metrics = data?.metrics;
	const totalPages = Math.ceil(total / limit);

	return (
		<AppShell>
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
					<MetricCard label="Total Faculty" value={total.toLocaleString()} />
					<MetricCard
						label="Active Faculty"
						value={metrics?.totalActiveExtension.toLocaleString() ?? "0"}
					/>
					<MetricCard label="Faculty without Extension Projects" value="0" />
				</div>

				{/* Controls: Search & Filter */}
				<div className="flex items-center justify-between">
					<div className="relative w-full max-w-[352px]">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
						<Input
							placeholder="Search faculty"
							aria-label="Search faculty directory"
							className="h-9 rounded-lg border-[#e5e5e5] bg-white pl-9 shadow-none placeholder:text-[#737373]"
							value={localSearch}
							onChange={(e) => {
								setLocalSearch(e.target.value);
								debouncedSearch(e.target.value);
							}}
						/>
					</div>
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
							<Table>
								<TableHeader className="bg-white">
									<TableRow className="border-b border-[#ebebeb] hover:bg-transparent">
										<TableHead className="w-[320px] px-4 py-2 text-[14px] font-medium text-[#666]">
											Faculty Name
										</TableHead>
										<TableHead className="w-[179px] px-4 py-2 text-[14px] font-medium text-[#666]">
											Rank
										</TableHead>
										<TableHead className="w-[174px] px-4 py-2 text-right text-[14px] font-medium text-[#666]">
											Total Projects
										</TableHead>
										<TableHead className="w-[254px] px-4 py-2 text-center text-[14px] font-medium text-[#666]">
											Account Status
										</TableHead>
										<TableHead className="w-[50px]"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{isLoading ? (
										<TableRow>
											<TableCell colSpan={5} className="h-24 text-center">
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
												colSpan={5}
												className="h-24 text-center text-muted-foreground"
											>
												No faculty records found.
											</TableCell>
										</TableRow>
									) : (
										items.map((faculty) => (
											<TableRow
												key={faculty.userId}
												className="border-b border-[#ebebeb] hover:bg-[#fcfcfc]"
											>
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
																{faculty.college || "N/A"}
															</span>
														</div>
													</div>
												</TableCell>
												<TableCell className="px-4 py-3">
													<Badge
														variant="secondary"
														className="rounded-lg border-[#e5e5e5] bg-white font-medium text-[#737373] shadow-none"
													>
														{formatAcademicRank(faculty.academicRank)}
													</Badge>
												</TableCell>
												<TableCell className="px-4 py-3 text-right text-[14px] font-normal text-[#0a0a0a]">
													{faculty.totalInvolvement}
												</TableCell>
												<TableCell className="px-4 py-3 text-center">
													<Badge
														variant="secondary"
														className="inline-flex items-center gap-1 rounded-lg border-[#e5e5e5] bg-white font-medium text-[#737373] shadow-none"
													>
														{faculty.isActive ? (
															<>
																<CircleCheck className="size-3 text-[#22c55e]" />
																Active
															</>
														) : (
															"Inactive"
														)}
													</Badge>
												</TableCell>
												<TableCell className="px-4 py-3 text-right">
													<Button
														variant="ghost"
														size="icon"
														className="size-8 text-[#737373]"
														aria-label="More actions"
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
					</div>

					{/* Pagination Section */}
					<div className="flex items-center justify-between">
						<p className="text-[12px] text-[#666]">
							Showing <span className="font-bold">{items.length}</span> of{" "}
							<span className="font-bold">{total.toLocaleString()}</span>{" "}
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
			</div>
		</AppShell>
	);
}
