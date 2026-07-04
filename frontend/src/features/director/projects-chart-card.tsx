import { ClientOnly } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import * as React from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const ProjectsChart = React.lazy(() => import("./projects-chart"));

import type { DirectorChartPoint } from "@/lib/dashboard.functions";

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
		<div className="h-[370px] overflow-hidden rounded-[12px] border border-border bg-background shadow-[0px_1px_3px_0px var(--shadow-card)]">
			<div className="flex h-[72px] items-start justify-between border-b border-white px-6 pt-4 pb-3">
				<div className="leading-tight">
					<p className="text-sm font-semibold leading-5 text-foreground">
						Total Projects
					</p>
					<p className="text-sm leading-5 text-muted-foreground">
						per college/department
					</p>
				</div>
				<Select
					value={selectedCampus}
					onValueChange={(v) => {
						if (v) onCampusChange(v);
					}}
					modal={false}
				>
					<SelectTrigger className="h-9 w-[200px] rounded-md border border-border bg-background px-3 text-sm text-muted-foreground shadow-[0px_1px_1px_var(--shadow-card)]">
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
			<div className="h-[298px] px-6 pb-6 pt-10">
				<ClientOnly
					fallback={
						<div className="flex h-full items-center justify-center">
							<Loader2 className="size-8 animate-spin text-brand-primary/20" />
						</div>
					}
				>
					<React.Suspense
						fallback={
							<div className="flex h-full items-center justify-center">
								<Loader2 className="size-8 animate-spin text-brand-primary/20" />
							</div>
						}
					>
						<ProjectsChart chartData={bars} />
					</React.Suspense>
				</ClientOnly>
			</div>
		</div>
	);
}
