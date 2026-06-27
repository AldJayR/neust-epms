import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";

interface CreateActionsColumnOptions<TData> {
	/** Custom cell renderer for the actions column */
	cell?: DataTableColumnDef<TData>["cell"];
}

export function createActionsColumn<TData>(
	options?: CreateActionsColumnOptions<TData>,
): DataTableColumnDef<TData> {
	return {
		id: "actions",
		header: "",
		headerClassName: "w-[50px]",
		cellClassName: "px-4 py-3 text-right",
		enableSorting: false,
		cell:
			options?.cell ??
			(() => (
				<Button
					variant="ghost"
					size="icon"
					className="size-8 text-muted-foreground"
					aria-label="More actions"
				>
					<EllipsisVertical className="size-4" />
				</Button>
			)),
	};
}
