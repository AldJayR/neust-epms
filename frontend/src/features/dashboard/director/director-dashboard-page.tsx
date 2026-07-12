import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as React from "react";
import { MetricCard } from "@/components/custom/metric-card";
import { PageCard } from "@/components/custom/page-card";
import { PageHeader } from "@/components/custom/page-header";
import type { AuthUser } from "@/lib/auth";
import { getCampusesFn } from "@/lib/auth.functions";
import { directorDashboardQueryOptions } from "@/features/dashboard/functions";
import { ActionCenterCard } from "@/features/action-center";

const ProjectsChartCard = React.lazy(() =>
	import("@/features/projects").then(({ ProjectsChartCard }) => ({
		default: ProjectsChartCard,
	})),
);

const metricCards = [
	{ label: "Total Projects", key: "totalProjects" as const },
	{ label: "Ongoing Projects", key: "ongoingProjects" as const },
	{ label: "Under Evaluation", key: "underEvaluation" as const },
	{ label: "Completed", key: "completed" as const },
];

function RecentActivitiesCard({
	activities,
}: {
	activities: { title: string; description: string; time: string }[];
}) {
	return (
		<PageCard className="flex h-[370px] flex-col">
			<div className="flex items-center justify-between px-4 py-2 text-muted-foreground">
				<h2 className="text-sm font-semibold leading-5 text-heading">
					Recent Activities
				</h2>
			</div>
			<ul className="flex min-h-0 flex-1 flex-col overflow-hidden">
				{activities.length > 0 ? (
					activities.map((activity, index) => (
						<li
							key={`${activity.title}-${activity.time}`}
							className="border-t border-border p-4"
						>
							<div className="flex flex-col gap-6">
								<div className="flex flex-col gap-1">
									<div className="flex items-center gap-1.5">
										<span
											className={`size-2 shrink-0 rounded-full ${["bg-brand-primary", "bg-green-600", "bg-amber-500"][index % 3]}`}
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
		<PageCard className="flex h-[148px] flex-col">
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
			<ul className="flex flex-1 flex-col overflow-hidden">
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
								<p className="text-sm leading-5 text-red-600">{moa.dueText}</p>
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

function DirectorDashboardContent({ user }: { user?: AuthUser | null }) {
	const [selectedCampus, setSelectedCampus] = React.useState("Sumacab Campus");

	const { data: dashboard } = useQuery(directorDashboardQueryOptions());
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
	const chartData = !selectedCampus
		? allChartData
		: allChartData.filter((point) => point.label === selectedCampus);
	const activities = dashboard?.recentActivities ?? [];
	const moas = dashboard?.expiringMoas ?? [];

	return (
		<section>
			<div className="flex min-h-full flex-col gap-8">
				<PageHeader
					title={
						<h1 className="text-2xl font-semibold text-heading">
							Welcome, {user?.firstName ? `${user.firstName}!` : "Director"}!
						</h1>
					}
				/>
				<ActionCenterCard />
				<div className="grid gap-6 md:grid-cols-3 xl:grid-cols-4">
					{metricCards.map((card) => (
						<MetricCard
							key={card.label}
							label={card.label}
							value={metrics[card.key]}
						/>
					))}
				</div>
				<div className="grid gap-8 lg:grid-cols-[minmax(0,630px)_minmax(0,1fr)]">
					<React.Suspense
						fallback={
							<div className="h-[370px] animate-pulse rounded-[12px] border border-border bg-background" />
						}
					>
						<ProjectsChartCard
							chartData={chartData}
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

export function DirectorDashboardPage({ user }: { user?: AuthUser | null }) {
	return <DirectorDashboardContent user={user} />;
}
