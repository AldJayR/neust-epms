import {
	CircleCheck,
	CloudUpload,
	Download,
	ListFilter,
	LogIn,
	Settings,
	UserCircle,
} from "lucide-react";
import { BrandButton } from "@/components/custom/brand-button";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import { PageHeader } from "@/components/custom/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivityLogEntryDialog } from "./activity-log-entry-dialog";
import type { AuditLog } from "./functions";
import {
	formatActivityAction,
	getActivityLogType,
	useActivityLogView,
} from "./hooks/use-activity-log-view";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
	hour: "numeric",
	minute: "2-digit",
	hour12: true,
	timeZone: "UTC",
});

interface ActivityLogPageProps {
	page: number;
	limit: number;
	search?: string;
	onSearch: (search: string | undefined) => void;
	onPageChange: (page: number) => void;
}

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
	const view = useActivityLogView({ page, limit, search });

	const stats = [
		{
			label: "Total actions today",
			value: view.statsData?.totalActionsToday ?? "...",
		},
		{
			label: "Unique users active",
			value: view.statsData?.uniqueUsersActive ?? "...",
		},
		{
			label: "Account changes",
			value: view.statsData?.accountChanges ?? "...",
		},
		{
			label: "Failed logins",
			value: view.statsData?.failedLogins ?? "...",
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
						<span className="text-sm text-foreground">
							{dateFormatter.format(createdAt)}
						</span>
						<span className="text-xs text-muted-foreground">
							{timeFormatter.format(createdAt)}
						</span>
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
			cell: ({ row }) => (
				<div className="max-w-[320px] md:max-w-[450px] whitespace-normal break-words">
					{formatActivityAction(row.original.action)}
				</div>
			),
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
				const type = getActivityLogType(
					row.original.action,
					row.original.tableAffected,
				);
				const Icon = {
					Approval: CircleCheck,
					Upload: CloudUpload,
					Login: LogIn,
					Status: Settings,
					Account: UserCircle,
					System: Settings,
				}[type];
				return (
					<div className="flex justify-center">
						<Badge
							variant="outline"
							className="font-medium text-muted-foreground border-border h-[22px] px-1.5 gap-1 rounded-[8px]"
						>
							<Icon className="size-3" />
							<span>{type}</span>
						</Badge>
					</div>
				);
			},
		},
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
				data={view.logs}
				total={view.total}
				isLoading={view.isLoading}
				page={page}
				pageSize={limit}
				onPageChange={onPageChange}
				search={search}
				onSearch={(val) => onSearch(val || undefined)}
				searchPlaceholder="Search by users or email"
				sorting={view.sorting}
				onSortingChange={view.setSorting}
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
								value={view.typeFilter}
								onValueChange={(value) =>
									view.setTypeFilter(value as typeof view.typeFilter)
								}
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
				activeFilters={{ search, typeFilter: view.typeFilter }}
				emptyMessage="No activities found."
				ariaLabel="Activity log"
				onRowClick={view.setSelectedLog}
			/>
			<ActivityLogEntryDialog
				log={view.selectedLog}
				onOpenChange={(open) => {
					if (!open) view.setSelectedLog(null);
				}}
			/>
		</div>
	);
}
