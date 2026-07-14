import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { EllipsisVertical, RotateCcw } from "lucide-react";
import { DataTablePage } from "@/components/custom/data-table-page";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toStableDate } from "@/lib/utils";
import type { ArchivedProposal } from "../functions";

export function ArchivedProposalsTable({
	data,
	total,
	isLoading,
	page,
	onPageChange,
	sorting,
	onSortingChange,
	onRestore,
}: {
	data: ArchivedProposal[];
	total: number;
	isLoading: boolean;
	page: number;
	onPageChange: (page: number) => void;
	sorting: SortingState;
	onSortingChange: (sorting: SortingState) => void;
	onRestore: (id: string, title: string) => void;
}) {
	const columns: DataTableColumnDef<ArchivedProposal>[] = [
		{
			id: "title",
			accessorKey: "title",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Proposal Title" />
			),
			headerClassName:
				"w-[380px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-sm font-semibold text-foreground text-left",
			cell: ({ row }) => row.original.title,
		},
		{
			id: "extensionCategory",
			accessorKey: "extensionCategory",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Category"
					className="justify-center"
				/>
			),
			headerClassName:
				"w-[180px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => row.original.extensionCategory,
		},
		{
			id: "archivedAt",
			accessorKey: "archivedAt",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Archived Date"
					className="justify-center"
				/>
			),
			headerClassName:
				"w-[180px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) =>
				row.original.archivedAt
					? format(toStableDate(row.original.archivedAt), "MMM dd, yyyy")
					: "-",
		},
		{
			id: "actions",
			headerClassName:
				"w-[100px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => (
				<div className="flex items-center justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger
							render={<Button variant="ghost" size="icon" className="size-8" />}
						>
							<EllipsisVertical className="size-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() =>
									onRestore(row.original.proposalId, row.original.title)
								}
								className="flex items-center gap-2 cursor-pointer"
							>
								<RotateCcw className="size-4 text-blue-500" />
								<span>Restore Proposal</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			),
		},
	];

	return (
		<DataTablePage
			columns={columns}
			data={data}
			total={total}
			isLoading={isLoading}
			page={page}
			pageSize={10}
			onPageChange={onPageChange}
			searchPlaceholder="Search archived proposals..."
			sorting={sorting}
			onSortingChange={onSortingChange}
			enableSorting
		/>
	);
}
