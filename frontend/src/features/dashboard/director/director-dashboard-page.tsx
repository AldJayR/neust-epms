import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as React from "react";
import { MetricCard } from "@/components/custom/metric-card";
import { PageCard } from "@/components/custom/page-card";
import { PageHeader } from "@/components/custom/page-header";
import { ActionCenterCard } from "@/features/action-center";
import { getCampusesFn } from "@/features/auth";
import type { AuthUser } from "@/lib/auth";
import type { DashboardYearProps } from "@/lib/dashboard-year";
import {
	DashboardPeriodNote,
	DashboardYearFilter,
} from "../components/dashboard-year-filter";
import { directorDashboardQueryOptions } from "../functions";

const ProjectsChartCard = React.lazy(() =>
	import("@/features/projects").then(({ ProjectsChartCard }) => ({
		default: ProjectsChartCard,
	})),
);

const metricCards = [
	{ label: "Total Projects", key: "totalProjects" as const },
	{ label: "Ongoing Projects", key: "ongoingProjects" as const },
	{ label: "Under Evaluation", key: "underEvaluation" as const },
	{ label: "Closed / Completed", key: "completed" as const },
];

function RecentActivitiesCard({
	activities,
}: {
	activities: { title: string; description: string; time: string }[];
}) {
	return (
		<PageCard className="flex min-h-[300px] max-h-[370px] flex-col">
			<div className="flex items-center justify-between px-4 py-2 text-muted-foreground">
				<h2 className="text-sm font-semibold leading-5 text-heading">
					Recent Activities
				</h2>
			</div>
			<ul className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
				{activities.length > 0 ? (
					activities.map((activity) => (
						<li
							key={`${activity.title}-${activity.time}`}
							className="border-t border-border p-4"
						>
							<div className="flex flex-col gap-3">
								<div className="flex flex-col gap-1">
									<div className="flex items-center gap-1.5">
										<span
											className="size-2 shrink-0 rounded-full bg-muted-foreground/50"
											aria-hidden="true"
										/>
										<p className="text-sm font-medium leading-5 text-foreground">
											{activity.title}
										</p>
									</div>
									<p className="text-xs leading-[14px] text-muted-foreground">
										{activity.description}
									</p>
								</div>
								<p className="text-xs leading-[14px] text-muted-foreground">
									{activity.time}
								</p>
							</div>
						</li>
					))
				) : (
					<li className="flex flex-1 items-center justify-center px-4">
						<p className="text-sm text-muted-foreground italic">
							No recent activities.
						</p>
					</li>
				)}
			</ul>
		</PageCard>
	);
}

function ExpiringMoasCard({
	moas,
}: {
	moas: { name: string; dueText: string }[];
}) {
	return (
		<PageCard className="flex min-h-[148px] max-h-[220px] flex-col">
			<div className="flex items-center justify-between px-4 py-2 text-muted-foreground">
				<h2 className="text-sm font-semibold leading-5 text-heading">
					Expiring MOAs
				</h2>
				<Link
					to="/moas"
					search={{ page: 1, limit: 10 }}
					className="text-xs font-medium leading-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm"
				>
					View All
				</Link>
			</div>
			<ul className="flex flex-1 flex-col overflow-y-auto pr-1">
				{moas.length > 0 ? (
					moas.map((moa) => (
						<li
							key={`${moa.name}-${moa.dueText}`}
							className="border-t border-border p-4"
						>
							<div className="flex items-center justify-between gap-4">
								<p className="text-sm font-medium leading-5 text-foreground">
									{moa.name}
								</p>
								<p
									className={
										/is today|in 1 day|in 2 days/i.test(moa.dueText)
											? "text-sm leading-5 text-danger"
											: "text-sm leading-5 text-warning"
									}
								>
									{moa.dueText}
								</p>
							</div>
						</li>
					))
				) : (
					<li className="flex flex-1 items-center justify-center border-t border-border px-4 pb-2">
						<p className="text-sm text-muted-foreground italic">
							No MOAs expiring soon.
						</p>
					</li>
				)}
			</ul>
		</PageCard>
	);
}

function DirectorDashboardContent({
	user,
	year,
	onYearChange,
}: { user?: AuthUser | null } & DashboardYearProps) {
	const [selectedCampus, setSelectedCampus] = React.useState<number | "all">(
		"all",
	);

	const {
		data: dashboard,
		isPending,
		error,
	} = useQuery(directorDashboardQueryOptions(year));
	const { data: campuses = [] } = useQuery({
		queryKey: ["campuses"],
		queryFn: () => getCampusesFn(),
	});

	const metrics = dashboard?.metrics ?? {
		totalProjects: 0,
		ongoingProjects: 0,
		underEvaluation: 0,
		completed: 0,
	};
	const allChartData = dashboard?.chartData ?? [];
	const chartMonths = dashboard?.chartMonths ?? [];
	const activities = dashboard?.recentActivities ?? [];
	const moas = dashboard?.expiringMoas ?? [];

	return (
		<section>
			<div className="flex min-h-full flex-col gap-8">
				<PageHeader
					actions={
						<DashboardYearFilter
							year={year}
							onYearChange={onYearChange}
							availableYears={dashboard?.availableYears}
						/>
					}
					title={
						<div className="flex flex-col gap-1">
							<h1 className="text-2xl font-semibold text-heading">
								Welcome, {user?.firstName ? `${user.firstName}!` : "Director"}!
							</h1>
							<p className="text-sm text-muted-foreground">
								Project approvals, activation, and reporting overview
							</p>
						</div>
					}
				/>
				<DashboardPeriodNote
					year={year}
					showDraftLink={false}
				/>
				{error && (
					<p role="alert" className="text-destructive">
						Unable to load dashboard metrics. Please try again.
					</p>
				)}
				<div>
					<p className="mb-2 text-xs text-muted-foreground">
						Current obligations · all project years
					</p>
					<ActionCenterCard />
				</div>
				<div className="grid gap-6 md:grid-cols-3 xl:grid-cols-4">
					{metricCards.map((card) => (
						<MetricCard
							key={card.label}
							label={card.label}
							value={error ? undefined : metrics[card.key]}
							isLoading={isPending}
						/>
					))}
				</div>
				<div className="grid gap-8 lg:grid-cols-[minmax(0,630px)_minmax(0,1fr)]">
					<React.Suspense
						fallback={
							<div className="min-h-[340px] animate-pulse rounded-xl border border-border bg-card" />
						}
					>
						<ProjectsChartCard
							year={year}
							chartData={allChartData}
							chartMonths={chartMonths}
							campuses={campuses}
							selectedCampus={selectedCampus}
							onCampusChange={setSelectedCampus}
						/>
					</React.Suspense>
					<RecentActivitiesCard activities={activities} />
				</div>
				<ExpiringMoasCard moas={moas} />
			</div>
		</section>
	);
}

export function DirectorDashboardPage({
	user,
	year,
	onYearChange,
}: { user?: AuthUser | null } & DashboardYearProps) {
	return (
		<DirectorDashboardContent
			user={user}
			year={year}
			onYearChange={onYearChange}
		/>
	);
}
