import { Link } from "@tanstack/react-router";
import { DataTablePage } from "@/components/custom/data-table-page";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReportDocumentButton } from "@/features/reports/components/report-document-button";
import type { ProjectAnalyticsItem } from "./schema";

export function ProjectAnalyticsTable({
	items,
	total,
	isLoading,
	page,
	pageSize,
	onPageChange,
	showProjectRole,
}: {
	items: ProjectAnalyticsItem[];
	total: number;
	isLoading: boolean;
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	showProjectRole: boolean;
}) {
	const columns: DataTableColumnDef<ProjectAnalyticsItem>[] = [
		{
			accessorKey: "label",
			header: "Project",
			cell: ({ row }) => (
				<Link
					className="font-medium text-primary underline"
					to="/projects/$projectId"
					params={{ projectId: row.original.proposalId }}
				>
					{row.original.label}
				</Link>
			),
		},
		{ accessorKey: "campus", header: "Campus" },
		{ accessorKey: "department", header: "Lead department / unit" },
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => (
				<StatusBadge status={row.original.status} variant="outline" />
			),
		},
	];
	if (showProjectRole)
		columns.push({ accessorKey: "projectRole", header: "Project role" });
	columns.push(
		{
			accessorKey: "closedAt",
			header: "Closure date",
			cell: ({ row }) =>
				row.original.closedAt
					? new Date(row.original.closedAt).toLocaleDateString("en-PH", {
							timeZone: "Asia/Manila",
						})
					: "—",
		},
		{
			accessorKey: "traineeCount",
			header: "Approved project reach",
			cell: ({ row }) =>
				row.original.status !== "Closed"
					? "Not yet approved"
					: row.original.traineeCount === null
						? "Not recorded"
						: row.original.traineeCount.toLocaleString(),
		},
		{
			id: "evidence",
			header: "Evidence",
			cell: ({ row }) =>
				row.original.reportId ? (
					<ReportDocumentButton id={row.original.reportId} />
				) : (
					"No terminal report"
				),
		},
	);
	return (
		<DataTablePage
			columns={columns}
			data={items}
			total={total}
			isLoading={isLoading}
			page={page}
			pageSize={pageSize}
			onPageChange={onPageChange}
			ariaLabel="Contributing projects"
			emptyMessage="No records match the selected filters."
		/>
	);
}
