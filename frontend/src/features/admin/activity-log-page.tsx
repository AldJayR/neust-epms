import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import {
	CircleCheck,
	CloudUpload,
	Download,
	ListFilter,
	LogIn,
	MoreVertical,
	Settings,
	UserCircle,
} from "lucide-react";
import { MetricCard } from "@/components/custom/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchInput } from "@/components/ui/search-input";
import {
	type AuditLog,
	auditLogsQueryOptions,
	auditStatsQueryOptions,
} from "@/lib/admin.functions";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
	hour: "numeric",
	minute: "2-digit",
	hour12: true,
});

interface ActivityLogPageProps {
	page: number;
	limit: number;
	search?: string;
	onSearch: (search: string | undefined) => void;
	onPageChange: (page: number) => void;
}

const getActionTypeInfo = (action: string, table: string) => {
	const lowerAction = action.toLowerCase();
	if (lowerAction.includes("approved proposal")) {
		return { label: "Approval", icon: <CircleCheck className="size-3" /> };
	}
	if (lowerAction.includes("submitted") || lowerAction.includes("upload")) {
		return { label: "Upload", icon: <CloudUpload className="size-3" /> };
	}
	if (lowerAction.includes("login") || lowerAction.includes("logged in")) {
		return { label: "Login", icon: <LogIn className="size-3" /> };
	}
	if (lowerAction.includes("status")) {
		return { label: "Status", icon: <Settings className="size-3" /> };
	}
	if (table === "users" || lowerAction.includes("account")) {
		return { label: "Account", icon: <UserCircle className="size-3" /> };
	}
	return { label: "System", icon: <Settings className="size-3" /> };
};

const exportToCsv = () => {
	// Placeholder for CSV export
	console.log("Exporting to CSV...");
};

export function ActivityLogPage({
	page,
	limit,
	search,
	onSearch,
	onPageChange,
}: ActivityLogPageProps) {
	const { data: statsData } = useQuery(auditStatsQueryOptions());
	const { data: logsData, isLoading: isLogsLoading } = useQuery(
		auditLogsQueryOptions({ page, limit, search }),
	);

	const logs = logsData?.items ?? [];
	const showTableHeader = logs.length > 0 || (search ?? "").trim().length > 0;

	const stats = [
		{
			label: "Total actions today",
			value: statsData?.totalActionsToday ?? "...",
		},
		{
			label: "Unique users active",
			value: statsData?.uniqueUsersActive ?? "...",
		},
		{
			label: "Account changes",
			value: statsData?.accountChanges ?? "...",
		},
		{
			label: "Failed logins",
			value: statsData?.failedLogins ?? "...",
		},
	];

	const columns: DataTableColumnDef<AuditLog>[] = [
		{
			id: "time",
			header: "Time",
			headerClassName: "w-[140px] font-medium text-[#666] text-sm py-2.5",
			cellClassName: "py-2.5 text-left",
			cell: ({ row }) => {
				const createdAt = new Date(row.original.createdAt);
				return (
					<div className="flex flex-col">
						<ClientOnly
							fallback={
								<div className="flex flex-col">
									<span className="text-sm text-[#0a0a0a]">...</span>
									<span className="text-xs text-[#666]">...</span>
								</div>
							}
						>
							<span className="text-sm text-[#0a0a0a]">
								{dateFormatter.format(createdAt)}
							</span>
							<span className="text-xs text-[#666]">
								{timeFormatter.format(createdAt)}
							</span>
						</ClientOnly>
					</div>
				);
			},
		},
		{
			id: "action",
			header: "Action",
			headerClassName: "font-medium text-[#666] text-sm py-2.5",
			cellClassName: "py-2.5 text-sm text-[#0a0a0a] leading-normal text-left",
			cell: ({ row }) => row.original.action,
		},
		{
			id: "actor",
			header: "Actor",
			headerClassName: "w-[200px] font-medium text-[#666] text-sm py-2.5",
			cellClassName: "py-2.5 text-left",
			cell: ({ row }) => (
				<div className="flex flex-col">
					<span className="text-sm text-[#0a0a0a]">
						{row.original.actorName ?? "System"}
					</span>
					<span className="text-xs text-muted-foreground">
						{row.original.actorRole ?? "Automated"}
					</span>
				</div>
			),
		},
		{
			id: "type",
			header: () => <div className="text-center">Type</div>,
			headerClassName:
				"w-[130px] font-medium text-[#666] text-sm py-2.5 text-center",
			cellClassName: "py-2.5 text-center",
			cell: ({ row }) => {
				const typeInfo = getActionTypeInfo(
					row.original.action,
					row.original.tableAffected,
				);
				return (
					<div className="flex justify-center">
						<Badge
							variant="outline"
							className="font-medium text-[#737373] border-[#e5e5e5] h-[22px] px-1.5 gap-1 rounded-[8px]"
						>
							{typeInfo.icon}
							<span>{typeInfo.label}</span>
						</Badge>
					</div>
				);
			},
		},
		{
			id: "actions",
			header: "",
			headerClassName: "w-[50px] py-2.5",
			cellClassName: "py-2.5 text-center",
			cell: () => (
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					aria-label="More actions for log entry"
				>
					<MoreVertical className="size-4" />
				</Button>
			),
		},
	];

	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-[#11215a]">Activity Log</h1>
				<Button
					onClick={exportToCsv}
					className="bg-brand-primary hover:bg-brand-primary-hover text-white rounded-[10px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] h-9 px-3 gap-1.5"
				>
					<Download className="size-4" />
					<span>Export CSV</span>
				</Button>
			</div>

			<div className="grid gap-6 md:grid-cols-4">
				{stats.map((stat) => (
					<MetricCard key={stat.label} label={stat.label} value={stat.value} />
				))}
			</div>

			<div className="flex items-center justify-between">
				<SearchInput
					value={search ?? ""}
					onChange={(val) => onSearch(val || undefined)}
					placeholder="Search by users or email"
					ariaLabel="Search activity log"
					className="max-w-[352px]"
				/>
				<Button
					variant="outline"
					size="icon"
					className="h-9 w-9 border-[#e5e5e5] rounded-[8px] shadow-sm"
					aria-label="Filter activity log"
				>
					<ListFilter className="size-4" />
				</Button>
			</div>

			<div className="border border-[#ebebeb] rounded-[12px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] overflow-hidden bg-white">
				<DataTable
					columns={columns}
					data={logs}
					isLoading={isLogsLoading}
					emptyMessage="No activities found."
					ariaLabel="Activity log"
					showHeader={showTableHeader}
				/>
			</div>

			<PaginationBar
				page={page}
				totalPages={Math.ceil((logsData?.total ?? 0) / limit)}
				onPageChange={onPageChange}
				total={logsData?.total ?? 0}
				limit={limit}
				isLoading={isLogsLoading}
			/>
		</div>
	);
}
