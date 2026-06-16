import { Loader2 } from "lucide-react";
import type * as React from "react";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";

interface DataTableColumn {
	key: string;
	label: string;
	className?: string;
}

interface DataTableProps<T> {
	columns: DataTableColumn[];
	data: T[];
	renderRow: (item: T, index: number) => React.ReactNode;
	isLoading?: boolean;
	isEmpty?: boolean;
	error?: string | null;
	emptyMessage?: string;
	errorMessage?: string;
	colSpan: number;
	showHeader?: boolean;
	className?: string;
	ariaLabel?: string;
}

function DataTable<T>({
	columns,
	data,
	renderRow,
	isLoading = false,
	isEmpty = false,
	error = null,
	emptyMessage = "No records found.",
	errorMessage = "Something went wrong.",
	colSpan,
	showHeader = true,
	className,
	ariaLabel,
}: DataTableProps<T>) {
	return (
		<Table className={className} aria-label={ariaLabel}>
			{showHeader && (
				<TableHeader className="bg-white">
					<TableRow className="border-b-[#e5e5e5] hover:bg-transparent">
						{columns.map((col) => (
							<TableHead key={col.key} className={col.className}>
								{col.label}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
			)}
			<TableBody>
				{isLoading ? (
					<TableRow>
						<TableCell
							colSpan={colSpan}
							className="h-24 text-center"
						>
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
				) : isEmpty ? (
					<TableRow>
						<TableCell
							colSpan={colSpan}
							className="h-24 text-center text-muted-foreground"
						>
							{emptyMessage}
						</TableCell>
					</TableRow>
				) : (
					data.map((item, index) => renderRow(item, index))
				)}
			</TableBody>
		</Table>
	);
}

export { DataTable };
export type { DataTableColumn, DataTableProps };
