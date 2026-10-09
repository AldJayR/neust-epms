import { Link } from "@tanstack/react-router";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	currentManilaYear,
	type DashboardYearProps,
} from "@/lib/dashboard-year";

export function DashboardYearFilter({
	year,
	onYearChange,
	availableYears = [],
}: DashboardYearProps & { availableYears?: number[] }) {
	const years = [
		...new Set([currentManilaYear(), year, ...availableYears]),
	].sort((a, b) => b - a);
	return (
		<div className="flex items-center gap-2">
			<span className="text-sm text-muted-foreground">Year</span>
			<Select
				value={String(year)}
				onValueChange={(value) => {
					if (value) onYearChange(Number(value));
				}}
			>
				<SelectTrigger aria-label="Project period year" className="w-28">
					<SelectValue>{year}</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{years.map((option) => (
						<SelectItem key={option} value={String(option)}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

export function DashboardPeriodNote({
	year,
	showDraftLink = true,
}: { year: number; showDraftLink?: boolean }) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
			<p>
				Current statuses of proposals and projects scheduled during {year}.
				Cross-year periods appear in each applicable year.
			</p>
			{showDraftLink && (
				<p>
					Drafts without project dates are available on the{" "}
					<Link
						to="/projects"
						search={{ page: 1, limit: 10, myProjectsOnly: true }}
						className="text-primary underline"
					>
						projects page
					</Link>.
				</p>
			)}
		</div>
	);
}
