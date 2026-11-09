import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { MetricCard } from "@/components/custom/metric-card";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getCampusesFn } from "@/features/auth";
import {
	currentManilaYear,
	type DashboardYearProps,
} from "@/lib/dashboard-year";
import {
	DashboardPeriodNote,
	DashboardYearFilter,
} from "../../components/dashboard-year-filter";
import { directorOverviewQueryOptions } from "../../functions";
import { useDirectorDashboardState } from "../use-director-dashboard-state";
import { CollegeCampusProjectBreakdown } from "./college-campus-project-breakdown";
import {
	DashboardError,
	DashboardLoading,
	DashboardUpdatedAt,
} from "./dashboard-feedback";
import { FacultyInvolvementSummary } from "./faculty-involvement-summary";
import { ProjectCountLink } from "./project-count-link";
import { ProposalStages } from "./proposal-stages";

const ProjectsChartCard = lazy(
	() => import("@/features/projects/components/projects-chart-card"),
);

function ScopeSelect({
	label,
	value,
	options,
	onChange,
	disabled = false,
}: {
	label: string;
	value: number | undefined;
	options: { id: number; name: string }[];
	onChange: (value: number | undefined) => void;
	disabled?: boolean;
}) {
	const allLabel =
		label === "Campus" ? "All campuses" : "All colleges/departments";
	return (
		<div className="space-y-1.5">
			<p className="text-xs text-muted-foreground">{label}</p>
			<Select
				disabled={disabled}
				value={value === undefined ? "all" : String(value)}
				onValueChange={(next) => {
					if (next) onChange(next === "all" ? undefined : Number(next));
				}}
			>
				<SelectTrigger aria-label={label} className="w-full sm:w-56">
					<SelectValue>
						{value === undefined
							? allLabel
							: (options.find((option) => option.id === value)?.name ??
								`Selected unit (${value})`)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent alignItemWithTrigger={false}>
					<SelectItem value="all">{allLabel}</SelectItem>
					{options.map((option) => (
						<SelectItem key={option.id} value={String(option.id)}>
							{option.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

export function InstitutionalOverview({
	year,
	onYearChange,
	availableYears,
}: DashboardYearProps & { availableYears?: number[] }) {
	const { state, update } = useDirectorDashboardState();
	const { campusId } = state;
	const campuses = useQuery({
		queryKey: ["campuses"],
		queryFn: () => getCampusesFn(),
		staleTime: 60 * 60 * 1000,
	});
	const selectedCampus = campuses.data?.find(
		(campus) => campus.id === campusId,
	);
	const campusWide = selectedCampus?.isMainCampus === false;
	const departmentId = campusWide ? undefined : state.departmentId;
	const filters = { year, campusId, departmentId };
	const query = useQuery({
		...directorOverviewQueryOptions(filters),
		placeholderData: keepPreviousData,
	});
	const unavailableCampus =
		campuses.isSuccess && campusId !== undefined && !selectedCampus;
	useEffect(() => {
		if (unavailableCampus)
			void update({ campusId: undefined, departmentId: undefined });
		else if (campusWide && state.departmentId !== undefined)
			void update({ departmentId: undefined });
	}, [unavailableCampus, campusWide, state.departmentId, update]);
	const data = query.data;
	// Preserve lookup labels while loading, but never display old metrics as the new scope.
	const departmentOptions = data?.departmentOptions ?? [];
	const isLoading = query.isPending || query.isPlaceholderData;
	const campusName =
		campusId === undefined
			? departmentId === undefined
				? "All campuses"
				: "Main campuses"
			: (campuses.data?.find((campus) => campus.id === campusId)?.name ??
				`Campus ${campusId}`);
	const departmentName = campusWide
		? "Campus-wide totals"
		: departmentId === undefined
			? campusId === undefined
				? "All colleges and campuses"
				: "All colleges/departments"
			: departmentId === 0
				? "Unassigned"
				: (departmentOptions.find(
						(department) => department.id === departmentId,
					)?.name ?? `Unit ${departmentId}`);
	return (
		<section aria-labelledby="institutional-overview" className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-2">
					<h2
						id="institutional-overview"
						className="text-lg font-semibold text-heading"
					>
						Institutional Overview
					</h2>
					<p className="text-sm text-muted-foreground">
						Compare project delivery and participation within the selected
						scope.
					</p>
				</div>
				<DashboardUpdatedAt
					timestamp={query.dataUpdatedAt}
					refreshing={query.isFetching}
				/>
			</div>
			<div className="rounded-xl border border-border bg-card p-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
					<div className="space-y-1.5">
						<p className="text-xs text-muted-foreground">Project year</p>
						<DashboardYearFilter
							year={year}
							onYearChange={onYearChange}
							availableYears={availableYears}
						/>
					</div>
					<ScopeSelect
						label="Campus"
						value={campusId}
						options={campuses.data ?? []}
						disabled={campuses.isPending}
						onChange={(next) => {
							void update({ campusId: next, departmentId: undefined });
						}}
					/>
					{!campusWide && (
						<ScopeSelect
							label="College/Department"
							value={departmentId}
							options={[...departmentOptions, { id: 0, name: "Unassigned" }]}
							disabled={isLoading}
							onChange={(next) => void update({ departmentId: next })}
						/>
					)}
					<Button
						variant="ghost"
						size="sm"
						className="sm:ml-auto"
						onClick={() => {
							void update({
								campusId: undefined,
								departmentId: undefined,
								year: currentManilaYear(),
							});
						}}
					>
						<RotateCcw className="size-3.5" />
						Reset filters
					</Button>
				</div>
				<p className="mt-4 text-sm font-medium" aria-live="polite">
					{year} · {campusName} · {departmentName}
				</p>
			</div>
			<DashboardPeriodNote year={year} showDraftLink={false} />
			<p className="text-xs text-muted-foreground">
				Records without a complete scheduled project period are excluded from
				year-filtered summaries.
			</p>
			{campuses.isError && (
				<p role="alert" className="text-sm text-destructive">
					Campus choices could not load.{" "}
					<button
						type="button"
						className="underline"
						onClick={() => void campuses.refetch()}
					>
						Retry
					</button>
				</p>
			)}
			{isLoading ? (
				<DashboardLoading />
			) : query.isError && !data ? (
				<DashboardError
					section="the institutional overview"
					onRetry={() => void query.refetch()}
					retrying={query.isFetching}
				/>
			) : (
				data && (
					<>
						{query.isError && (
							<DashboardError
								section="the institutional overview"
								stale
								onRetry={() => void query.refetch()}
								retrying={query.isFetching}
							/>
						)}
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
							{[
								{
									label: "Total Projects",
									value: data.metrics.totalProjects,
									kind: "projects" as const,
									status: undefined,
									note: "Includes projects awaiting activation.",
								},
								{
									label: "Active Projects",
									value: data.metrics.activeProjects,
									kind: "projects" as const,
									status: "Active",
									note: `${data.metrics.ongoingProjects} ongoing · ${data.metrics.overdueProjects} overdue · ${data.metrics.pendingCompletionProjects} pending completion`,
								},
								{
									label: "Completed Projects",
									value: data.metrics.completedProjects,
									kind: "projects" as const,
									status: "Completed",
									note: "Completion approved by the Director.",
								},
								{
									label: "Submitted Proposals",
									value: data.metrics.submittedProposals,
									kind: "submitted" as const,
									status: undefined,
									note: "Distinct non-draft proposals, not submission events.",
								},
							].map((metric) => (
								<div key={metric.label} className="space-y-2">
									<ProjectCountLink
										filters={filters}
										kind={metric.kind}
										status={metric.status}
										label={`View ${metric.label.toLowerCase()}`}
									>
										<MetricCard
											label={metric.label}
											value={metric.value.toLocaleString()}
										/>
									</ProjectCountLink>
									<p className="px-1 text-xs text-muted-foreground">
										{metric.note}
									</p>
								</div>
							))}
							<div className="space-y-2">
								<MetricCard
									label="Progress Reports Submitted"
									value={data.progressReports.submitted.toLocaleString()}
								/>
								<p className="px-1 text-xs text-muted-foreground">
									{data.progressReports.due} due ·{" "}
									{data.progressReports.overdue} overdue
								</p>
							</div>
						</div>
						<CollegeCampusProjectBreakdown
							units={data.units}
							filters={filters}
							sort={state.departmentSort ?? "name"}
							onSortChange={(departmentSort) => void update({ departmentSort })}
						/>
						<div className="grid items-start gap-5 xl:grid-cols-2">
							<ProposalStages stages={data.proposalStages} filters={filters} />
							<FacultyInvolvementSummary
								faculty={data.faculty}
								units={data.units}
							/>
						</div>
						<Suspense fallback={<DashboardLoading />}>
							<ProjectsChartCard
								year={year}
								chartData={data.chartData}
								chartMonths={data.chartMonths}
								campuses={campuses.data ?? []}
								selectedCampus={campusId ?? "all"}
								onCampusChange={(next) => {
									void update({
										campusId: next === "all" ? undefined : next,
										departmentId: undefined,
									});
								}}
								showCampusFilter={false}
							/>
						</Suspense>
					</>
				)
			)}
		</section>
	);
}
