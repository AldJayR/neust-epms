import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import { PageCard } from "@/components/custom/page-card";
import { PageHeader } from "@/components/custom/page-header";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { getCampusesFn, getDepartmentsFn } from "@/features/auth";
import { ReportDocumentButton } from "@/features/reports/components/report-document-button";
import type { AuthUser } from "@/lib/auth";
import { BreakdownCard } from "./breakdown-card";
import { analyticsQueryOptions, exportAnalyticsFn } from "./functions";
import type { AnalyticsFilters, AnalyticsItem, AnalyticsView } from "./schema";
import { TraineeCorrectionForm } from "./trainee-correction-form";

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
	return (
		<label className="flex min-w-40 flex-col gap-1 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<select
				className="h-9 rounded-md border border-input bg-background px-3"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</label>
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
	const [correction, setCorrection] = useState<AnalyticsItem | null>(null);
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
	const columns: DataTableColumnDef<AnalyticsItem>[] = [
		{
			accessorKey: "label",
			header: showFaculty ? "Faculty" : "Project",
			cell: ({ row }) =>
				row.original.proposalId ? (
					<Link
						className="font-medium text-primary underline"
						to="/projects/$projectId"
						params={{ projectId: row.original.proposalId }}
					>
						{row.original.label}
					</Link>
				) : (
					<button
						type="button"
						className="font-medium text-primary underline"
						onClick={() =>
							change({ facultyId: row.original.userId ?? undefined })
						}
					>
						{row.original.label}
					</button>
				),
		},
		{ accessorKey: "campus", header: "Campus" },
		{ accessorKey: "department", header: "Lead department / unit" },
		...((showFaculty
			? [
					{ accessorKey: "lead", header: "Leading" },
					{ accessorKey: "collaboration", header: "Collaborating" },
					{ accessorKey: "projects", header: "Active involvement" },
				]
			: [
					{ accessorKey: "status", header: "Status" },
					...(view === "participation"
						? [
								{
									id: "contribution",
									header: "Project role",
									cell: ({ row }: { row: { original: AnalyticsItem } }) =>
										row.original.lead ? "Project leader" : "Collaborator",
								},
							]
						: []),
					{
						accessorKey: "closedAt",
						header: "Closure date",
						cell: ({ row }: { row: { original: AnalyticsItem } }) =>
							row.original.closedAt
								? new Date(row.original.closedAt).toLocaleDateString("en-PH", {
										timeZone: "Asia/Manila",
									})
								: "—",
					},
					{
						accessorKey: "traineeCount",
						header: "Approved project reach",
						cell: ({ row }: { row: { original: AnalyticsItem } }) =>
							row.original.status !== "Closed"
								? "Not yet approved"
								: row.original.traineeCount === null
									? "Not recorded"
									: row.original.traineeCount.toLocaleString(),
					},
					{
						id: "evidence",
						header: "Evidence",
						cell: ({ row }: { row: { original: AnalyticsItem } }) =>
							row.original.reportId ? (
								<div className="flex flex-wrap gap-2">
									<ReportDocumentButton id={row.original.reportId} />
									{user.roleName === "Director" &&
										row.original.status === "Closed" && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => setCorrection(row.original)}
											>
												Update trainee count
											</Button>
										)}
								</div>
							) : (
								"No terminal report"
							),
					},
				]) as DataTableColumnDef<AnalyticsItem>[]),
	];
	return (
		<div className="flex flex-col gap-6">
			<nav
				aria-label="Breadcrumb"
				className="flex items-center gap-2 text-sm text-muted-foreground"
			>
				<Link
					to="/dashboard"
					search={{ page: 1, pageSize: 10 }}
					className="hover:text-foreground underline"
				>
					Dashboard
				</Link>
				<span aria-hidden="true">/</span>
				<span aria-current="page">Analytics</span>
			</nav>
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
					<label htmlFor={yearInputId} className="flex flex-col gap-1 text-sm">
						<span className="text-muted-foreground">
							{view === "reach" ? "Closure year" : "Project creation year"}
						</span>
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
					</label>
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
				<PageCard className="p-4">
					<div role="alert">
						<p>We couldn't load these reports. Please try again.</p>
						<Button variant="outline" onClick={() => void refetch()}>
							Retry
						</Button>
					</div>
				</PageCard>
			)}
			{!error && (
				<>
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{isPending
							? [1, 2, 3, 4].map((key) => (
									<div
										key={key}
										className="h-28 animate-pulse rounded-lg bg-muted"
									/>
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
						<p className="rounded-md border p-3 text-sm">
							{data?.undatedProjects} closed projects in this scope have no
							recorded closure date. They aren't included in the selected year's
							totals.
						</p>
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
					<DataTablePage
						columns={columns}
						data={data?.items ?? []}
						total={data?.total ?? 0}
						isLoading={isPending}
						page={filters.page}
						pageSize={filters.limit}
						onPageChange={(page) => onFiltersChange({ page })}
						ariaLabel={
							showFaculty ? "Faculty participation" : "Contributing projects"
						}
						emptyMessage="No records match the selected filters."
					/>
				</>
			)}
			{correction && (
				<TraineeCorrectionForm
					key={correction.id}
					result={correction}
					onClose={() => setCorrection(null)}
				/>
			)}
		</div>
	);
}
