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
				searchPlaceholder="Search by name or department..."
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
