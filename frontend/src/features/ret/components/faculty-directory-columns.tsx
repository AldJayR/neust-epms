import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import { StatusBadge } from "@/components/ui/status-badge";
import type { FacultyInvolvement } from "@/lib/dashboard.functions";
import { formatAcademicRank } from "@/lib/utils";

export const retFacultyDirectoryColumns: DataTableColumnDef<FacultyInvolvement>[] =
	[
		{
			id: "name",
			header: "Faculty Name",
			headerClassName:
				"w-[320px] px-4 py-2 text-sm font-medium text-muted-foreground",
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
						<span className="text-sm font-normal text-foreground">
							{faculty.firstName} {faculty.lastName}
						</span>
					</div>
				);
			},
		},
		{
			id: "rank",
			header: "Rank",
			headerClassName:
				"w-[200px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3",
			cell: ({ row }) => {
				const faculty = row.original;
				return (
					<Badge
						variant="outline"
						className="rounded-lg border-border px-2 py-0.5 font-medium text-muted-foreground bg-background"
					>
						{formatAcademicRank(faculty.academicRank)}
					</Badge>
				);
			},
		},
		{
			id: "totalProjects",
			header: "Total Projects",
			headerClassName:
				"w-[150px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-sm text-foreground",
			cell: ({ row }) => row.original.totalInvolvement,
		},
		{
			id: "status",
			header: "Account Status",
			headerClassName:
				"w-[150px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3",
			cell: ({ row }) => (
				<StatusBadge
					status={row.original.isActive ? "Active" : "Deactivated"}
					variant="outline"
				/>
			),
		},
		createActionsColumn(),
	];
