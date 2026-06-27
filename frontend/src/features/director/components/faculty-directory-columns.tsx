import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type DataTableColumnDef } from "@/components/ui/data-table";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import type { FacultyInvolvement } from "@/lib/dashboard.functions";
import { formatAcademicRank } from "@/lib/utils";

export function getFacultyDirectoryColumns(
	page: number,
	limit: number,
): DataTableColumnDef<FacultyInvolvement>[] {
	return [
		{
			id: "rank",
			header: () => <div className="text-center">Rank</div>,
			headerClassName:
				"w-[60px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-center text-sm font-bold text-foreground",
			cell: ({ row }) => (page - 1) * limit + row.index + 1,
		},
		{
			id: "name",
			header: "Faculty Name",
			headerClassName:
				"w-[300px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3",
			cell: ({ row }) => {
				const faculty = row.original;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="size-9">
							<AvatarFallback className="bg-muted text-muted-foreground">
								{faculty.firstName?.charAt(0) ?? ""}
								{faculty.lastName?.charAt(0) ?? ""}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col text-left">
							<span className="text-sm font-normal text-foreground">
								{faculty.firstName} {faculty.lastName}
							</span>
							<span className="text-xs text-muted-foreground">
								{formatAcademicRank(faculty.academicRank)}
							</span>
						</div>
					</div>
				);
			},
		},
		{
			id: "college",
			header: "Department",
			headerClassName:
				"w-[200px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-sm",
			cell: ({ row }) => {
				const faculty = row.original;
				return (
					<div className="flex flex-col text-left">
						<span className="font-normal text-foreground">
							{faculty.departmentCode ?? faculty.college}
						</span>
						{faculty.isMainCampus === false && faculty.campusName && (
							<span className="text-xs text-muted-foreground leading-4 mt-0.5">
								{faculty.campusName}
							</span>
						)}
					</div>
				);
			},
		},
		{
			id: "leadProjects",
			header: () => <div className="text-right">Lead Projects</div>,
			headerClassName:
				"w-[120px] px-4 py-2 text-right text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-right text-sm font-medium text-foreground",
			cell: ({ row }) => row.original.leadProjects,
		},
		{
			id: "collaboratorProjects",
			header: () => <div className="text-right">Collaborator Projects</div>,
			headerClassName:
				"w-[150px] px-4 py-2 text-right text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-right text-sm font-medium text-foreground",
			cell: ({ row }) => row.original.collaboratorProjects,
		},
		{
			id: "totalInvolvement",
			header: () => <div className="text-right">Total Involvement</div>,
			headerClassName:
				"w-[150px] px-4 py-2 text-right text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-right text-sm font-medium text-foreground",
			cell: ({ row }) => row.original.totalInvolvement,
		},
		createActionsColumn(),
	];
}
