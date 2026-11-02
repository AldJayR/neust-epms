import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { DirectorOverviewResponse } from "@/types/dashboard";

export function FacultyInvolvementSummary({
	faculty,
	departments,
}: Pick<DirectorOverviewResponse, "faculty" | "departments">) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<h3>Faculty Involvement</h3>
				</CardTitle>
				<CardDescription>
					Participation in active projects within the selected project scope.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="grid grid-cols-3 gap-3">
					{[
						{ label: "Distinct faculty", value: faculty.faculty },
						{ label: "Leader involvements", value: faculty.leaders },
						{
							label: "Collaborator involvements",
							value: faculty.collaborators,
						},
					].map((metric) => (
						<div key={metric.label}>
							<p className="text-2xl font-semibold tabular-nums">
								{metric.value.toLocaleString()}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{metric.label}
							</p>
						</div>
					))}
				</div>
				<p className="text-xs text-muted-foreground">
					One person may participate in multiple projects. Involvements are
					memberships, not unique people; department faculty counts may overlap.
				</p>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Unit</TableHead>
							<TableHead className="text-right">Faculty</TableHead>
							<TableHead className="text-right">Lead</TableHead>
							<TableHead className="text-right">Collaborator</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{departments.map((unit) => (
							<TableRow key={unit.departmentId ?? "unassigned"}>
								<TableHead scope="row" title={unit.name}>
									{unit.code}
								</TableHead>
								<TableCell className="text-right tabular-nums">
									{unit.faculty}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{unit.leaders}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{unit.collaborators}
								</TableCell>
							</TableRow>
						))}
						{departments.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={4}
									className="py-4 text-center text-muted-foreground"
								>
									No faculty involvement in this scope.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
				<Link
					to="/faculty"
					search={{
						page: 1,
						limit: 10,
						load: "all",
						sort: "load-desc",
						trendMonths: 12,
					}}
					className="inline-flex items-center gap-1.5 rounded-sm text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					Open Faculty Directory
					<ArrowRight className="size-3.5" />
				</Link>
				<p className="text-xs text-muted-foreground">
					The directory shows current faculty workload across all project years.
				</p>
			</CardContent>
		</Card>
	);
}
