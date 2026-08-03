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
	chartMonths: string[];
	campuses: { id: number; name: string }[];
	selectedCampus: number | "all";
	onCampusChange: (campus: number | "all") => void;
}

function formatMonthLabel(month: string): string {
	const [year, monthNumber] = month.split("-").map(Number);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export default function ProjectsChartCard({
	chartData,
	chartMonths,
	campuses,
	selectedCampus,
	onCampusChange,
}: ProjectsChartCardProps) {
	const filtered =
		selectedCampus === "all"
			? chartData
			: chartData.filter((point) => point.campusId === selectedCampus);
	const monthTotals = new Map<string, number>();
	for (const month of chartMonths) monthTotals.set(month, 0);
	for (const point of filtered) {
		monthTotals.set(
			point.month,
			(monthTotals.get(point.month) ?? 0) + point.value,
		);
	}
	const trend = chartMonths.map((month) => ({
		label: formatMonthLabel(month),
		value: monthTotals.get(month) ?? 0,
	}));

	const campusSelectValue =
		selectedCampus === "all" ? "all" : String(selectedCampus);

	const handleCampusChange = (value: string | null) => {
		if (!value) return;
		if (value === "all") {
			onCampusChange("all");
			return;
		}
		const campusId = Number(value);
		if (Number.isInteger(campusId)) onCampusChange(campusId);
	};

	const hasData = trend.some((point) => point.value > 0);

	return (
		<div className="flex min-h-[340px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_0_var(--shadow-card)]">
			<div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:h-[72px] sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:pt-4 sm:pb-3">
				<div className="leading-tight">
					<p className="text-sm font-semibold leading-5 text-foreground">
						Project Approvals
					</p>
					<p className="text-sm leading-5 text-muted-foreground">
						Approved projects per month · last 12 months
					</p>
				</div>
				<Select
					value={campusSelectValue}
					onValueChange={handleCampusChange}
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
						<SelectItem value="all">All campuses</SelectItem>
						{campuses.map((campus) => (
							<SelectItem key={campus.id} value={String(campus.id)}>
								{campus.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex min-h-[260px] flex-1 px-4 pb-4 pt-6 sm:h-[298px] sm:px-6 sm:pb-6 sm:pt-10">
				{chartMonths.length === 0 ? (
					<div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
						No approval history available.
					</div>
				) : !hasData ? (
					<div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
						No projects were approved in the last 12 months.
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
							<ProjectsChart chartData={trend} />
						</React.Suspense>
					</ClientOnly>
				)}
			</div>
		</div>
	);
}
