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
	{ value: "name", label: "College / campus name" },
	{ value: "active", label: "Active projects" },
	{ value: "completed", label: "Completed projects" },
	{ value: "total", label: "Total projects" },
] as const;

export function CollegeCampusProjectBreakdown({
	units,
	filters,
	sort,
	onSortChange,
}: {
	units: DirectorOverviewResponse["units"];
	filters: DirectorOverviewFilters;
	sort: DepartmentSort;
	onSortChange: (sort: DepartmentSort) => void;
}) {
	const maximum = Math.max(1, ...units.map((unit) => unit.totalProjects));
	const orderedUnits = [...units].sort((a, b) => {
		const key =
			sort === "active"
				? "activeProjects"
				: sort === "completed"
					? "completedProjects"
					: "totalProjects";
		return (
			(sort === "name" ? 0 : b[key] - a[key]) ||
			a.name.localeCompare(b.name) ||
			a.campusName.localeCompare(b.campusName)
		);
	});
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<h3>Projects by College and Campus</h3>
				</CardTitle>
				<CardDescription>
					Colleges/departments at General Tinio Street and Sumacab; campus-wide
					totals for other campuses. Select a count to view matching records.
				</CardDescription>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<span className="text-xs text-muted-foreground">Sort by</span>
					<Select
						value={sort}
						onValueChange={(value) => {
							if (value) onSortChange(value as DepartmentSort);
						}}
					>
						<SelectTrigger
							aria-label="Sort colleges and campuses by"
							className="w-52"
						>
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
							<TableHead>College / Campus</TableHead>
							<TableHead className="text-right">Active</TableHead>
							<TableHead className="text-right">Completed</TableHead>
							<TableHead className="text-right">Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{orderedUnits.map((unit) => (
							<TableRow key={unit.key}>
								<TableHead scope="row" className="min-w-44 py-3 text-left">
									<p className="font-medium">
										{unit.isMainCampus
											? `${unit.code} · ${unit.campusName}`
											: unit.campusName}
									</p>
									<p className="text-xs text-muted-foreground">
										{unit.isMainCampus ? unit.name : "Campus-wide totals"}
									</p>
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
												campusId: unit.campusId,
												departmentId: unit.isMainCampus
													? (unit.departmentId ?? 0)
													: undefined,
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
						{units.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={4}
									className="py-8 text-center text-muted-foreground"
								>
									No college or campus records match this scope.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
