import { useQuery } from "@tanstack/react-query";
import { ListFilter } from "lucide-react";
import * as React from "react";
import { cn } from "#/lib/utils";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthUser } from "@/lib/auth";
import { facultyDirectoryQueryOptions } from "@/lib/dashboard.functions";
import { retFacultyDirectoryColumns } from "./components/faculty-directory-columns";

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
	const [activeTab, setActiveTab] = React.useState<string>("department");
	const [selectedRanks, setSelectedRanks] = React.useState<string[]>([]);
	const [selectedLoads, setSelectedLoads] = React.useState<string[]>([]); // "0", "1-2", "3+"

	// The RET Chair view is scoped to their college by default (handled by backend)
	const { data, isLoading } = useQuery(
		facultyDirectoryQueryOptions({
			page,
			limit,
			search,
			status: activeTab === "pending" ? "pending" : "active",
		}),
	);

	const filteredItems = React.useMemo(() => {
		let result = data?.items ?? [];

		// 1. Rank filter
		if (selectedRanks.length > 0) {
			result = result.filter((item) => {
				const rank = item.academicRank?.toLowerCase() ?? "";
				return selectedRanks.some((r) => rank.includes(r.toLowerCase()));
			});
		}

		// 2. Load filter
		if (selectedLoads.length > 0) {
			result = result.filter((item) => {
				const count = item.totalInvolvement ?? 0;
				return selectedLoads.some((load) => {
					if (load === "0") return count === 0;
					if (load === "1-2") return count >= 1 && count <= 2;
					if (load === "3+") return count >= 3;
					return true;
				});
			});
		}

		return result;
	}, [data?.items, selectedRanks, selectedLoads]);

	const activeFilterCount = selectedRanks.length + selectedLoads.length;
	const total = data?.total ?? 0;
	const metrics = data?.metrics ?? { totalActiveExtension: 0 };

	const columns = retFacultyDirectoryColumns;

	return (
		<div className="flex flex-col gap-8">
			{/* Page Header */}
			<div className="flex flex-col gap-2">
				<h1 className="text-xl font-semibold leading-[35px] text-heading">
					Faculty Directory
				</h1>
				<p className="text-sm font-normal leading-4 text-brand-primary">
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

			<DataTablePage
				columns={columns}
				data={filteredItems}
				total={total}
				isLoading={isLoading}
				page={page}
				pageSize={limit}
				onPageChange={onPageChange}
				search={search}
				onSearch={onSearchChange}
				searchPlaceholder="Search faculty"
				filters={
					<Popover>
						<PopoverTrigger
							render={
								<Button
									variant="outline"
									size="icon"
									className={cn(
										"size-9 rounded-lg border-border bg-background shadow-sm relative transition-all duration-200",
										activeFilterCount > 0 &&
											"border-brand-primary ring-1 ring-brand-primary",
									)}
									aria-label="Filter faculty list"
								>
									<ListFilter className="size-4" />
									{activeFilterCount > 0 && (
										<span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-brand-primary" />
									)}
								</Button>
							}
						/>
						<PopoverContent
							align="end"
							className="w-[320px] p-4 bg-background border border-border rounded-xl shadow-lg gap-4 flex flex-col z-50"
						>
							<div className="flex flex-col gap-1">
								<h4 className="font-semibold text-sm text-heading">
									Directory Filters
								</h4>
								<p className="text-xs text-muted-foreground">
									Filter faculty in your department.
								</p>
							</div>

							{/* Presets / Quick Filters */}
							<div className="flex flex-col gap-2 border-t border-border pt-3">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Quick Actions
								</span>
								<div className="flex flex-wrap gap-1.5">
									<Button
										variant="secondary"
										size="sm"
										className="h-7 text-xs bg-primary/5 text-brand-primary border border-brand-primary/20 hover:bg-[#eaf1fd] rounded-md px-2.5 font-medium cursor-pointer"
										onClick={() => {
											setSelectedLoads(["0"]);
											setSelectedRanks([]);
										}}
									>
										Available for Assignment
									</Button>
									<Button
										variant="secondary"
										size="sm"
										className="h-7 text-xs bg-[#fef2f2] text-destructive border border-destructive/20 hover:bg-[#fee2e2] rounded-md px-2.5 font-medium cursor-pointer"
										onClick={() => {
											setSelectedLoads(["3+"]);
											setSelectedRanks([]);
										}}
									>
										Highly Loaded (3+)
									</Button>
								</div>
							</div>

							{/* Rank Select */}
							<div className="flex flex-col gap-2 border-t border-border pt-3">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Academic Ranks
								</span>
								<div className="grid grid-cols-2 gap-x-4 gap-y-2">
									{[
										{ label: "Instructors", val: "instructor" },
										{ label: "Assistant Prof", val: "assistant" },
										{ label: "Associate Prof", val: "associate" },
										{ label: "Professors", val: "professor" },
									].map((r) => {
										const isChecked = selectedRanks.includes(r.val);
										const checkboxId = `rank-${r.val}`;
										return (
											<div
												key={r.val}
												className="flex items-center gap-2 text-xs font-medium text-slate-700 select-none"
											>
												<Checkbox
													id={checkboxId}
													checked={isChecked}
													onCheckedChange={(checked) => {
														if (checked) {
															setSelectedRanks([...selectedRanks, r.val]);
														} else {
															setSelectedRanks(
																selectedRanks.filter((x) => x !== r.val),
															);
														}
													}}
												/>
												<label htmlFor={checkboxId} className="cursor-pointer">
													{r.label}
												</label>
											</div>
										);
									})}
								</div>
							</div>

							{/* Project Load Select */}
							<div className="flex flex-col gap-2 border-t border-border pt-3">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Project Involvement
								</span>
								<div className="grid grid-cols-2 gap-x-4 gap-y-2">
									{[
										{ label: "0 Projects", val: "0" },
										{ label: "1-2 Projects", val: "1-2" },
										{ label: "3+ Projects", val: "3+" },
									].map((l) => {
										const isChecked = selectedLoads.includes(l.val);
										const checkboxId = `load-${l.val}`;
										return (
											<div
												key={l.val}
												className="flex items-center gap-2 text-xs font-medium text-slate-700 select-none"
											>
												<Checkbox
													id={checkboxId}
													checked={isChecked}
													onCheckedChange={(checked) => {
														if (checked) {
															setSelectedLoads([...selectedLoads, l.val]);
														} else {
															setSelectedLoads(
																selectedLoads.filter((x) => x !== l.val),
															);
														}
													}}
												/>
												<label htmlFor={checkboxId} className="cursor-pointer">
													{l.label}
												</label>
											</div>
										);
									})}
								</div>
							</div>

							{/* Reset Footer */}
							{activeFilterCount > 0 && (
								<div className="flex justify-end items-center border-t border-border pt-3 mt-1">
									<Button
										variant="ghost"
										size="sm"
										className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
										onClick={() => {
											setSelectedRanks([]);
											setSelectedLoads([]);
										}}
									>
										Reset All
									</Button>
								</div>
							)}
						</PopoverContent>
					</Popover>
				}
				activeFilters={{ search }}
				emptyMessage="No faculty records found."
				ariaLabel="Faculty directory"
				
				cardHeader={
					<div className="border-b border-border bg-background p-2">
						<Tabs
							value={activeTab}
							onValueChange={(val) => {
								setActiveTab(val);
								onPageChange(1);
							}}
							className="w-fit"
						>
							<TabsList className="bg-muted">
								<TabsTrigger
									value="department"
									className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
								>
									Department Directory
								</TabsTrigger>
								<TabsTrigger
									value="pending"
									className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
								>
									Pending Verifications
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				}
			/>
		</div>
	);
}
