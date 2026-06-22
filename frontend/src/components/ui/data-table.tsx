import { Loader2 } from "lucide-react";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";

interface DataTableProps<TData, TValue> {
	columns: DataTableColumnDef<TData, TValue>[];
	data: TData[];
	isLoading?: boolean;
	error?: string | null;
	emptyMessage?: string;
	errorMessage?: string;
	showHeader?: boolean;
	className?: string;
	ariaLabel?: string;
	onRowClick?: (item: TData) => void;
}

function DataTable<TData, TValue>({
	columns,
	data,
	isLoading = false,
	error = null,
	emptyMessage = "No records found.",
	errorMessage = "Something went wrong.",
	showHeader = true,
	className,
	ariaLabel,
	onRowClick,
}: DataTableProps<TData, TValue>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	const colSpan = columns.length;

	return (
		<Table className={className} aria-label={ariaLabel}>
			{showHeader && (
				<TableHeader className="bg-white">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow
							key={headerGroup.id}
							className="border-b-[#e5e5e5] hover:bg-transparent"
						>
							{headerGroup.headers.map((header) => {
								const columnDef = header.column.columnDef as DataTableColumnDef<
									TData,
									TValue
								>;
								return (
									<TableHead
										key={header.id}
										className={columnDef.headerClassName}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>
			)}
			<TableBody>
				{isLoading ? (
					<TableRow>
						<TableCell colSpan={colSpan} className="h-24 text-center">
							<Loader2
								className="mx-auto size-6 animate-spin text-[#11215a]"
								role="status"
							/>
						</TableCell>
					</TableRow>
				) : error ? (
					<TableRow>
						<TableCell
							colSpan={colSpan}
							className="h-24 text-center text-muted-foreground"
						>
							{errorMessage}
						</TableCell>
					</TableRow>
				) : data.length === 0 ? (
					<TableRow>
						<TableCell
							colSpan={colSpan}
							className="h-24 text-center text-muted-foreground"
						>
							{emptyMessage}
						</TableCell>
					</TableRow>
				) : (
					table.getRowModel().rows.map((row) => (
						<TableRow
							key={row.id}
							data-state={row.getIsSelected() && "selected"}
							className={onRowClick ? "cursor-pointer" : undefined}
							onClick={
								onRowClick ? () => onRowClick(row.original) : undefined
							}
						>
							{row.getVisibleCells().map((cell) => {
								const columnDef = cell.column.columnDef as DataTableColumnDef<
									TData,
									TValue
								>;
								return (
									<TableCell
										key={cell.id}
										className={columnDef.cellClassName}
									>
										{flexRender(
											cell.column.columnDef.cell,
											cell.getContext(),
										)}
									</TableCell>
								);
							})}
						</TableRow>
					))
				)}
			</TableBody>
		</Table>
	);
}

export type DataTableColumnDef<
	TData = unknown,
	TValue = unknown,
> = ColumnDef<TData, TValue> & {
	headerClassName?: string;
	cellClassName?: string;
};

export { DataTable };
export type { DataTableProps };
