import { ClientOnly } from "@tanstack/react-router";
import * as React from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const ProjectsChart = React.lazy(() => import("./projects-chart"));

import type { DirectorChartPoint } from "@/types/dashboard";

interface ProjectsChartCardProps {
	chartData: DirectorChartPoint[];
	campuses: { id: number; name: string }[];
	selectedCampus: string;
	onCampusChange: (campus: string) => void;
}

export default function ProjectsChartCard({
	chartData,
	campuses,
	selectedCampus,
	onCampusChange,
}: ProjectsChartCardProps) {
	const filtered = selectedCampus
		? chartData.filter((d) => d.label === selectedCampus)
		: chartData;

	const deptMap = new Map<string, number>();
	for (const d of filtered) {
		deptMap.set(
			d.departmentCode,
			(deptMap.get(d.departmentCode) ?? 0) + d.value,
		);
	}
	const bars = Array.from(deptMap, ([label, value]) => ({ label, value })).sort(
		(a, b) => b.value - a.value,
	);

	return (
		<div className="flex min-h-[340px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_0_var(--shadow-card)]">
			<div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:h-[72px] sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:pt-4 sm:pb-3">
				<div className="leading-tight">
					<p className="text-sm font-semibold leading-5 text-foreground">
						Total Projects
					</p>
					<p className="text-sm leading-5 text-muted-foreground">
						per college or department
					</p>
				</div>
				<Select
					value={selectedCampus}
					onValueChange={(v) => {
						if (v) onCampusChange(v);
					}}
					modal={false}
				>
						<SelectTrigger className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-muted-foreground shadow-sm sm:w-[200px]">
						<SelectValue placeholder="Select campus..." />
					</SelectTrigger>
					<SelectContent
						side="bottom"
						sideOffset={8}
						align="start"
						alignItemWithTrigger={false}
					>
						{campuses.map((campus) => (
							<SelectItem key={campus.id} value={campus.name}>
								{campus.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex min-h-[260px] flex-1 px-4 pb-4 pt-6 sm:h-[298px] sm:px-6 sm:pb-6 sm:pt-10">
				{bars.length === 0 ? (
					<div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
						No project data for the selected campus.
					</div>
				) : (
				<ClientOnly
					fallback={
						<div className="h-full w-full animate-pulse rounded-lg bg-muted/50" />
					}
				>
					<React.Suspense
						fallback={
							<div className="h-full w-full animate-pulse rounded-lg bg-muted/50" />
						}
					>
						<ProjectsChart chartData={bars} />
					</React.Suspense>
				</ClientOnly>
				)}
			</div>
		</div>
	);
}
