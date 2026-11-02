import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { DirectorDashboardState } from "@/lib/director-dashboard-state";
import type {
	DirectorOverviewFilters,
	DirectorOverviewResponse,
} from "@/types/dashboard";
import { ProjectCountLink } from "./project-count-link";

type DepartmentSort = NonNullable<DirectorDashboardState["departmentSort"]>;
const sortOptions = [
	{ value: "name", label: "Department name" },
	{ value: "active", label: "Active projects" },
	{ value: "completed", label: "Completed projects" },
	{ value: "total", label: "Total projects" },
] as const;

export function DepartmentProjectBreakdown({
	departments,
	filters,
	sort,
	onSortChange,
}: {
	departments: DirectorOverviewResponse["departments"];
	filters: DirectorOverviewFilters;
	sort: DepartmentSort;
	onSortChange: (sort: DepartmentSort) => void;
}) {
	const maximum = Math.max(1, ...departments.map((unit) => unit.totalProjects));
	const orderedDepartments = [...departments].sort((a, b) => {
		const key =
			sort === "active"
				? "activeProjects"
				: sort === "completed"
					? "completedProjects"
					: "totalProjects";
		return (
			(sort === "name" ? 0 : b[key] - a[key]) || a.name.localeCompare(b.name)
		);
	});
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<h3>Projects by College/Department</h3>
				</CardTitle>
				<CardDescription>
					Projects are attributed to their implementing unit. Bars compare total
					projects; select a count to view matching records.
				</CardDescription>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<span className="text-xs text-muted-foreground">Sort by</span>
					<Select
						value={sort}
						onValueChange={(value) => {
							if (value) onSortChange(value as DepartmentSort);
						}}
					>
						<SelectTrigger aria-label="Sort departments by" className="w-52">
							<SelectValue>
								{sortOptions.find((option) => option.value === sort)?.label}
							</SelectValue>
						</SelectTrigger>
						<SelectContent alignItemWithTrigger={false}>
							{sortOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Implementing unit</TableHead>
							<TableHead className="text-right">Active</TableHead>
							<TableHead className="text-right">Completed</TableHead>
							<TableHead className="text-right">Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{orderedDepartments.map((unit) => (
							<TableRow key={unit.departmentId ?? "unassigned"}>
								<TableHead scope="row" className="min-w-44 py-3 text-left">
									<p className="font-medium">{unit.code}</p>
									<p className="text-xs text-muted-foreground">{unit.name}</p>
									<div
										className="mt-2 h-1.5 max-w-56 overflow-hidden rounded-full bg-muted"
										aria-hidden="true"
									>
										<div
											className="h-full rounded-full bg-primary/65"
											style={{
												width: `${(unit.totalProjects / maximum) * 100}%`,
											}}
										/>
									</div>
								</TableHead>
								{[
									{
										count: unit.activeProjects,
										status: "Active",
										name: "active",
									},
									{
										count: unit.completedProjects,
										status: "Completed",
										name: "completed",
									},
									{
										count: unit.totalProjects,
										status: undefined,
										name: "total",
									},
								].map((cell) => (
									<TableCell
										key={cell.name}
										className="text-right tabular-nums"
									>
										<ProjectCountLink
											filters={{
												...filters,
												departmentId: unit.departmentId ?? 0,
											}}
											status={cell.status}
											label={`View ${cell.name} projects for ${unit.name}`}
										>
											{cell.count.toLocaleString()}
										</ProjectCountLink>
									</TableCell>
								))}
							</TableRow>
						))}
						{departments.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={4}
									className="py-8 text-center text-muted-foreground"
								>
									No implementing units match this scope.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
