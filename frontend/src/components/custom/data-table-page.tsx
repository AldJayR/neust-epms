import type {
	Table as ReactTable,
	RowSelectionState,
	SortingState,
	VisibilityState,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchInput } from "@/components/ui/search-input";
import { PageCard } from "./page-card";

interface DataTablePageProps<TData> {
	data: TData[];
	total: number;
	isLoading: boolean;
	columns: DataTableColumnDef<TData>[];
	emptyMessage?: string;
	ariaLabel?: string;
	onRowClick?: (item: TData) => void;
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	search?: string;
	onSearch?: (search: string) => void;
	searchPlaceholder?: string;
	filters?: ReactNode;
	title?: ReactNode;
	actions?: ReactNode;
	activeFilters?: Record<string, unknown>;
	cardClassName?: string;
	cardHeader?: ReactNode;
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

export function DataTablePage<TData>({
	data,
	total,
	isLoading,
	columns,
	emptyMessage,
	ariaLabel,
	onRowClick,
	page,
	pageSize,
	onPageChange,
	search,
	onSearch,
	searchPlaceholder,
	filters,
	title,
	actions,
	activeFilters,
	cardClassName,
	cardHeader,
	sorting,
	onSortingChange,
	columnVisibility,
	onColumnVisibilityChange,
	rowSelection,
	onRowSelectionChange,
	enableSorting,
	enableVisibility,
	enableSelection,
	onTableReady,
}: DataTablePageProps<TData>) {
	return (
		<div className="flex flex-col gap-8">
			{(title || actions) && (
				<div className="flex items-start justify-between">
					{title && <div>{title}</div>}
					{actions && <div>{actions}</div>}
				</div>
			)}

			{(onSearch || filters) && (
				<div className="flex items-center justify-between gap-4">
					{onSearch && (
						<SearchInput
							value={search ?? ""}
							onChange={onSearch}
							placeholder={searchPlaceholder}
							ariaLabel={searchPlaceholder}
							className="max-w-[352px]"
						/>
					)}
					{filters && <div className="flex items-center gap-2">{filters}</div>}
				</div>
			)}

			<PageCard className={cardClassName}>
				{cardHeader}
				<DataTable
					columns={columns}
					data={data}
					isLoading={isLoading}
					emptyMessage={emptyMessage}
					ariaLabel={ariaLabel}
					onRowClick={onRowClick}
					activeFilters={activeFilters}
					sorting={sorting}
					onSortingChange={onSortingChange}
					columnVisibility={columnVisibility}
					onColumnVisibilityChange={onColumnVisibilityChange}
					rowSelection={rowSelection}
					onRowSelectionChange={onRowSelectionChange}
					enableSorting={enableSorting}
					enableVisibility={enableVisibility}
					enableSelection={enableSelection}
					onTableReady={onTableReady}
				/>
			</PageCard>

			<PaginationBar
				page={page}
				totalPages={Math.ceil(total / pageSize)}
				onPageChange={onPageChange}
				total={total}
				limit={pageSize}
				isLoading={isLoading}
			/>
		</div>
	);
}
