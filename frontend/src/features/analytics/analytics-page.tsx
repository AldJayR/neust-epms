import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Info } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { MetricCard } from "@/components/custom/metric-card";
import { PageCard } from "@/components/custom/page-card";
import { PageHeader } from "@/components/custom/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getCampusesFn, getDepartmentsFn } from "@/features/auth";
import type { AuthUser } from "@/lib/auth";
import { BreakdownCard } from "./breakdown-card";
import { FacultyParticipationTable } from "./faculty-participation-table";
import { analyticsQueryOptions, exportAnalyticsFn } from "./functions";
import { ProjectAnalyticsTable } from "./project-analytics-table";
import type { AnalyticsFilters, AnalyticsView } from "./schema";

const titles = {
	reach: "Trainee Reach",
	participation: "Faculty Participation",
	coverage: "Coverage Explorer",
};
const groups = {
	program: "Banner program",
	sector: "Beneficiary sector",
	sdg: "SDG",
	service: "Extension service",
};

function FilterSelect({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
}) {
	const id = useId();
	return (
		<Field className="min-w-40 w-auto gap-1">
			<FieldLabel htmlFor={id} className="text-muted-foreground">
				{label}
			</FieldLabel>
			<Select
				value={value}
				onValueChange={(selected) => {
					if (typeof selected === "string") onChange(selected);
				}}
			>
				<SelectTrigger id={id} className="w-full">
					<SelectValue>
						{options.find((option) => option.value === value)?.label ?? label}
					</SelectValue>
				</SelectTrigger>
				<SelectContent alignItemWithTrigger={false}>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</Field>
	);
}

export function AnalyticsPage({
	user,
	view,
	filters,
	onFiltersChange,
	personal = false,
}: {
	user: AuthUser;
	view: AnalyticsView;
	filters: AnalyticsFilters;
	onFiltersChange: (next: Partial<AnalyticsFilters>) => void;
	personal?: boolean;
}) {
	const { data, isPending, error, isFetching, refetch } = useQuery(
		analyticsQueryOptions(view, filters),
	);
	const campuses = useQuery({ queryKey: ["campuses"], queryFn: getCampusesFn });
	const departments = useQuery({
		queryKey: ["departments"],
		queryFn: getDepartmentsFn,
	});
	const [exporting, setExporting] = useState(false);
	const yearInputId = useId();
	const showFaculty =
		view === "participation" && !personal && !filters.facultyId;
	const change = (next: Partial<AnalyticsFilters>) =>
		onFiltersChange({ ...next, page: 1 });
	const download = async () => {
		setExporting(true);
		try {
			const csv = await exportAnalyticsFn({ data: { view, filters } });
			const url = URL.createObjectURL(
				new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
			);
			const link = document.createElement("a");
			link.href = url;
			link.download = `extension-${view}-${filters.year}.csv`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (failure) {
			toast.error(failure instanceof Error ? failure.message : "Export failed");
		} finally {
			setExporting(false);
		}
	};
	return (
		<div className="flex flex-col gap-6">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							render={
								<Link to="/dashboard" search={{ page: 1, pageSize: 10 }} />
							}
						>
							Dashboard
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Analytics</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<PageHeader
				title={
					<div>
						<h1 className="text-2xl font-semibold text-heading">
							{personal ? "My Contributions" : titles[view]}
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{data?.scopeLabel ?? "Extension reporting"}
						</p>
					</div>
				}
				actions={
					<div className="flex flex-wrap gap-2">
						{showFaculty && (
							<Link
								to="/faculty"
								search={{
									page: 1,
									limit: 10,
									load: "all",
									sort: "name",
									trendMonths: 12,
								}}
								className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
							>
								Open faculty directory
							</Link>
						)}
						<Button
							variant="outline"
							disabled={exporting || !data || isFetching}
							onClick={() => void download()}
						>
							{exporting ? "Exporting…" : "Export filtered CSV"}
						</Button>
					</div>
				}
			/>
			{!personal && (
				<nav className="flex flex-wrap gap-2" aria-label="Analytics views">
					{(Object.keys(titles) as AnalyticsView[]).map((key) => (
						<Link
							key={key}
							to="/analytics/$view"
							params={{ view: key }}
							search={{
								...filters,
								page: 1,
								category: undefined,
								facultyId: undefined,
								missing: "false",
							}}
							className={`rounded-md border px-4 py-2 text-sm ${view === key ? "bg-primary text-primary-foreground" : "bg-background"}`}
							aria-current={view === key ? "page" : undefined}
						>
							{titles[key]}
						</Link>
					))}
				</nav>
			)}
			<PageCard className="flex flex-wrap items-end gap-3 p-4">
				{!showFaculty && (
					<Field className="w-auto gap-1">
						<FieldLabel htmlFor={yearInputId} className="text-muted-foreground">
							{view === "reach" ? "Closure year" : "Project creation year"}
						</FieldLabel>
						<Input
							id={yearInputId}
							className="w-28"
							type="number"
							min={2000}
							max={2200}
							value={filters.year}
							onChange={(event) => {
								const year = Number(event.target.value);
								if (year >= 2000 && year <= 2200) change({ year });
							}}
						/>
					</Field>
				)}
				{!personal && user.roleName === "Director" && (
					<FilterSelect
						label="Campus"
						value={filters.campusId?.toString() ?? "all"}
						options={[
							{ value: "all", label: "All campuses" },
							...(campuses.data ?? []).map((item) => ({
								value: String(item.id),
								label: item.name,
							})),
						]}
						onChange={(value) =>
							change({
								campusId: value === "all" ? undefined : Number(value),
								departmentId: undefined,
							})
						}
					/>
				)}
				{!personal && user.roleName === "Director" && (
					<FilterSelect
						label="Department"
						value={filters.departmentId?.toString() ?? "all"}
						options={[
							{ value: "all", label: "All departments" },
							...(departments.data ?? []).map((item) => ({
								value: String(item.id),
								label: item.name,
							})),
						]}
						onChange={(value) =>
							change({
								departmentId: value === "all" ? undefined : Number(value),
							})
						}
					/>
				)}
				{view === "coverage" && (
					<FilterSelect
						label="Group by"
						value={filters.groupBy}
						options={Object.entries(groups).map(([value, label]) => ({
							value,
							label,
						}))}
						onChange={(value) =>
							change({
								groupBy: value as AnalyticsFilters["groupBy"],
								category: undefined,
							})
						}
					/>
				)}
				{view === "reach" && (
					<FilterSelect
						label="Count availability"
						value={filters.missing}
						options={[
							{ value: "false", label: "All closed projects" },
							{ value: "true", label: "Missing counts" },
						]}
						onChange={(value) => change({ missing: value as "true" | "false" })}
					/>
				)}
				<Button
					variant="ghost"
					onClick={() =>
						change({
							campusId: undefined,
							departmentId: undefined,
							category: undefined,
							facultyId: undefined,
							missing: "false",
						})
					}
				>
					Reset filters
				</Button>
			</PageCard>
			<p className="text-sm text-muted-foreground">
				{data?.dateBasis}
				{isFetching && !isPending ? " · Updating…" : ""}
			</p>
			{error && (
				<Alert variant="destructive">
					<AlertCircle />
					<AlertTitle>Reports couldn't be loaded</AlertTitle>
					<AlertDescription className="space-y-3">
						<p>Please try again.</p>
						<Button variant="outline" onClick={() => void refetch()}>
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			)}
			{!error && (
				<>
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{isPending
							? [1, 2, 3, 4].map((key) => (
									<Skeleton key={key} className="h-28 rounded-lg" />
								))
							: data?.metrics.map((metric) => (
									<div key={metric.label}>
										<MetricCard
											label={metric.label}
											value={
												metric.value === null
													? "Not applicable"
													: metric.value.toLocaleString()
											}
										/>
										<p className="mt-1 text-xs text-muted-foreground">
											{metric.description}
										</p>
									</div>
								))}
					</div>
					{view === "reach" && (
						<p className="rounded-md border p-3 text-sm">
							Official totals include Director-approved closed projects only.
							People are counted once per project and may appear in multiple
							projects. Missing counts are unknown, not zero.
						</p>
					)}
					{view === "reach" && Boolean(data?.undatedProjects) && (
						<Alert role="note">
							<Info />
							<AlertTitle>Some closure dates are missing</AlertTitle>
							<AlertDescription>
								{data?.undatedProjects} closed projects in this scope have no
								recorded closure date. They aren't included in the selected
								year's totals.
							</AlertDescription>
						</Alert>
					)}
					{view === "coverage" && (
						<p className="rounded-md border p-3 text-sm">
							Projects can support more than one category. Select a category to
							see its projects. Beneficiary sectors show who the projects
							intended to serve.
						</p>
					)}
					{view === "participation" && (
						<p className="rounded-md border p-3 text-sm">
							Project involvement shows the projects faculty lead or support.
							Trainee counts belong to the whole project, not to individual
							faculty members.
						</p>
					)}
					{data && !personal && view !== "participation" && (
						<BreakdownCard
							view={view}
							title={
								view === "coverage"
									? groups[filters.groupBy]
									: filters.campusId
										? "Department breakdown"
										: "Campus breakdown"
							}
							groups={data.groups}
							onSelect={(key) =>
								change(
									view === "coverage"
										? { category: key }
										: filters.campusId
											? { departmentId: Number(key) }
											: { campusId: Number(key), departmentId: undefined },
								)
							}
						/>
					)}
					{(filters.category || filters.facultyId) && (
						<Button
							variant="outline"
							className="self-start"
							onClick={() =>
								change({ category: undefined, facultyId: undefined })
							}
						>
							Back to all records
						</Button>
					)}
					{showFaculty ? (
						<FacultyParticipationTable
							items={
								data?.items.filter((item) => item.kind === "faculty") ?? []
							}
							total={data?.total ?? 0}
							isLoading={isPending}
							page={filters.page}
							pageSize={filters.limit}
							onPageChange={(page) => onFiltersChange({ page })}
							onSelectFaculty={(facultyId) => change({ facultyId })}
						/>
					) : (
						<ProjectAnalyticsTable
							items={
								data?.items.filter((item) => item.kind === "project") ?? []
							}
							total={data?.total ?? 0}
							isLoading={isPending}
							page={filters.page}
							pageSize={filters.limit}
							onPageChange={(page) => onFiltersChange({ page })}
							showProjectRole={view === "participation"}
						/>
					)}
				</>
			)}
		</div>
	);
}
