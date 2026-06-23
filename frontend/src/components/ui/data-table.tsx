import { FolderOpen } from "lucide-react";
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
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
} from "./empty";
import { Skeleton } from "./skeleton";
import { cn } from "#/lib/utils";

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
					Array.from({ length: 5 }).map((_, rowIndex) => (
						<TableRow
							key={`skeleton-row-${rowIndex}`}
							className="bg-white border-b border-[#ebebeb] last:border-0 hover:bg-transparent"
						>
							{columns.map((column, colIndex) => (
								<TableCell
									key={`skeleton-cell-${rowIndex}-${colIndex}`}
									className={column.cellClassName}
								>
									{column.skeleton ?? (
										<Skeleton className="h-4 w-[80%] rounded" />
									)}
								</TableCell>
							))}
						</TableRow>
					))
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
						<TableCell colSpan={colSpan} className="p-0">
							<Empty className="border-0 py-12">
								<EmptyContent>
									<EmptyMedia variant="icon">
										<FolderOpen className="size-5 text-[#666]" />
									</EmptyMedia>
									<EmptyDescription className="text-sm text-[#666]">
										{emptyMessage}
									</EmptyDescription>
								</EmptyContent>
							</Empty>
						</TableCell>
					</TableRow>
				) : (
					table.getRowModel().rows.map((row) => (
						<TableRow
							key={row.id}
							data-state={row.getIsSelected() && "selected"}
							className={cn(
								"bg-white border-b border-[#ebebeb] hover:bg-[#fcfcfc]",
								onRowClick && "cursor-pointer",
							)}
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
	skeleton?: React.ReactNode;
};

export { DataTable };
export type { DataTableProps };
