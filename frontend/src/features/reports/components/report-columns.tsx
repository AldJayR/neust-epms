import { EllipsisVertical } from "lucide-react";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAcademicRank, toStableDate } from "@/lib/utils";
import type { ReportItem } from "@/types/report";

function formatDate(dateStr: string) {
	try {
		return toStableDate(dateStr).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			timeZone: "UTC",
		});
	} catch {
		return dateStr;
	}
}

function createReportActionsColumn(): DataTableColumnDef<ReportItem> {
	return createActionsColumn({
		cell: ({ row }) => (
			<div className="flex justify-end pr-2">
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button variant="ghost" size="icon" className="size-8" />}
						aria-label="Open report actions"
					>
						<EllipsisVertical className="size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-40">
						<DropdownMenuItem
							disabled={!row.original.storagePath}
							render={
								// biome-ignore lint/a11y/useAnchorContent: DropdownMenuItem provides the link content.
								<a
									href={row.original.storagePath ?? "#"}
									target="_blank"
									rel="noopener noreferrer"
									aria-label="View report"
								/>
							}
						>
							View Report
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		),
	});
}

export function createDirectorReportColumns(
	isRET: boolean,
): DataTableColumnDef<ReportItem>[] {
	const columns: DataTableColumnDef<ReportItem>[] = [
		{
			id: "project",
			accessorKey: "project",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Project" />
			),
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 font-bold text-foreground",
			cell: ({ row }) => (
				<div className="truncate max-w-[280px]" title={row.original.project}>
					{row.original.project}
				</div>
			),
		},
		{
			id: "leader",
			accessorKey: "leader",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Leader" />
			),
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-sm text-foreground",
			cell: ({ row }) => {
				const item = row.original;
				if (!isRET) return item.leader;
				const initials = item.leader
					.split(" ")
					.map((name) => name[0])
					.join("")
					.slice(0, 2);
				return (
					<div className="flex items-center gap-3">
						<Avatar className="size-9">
							{item.avatarUrl && (
								<AvatarImage src={item.avatarUrl} alt={item.leader} />
							)}
							<AvatarFallback className="bg-muted text-muted-foreground">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-sm font-medium text-foreground">
								{item.leader}
							</span>
							<span className="text-xs text-muted-foreground">
								{formatAcademicRank(item.academicRank)}
							</span>
						</div>
					</div>
				);
			},
		},
	];

	if (!isRET) {
		columns.push({
			id: "department",
			accessorKey: "department",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Department" />
			),
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-sm text-foreground",
			cell: ({ row }) => row.original.department ?? "—",
		});
	}

	columns.push(
		{
			id: "reportType",
			accessorKey: "reportType",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Report Type"
					className="justify-center"
				/>
			),
			headerClassName:
				"px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center",
			cell: ({ row }) => (
				<div className="flex justify-center">
					<StatusBadge status={row.original.reportType} variant="outline" />
				</div>
			),
		},
		{
			id: "submitted",
			accessorKey: "submitted",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Submitted"
					className="justify-center"
				/>
			),
			headerClassName:
				"px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => formatDate(row.original.submitted),
		},
		createReportActionsColumn(),
	);

	return columns;
}

export function createFacultyReportColumns(
	progressReportSequences: ReadonlyMap<string, number>,
): DataTableColumnDef<ReportItem>[] {
	return [
		{
			id: "reportName",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Report" />
			),
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 font-medium text-foreground",
			cell: ({ row }) => {
				const item = row.original;
				if (item.reportType === "Progress") {
					const sequence = progressReportSequences.get(item.reportId) ?? 1;
					return `Progress Report #${sequence}`;
				}
				return "Terminal Report";
			},
		},
		{
			id: "project",
			accessorKey: "project",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Project" />
			),
			headerClassName: "px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-sm text-foreground",
			cell: ({ row }) => (
				<div className="truncate max-w-[280px]" title={row.original.project}>
					{row.original.project}
				</div>
			),
		},
		{
			id: "reportType",
			accessorKey: "reportType",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Report Type"
					className="justify-center"
				/>
			),
			headerClassName:
				"px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center",
			cell: ({ row }) => (
				<div className="flex justify-center">
					<StatusBadge status={row.original.reportType} variant="outline" />
				</div>
			),
		},
		{
			id: "submitted",
			accessorKey: "submitted",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Submitted"
					className="justify-center"
				/>
			),
			headerClassName:
				"px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => formatDate(row.original.submitted),
		},
		createReportActionsColumn(),
	];
}
