import { useEffect, useRef } from "react";
import { FolderOpen } from "lucide-react";
import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import type {
	ColumnDef,
	RowSelectionState,
	SortingState,
	VisibilityState,
} from "@tanstack/react-table";
import type { Table as ReactTable } from "@tanstack/react-table";

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
	activeFilters?: Record<string, unknown>;
	className?: string;
	ariaLabel?: string;
	onRowClick?: (item: TData) => void;
	sorting?: SortingState;
	onSortingChange?: (sorting: SortingState) => void;
	columnVisibility?: VisibilityState;
	onColumnVisibilityChange?: (visibility: VisibilityState) => void;
	rowSelection?: RowSelectionState;
	onRowSelectionChange?: (selection: RowSelectionState) => void;
	enableSorting?: boolean;
	enableVisibility?: boolean;
	enableSelection?: boolean;
	onTableReady?: (table: ReactTable<TData>) => void;
}

function DataTable<TData, TValue>({
	columns,
	data,
	isLoading = false,
	error = null,
	emptyMessage = "No records found.",
	errorMessage = "Something went wrong.",
	showHeader: showHeaderProp,
	activeFilters,
	className,
	ariaLabel,
	onRowClick,
	sorting,
	onSortingChange,
	columnVisibility,
	onColumnVisibilityChange,
	rowSelection,
	onRowSelectionChange,
	enableSorting = false,
	enableVisibility = false,
	enableSelection = false,
	onTableReady,
}: DataTableProps<TData, TValue>) {
	const showHeader = showHeaderProp ?? (
		data.length > 0 ||
		Object.values(activeFilters ?? {}).some(
			(v) => v != null && String(v).trim().length > 0,
		)
	);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		// Sorting
		...(enableSorting && {
			onSortingChange: (updater) => {
				const next = typeof updater === "function" ? updater(sorting ?? []) : updater;
				onSortingChange?.(next);
			},
			getSortedRowModel: getSortedRowModel(),
		}),
		// Visibility
		...(enableVisibility && {
			onColumnVisibilityChange: (updater) => {
				const next = typeof updater === "function" ? updater(columnVisibility ?? {}) : updater;
				onColumnVisibilityChange?.(next);
			},
		}),
		// Selection
		...(enableSelection && {
			onRowSelectionChange: (updater) => {
				const next = typeof updater === "function" ? updater(rowSelection ?? {}) : updater;
				onRowSelectionChange?.(next);
			},
			enableRowSelection: true,
		}),
		// Merge all state slices into a single object to avoid overwrites
		state: {
			...(enableSorting && { sorting: sorting ?? [] }),
			...(enableVisibility && { columnVisibility: columnVisibility ?? {} }),
			...(enableSelection && { rowSelection: rowSelection ?? {} }),
		},
	});

	const tableRef = useRef<ReactTable<TData>>(null);
	tableRef.current = table;

	const onTableReadyRef = useRef(onTableReady);
	onTableReadyRef.current = onTableReady;

	useEffect(() => {
		onTableReadyRef.current?.(tableRef.current!);
	}, []);

	const colSpan = columns.length;

	return (
		<>
			<Table className={className} aria-label={ariaLabel}>
				{showHeader && (
					<TableHeader className="bg-background">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								key={headerGroup.id}
								className="border-b-border hover:bg-transparent"
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
								className="bg-background border-b border-border last:border-0 hover:bg-transparent"
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
											<FolderOpen className="size-5 text-muted-foreground" />
										</EmptyMedia>
										<EmptyDescription className="text-sm text-muted-foreground">
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
									"bg-background border-b border-border hover:bg-muted/50",
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
			{enableSelection && (
				<div className="flex-1 text-sm text-muted-foreground px-2 py-2">
					{table.getFilteredSelectedRowModel().rows.length} of{" "}
					{table.getFilteredRowModel().rows.length} row(s) selected.
				</div>
			)}
		</>
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
