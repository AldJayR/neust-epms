import { DataTablePage } from "@/components/custom/data-table-page";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import type { FacultyAnalyticsItem } from "./schema";

export function FacultyParticipationTable({
	items,
	total,
	isLoading,
	page,
	pageSize,
	onPageChange,
	onSelectFaculty,
}: {
	items: FacultyAnalyticsItem[];
	total: number;
	isLoading: boolean;
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	onSelectFaculty: (userId: string) => void;
}) {
	const columns: DataTableColumnDef<FacultyAnalyticsItem>[] = [
		{
			accessorKey: "label",
			header: "Faculty",
			cell: ({ row }) => (
				<button
					type="button"
					className="font-medium text-primary underline"
					onClick={() => onSelectFaculty(row.original.userId)}
				>
					{row.original.label}
				</button>
			),
		},
		{ accessorKey: "campus", header: "Campus" },
		{ accessorKey: "department", header: "Department / unit" },
		{ accessorKey: "lead", header: "Leading" },
		{ accessorKey: "collaboration", header: "Collaborating" },
		{ accessorKey: "projects", header: "Active involvement" },
	];
	return (
		<DataTablePage
			columns={columns}
			data={items}
			total={total}
			isLoading={isLoading}
			page={page}
			pageSize={pageSize}
			onPageChange={onPageChange}
			ariaLabel="Faculty participation"
			emptyMessage="No records match the selected filters."
		/>
	);
}
