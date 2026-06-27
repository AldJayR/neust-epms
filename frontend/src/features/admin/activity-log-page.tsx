import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import {
	CircleCheck,
	CloudUpload,
	Download,
	ListFilter,
	LogIn,
	Settings,
	UserCircle,
} from "lucide-react";
import * as React from "react";
import { BrandButton } from "@/components/custom/brand-button";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import { PageHeader } from "@/components/custom/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
};

export function ActivityLogPage({
	page,
	limit,
	search,
	onSearch,
	onPageChange,
}: ActivityLogPageProps) {
	const [typeFilter, setTypeFilter] = React.useState<string>("all");
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const { data: statsData } = useQuery(auditStatsQueryOptions());
	const { data: logsData, isLoading: isLogsLoading } = useQuery(
		auditLogsQueryOptions({ page, limit, search }),
	);

	const logs = React.useMemo(() => {
		const all = logsData?.items ?? [];
		if (typeFilter === "all") return all;
		return all.filter((log) => {
			const typeInfo = getActionTypeInfo(log.action, log.tableAffected);
			return typeInfo.label.toLowerCase() === typeFilter.toLowerCase();
		});
	}, [logsData?.items, typeFilter]);

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
			accessorKey: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Time" />
			),
			headerClassName:
				"w-[140px] font-medium text-muted-foreground text-sm py-2.5",
			cellClassName: "py-2.5 text-left",
			cell: ({ row }) => {
				const createdAt = new Date(row.original.createdAt);
				return (
					<div className="flex flex-col">
						<ClientOnly
							fallback={
								<div className="flex flex-col">
									<span className="text-sm text-foreground">...</span>
									<span className="text-xs text-muted-foreground">...</span>
								</div>
							}
						>
							<span className="text-sm text-foreground">
								{dateFormatter.format(createdAt)}
							</span>
							<span className="text-xs text-muted-foreground">
								{timeFormatter.format(createdAt)}
							</span>
						</ClientOnly>
					</div>
				);
			},
		},
		{
			id: "action",
			accessorKey: "action",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Action" />
			),
			headerClassName: "font-medium text-muted-foreground text-sm py-2.5",
			cellClassName: "py-2.5 text-sm text-foreground leading-normal text-left",
			cell: ({ row }) => row.original.action,
		},
		{
			id: "actor",
			accessorFn: (row) => row.actorName ?? "System",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Actor" />
			),
			headerClassName:
				"w-[200px] font-medium text-muted-foreground text-sm py-2.5",
			cellClassName: "py-2.5 text-left",
			cell: ({ row }) => (
				<div className="flex flex-col">
					<span className="text-sm text-foreground">
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
				"w-[130px] font-medium text-muted-foreground text-sm py-2.5 text-center",
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
							className="font-medium text-muted-foreground border-border h-[22px] px-1.5 gap-1 rounded-[8px]"
						>
							{typeInfo.icon}
							<span>{typeInfo.label}</span>
						</Badge>
					</div>
				);
			},
		},
		createActionsColumn(),
	];

	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title={
					<h1 className="text-2xl font-semibold text-heading">Activity Log</h1>
				}
				actions={
					<BrandButton
						onClick={exportToCsv}
						className="hover:bg-brand-primary-hover shadow-[0px_1px_2px_0px_var(--shadow-card)] h-9 px-3 gap-1.5"
					>
						<Download className="size-4" />
						<span>Export CSV</span>
					</BrandButton>
				}
			/>

			<div className="grid gap-6 md:grid-cols-4">
				{stats.map((stat) => (
					<MetricCard key={stat.label} label={stat.label} value={stat.value} />
				))}
			</div>

			<DataTablePage
				columns={columns}
				data={logs}
				total={logsData?.total ?? 0}
				isLoading={isLogsLoading}
				page={page}
				pageSize={limit}
				onPageChange={onPageChange}
				search={search}
				onSearch={(val) => onSearch(val || undefined)}
				searchPlaceholder="Search by users or email"
				sorting={sorting}
				onSortingChange={setSorting}
				enableSorting
				filters={
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="outline"
									size="icon"
									className="h-9 w-9 border-border rounded-[8px] shadow-sm"
									aria-label="Filter activity log"
								>
									<ListFilter className="size-4" />
								</Button>
							}
						/>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuRadioGroup
								value={typeFilter}
								onValueChange={(val) => setTypeFilter(val)}
							>
								<DropdownMenuRadioItem value="all">
									All Actions
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="approval">
									Approval
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="upload">
									Upload
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="login">
									Login
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="status">
									Status
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="account">
									Account
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				}
				activeFilters={{ search, typeFilter }}
				emptyMessage="No activities found."
				ariaLabel="Activity log"
			/>
		</div>
	);
}
