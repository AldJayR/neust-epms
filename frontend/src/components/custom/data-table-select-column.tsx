import type { DataTableColumnDef } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";

export function createSelectColumn<TData>(): DataTableColumnDef<TData> {
	return {
		id: "select",
		header: ({ table }) => (
			<div className="flex justify-center">
				<Checkbox
					checked={table.getIsAllPageRowsSelected()}
					indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
					onCheckedChange={(value) =>
						table.toggleAllPageRowsSelected(!!value)
					}
					aria-label="Select all"
				/>
			</div>
		),
		headerClassName: "w-[50px] px-4 text-center",
		cellClassName: "px-4 text-center",
		cell: ({ row }) => (
			<div className="flex justify-center">
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label={`Select row`}
				/>
			</div>
		),
		enableSorting: false,
		enableHiding: false,
	};
}
