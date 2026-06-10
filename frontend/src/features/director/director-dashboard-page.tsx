import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import type { AuthUser } from "@/lib/auth";
import { getCampusesFn } from "@/lib/auth.functions";
import { directorDashboardQueryOptions } from "@/lib/dashboard.functions";

const ProjectsChartCard = React.lazy(() => import("./projects-chart-card"));

const metricCards = [
	{ label: "Total Projects", key: "totalProjects" as const },
	{ label: "Ongoing Projects", key: "ongoingProjects" as const },
	{ label: "Under Evaluation", key: "underEvaluation" as const },
	{ label: "Completed", key: "completed" as const },
];

function MetricCard({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="flex h-[104px] flex-col gap-4 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<p className="text-[14px] leading-4 text-[#666]">{label}</p>
			<p className="text-[36px] font-semibold leading-9 text-[#11215a]">
				{value}
			</p>
		</div>
	);
}

function RecentActivitiesCard({
	activities,
}: {
	activities: { title: string; description: string; time: string }[];
}) {
	return (
		<div className="flex h-[370px] flex-col overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<div className="flex items-center justify-between px-4 py-2 text-[#666]">
				<p className="text-[14px] font-medium leading-5">Recent Activities</p>
				<button type="button" className="text-[12px] font-medium leading-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm">
					View All
				</button>
			</div>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				{activities.length > 0 ? (
					activities.map((activity, index) => (
						<div
							key={`${activity.title}-${activity.time}`}
							className="border-t border-[#ebebeb] p-4"
						>
							<div className="flex flex-col gap-6">
								<div className="flex flex-col gap-1">
									<div className="flex items-center gap-1.5">
										<span
											className={`size-2 shrink-0 rounded-full ${["bg-brand-primary", "bg-[#16a34a]", "bg-[#f59e0b]"][index % 3]}`}
											aria-hidden="true"
										/>
										<p className="text-[14px] font-medium leading-5 text-[#0a0a0a]">
											{activity.title}
										</p>
									</div>
									<p className="text-[12px] leading-[14px] text-[#666]">
										{activity.description}
									</p>
								</div>
								<p className="text-[12px] leading-[14px] text-[#666]">
									{activity.time}
								</p>
							</div>
						</div>
					))
				) : (
					<div className="flex flex-1 items-center justify-center px-4">
						<p className="text-[14px] text-[#737373] italic">
							No recent activities.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

function ExpiringMoasCard({
	moas,
}: {
	moas: { name: string; dueText: string }[];
}) {
	return (
		<div className="flex h-[148px] flex-col overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<div className="flex items-center justify-between px-4 py-2 text-[#666]">
				<p className="text-[14px] font-medium leading-5">Expiring MOAs</p>
				<button type="button" className="text-[12px] font-medium leading-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm">
					View All
				</button>
			</div>
			<div className="flex flex-1 flex-col overflow-hidden">
				{moas.length > 0 ? (
					moas.map((moa) => (
						<div
							key={`${moa.name}-${moa.dueText}`}
							className="border-t border-[#ebebeb] p-4"
						>
							<div className="flex items-center justify-between gap-4">
								<p className="text-[14px] font-medium leading-5 text-[#0a0a0a]">
									{moa.name}
								</p>
								<p className="text-[14px] leading-5 text-[#dc2626]">
									{moa.dueText}
								</p>
							</div>
						</div>
					))
				) : (
					<div className="flex flex-1 items-center justify-center border-t border-[#ebebeb] px-4 pb-2">
						<p className="text-[14px] text-[#737373] italic">
							No MOAs expiring soon.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

function DirectorDashboardContent({ user }: { user?: AuthUser | null }) {
	const [selectedCampus, setSelectedCampus] = React.useState("Sumacab Campus");

	const dashboardQuery = useQuery(directorDashboardQueryOptions());
	const campusesQuery = useQuery({
		queryKey: ["campuses"],
		queryFn: () => getCampusesFn(),
	});

	const dashboard = dashboardQuery.data;
	const campuses = campusesQuery.data ?? [];
	const metrics = dashboard?.metrics ?? {
		totalProjects: 0,
		ongoingProjects: 0,
		underEvaluation: 0,
		completed: 0,
	};
	const allChartData = dashboard?.chartData ?? [];
	const chartData =
		!selectedCampus
			? allChartData
			: allChartData.filter((point) => point.label === selectedCampus);
	const activities = dashboard?.recentActivities ?? [];
	const moas = dashboard?.expiringMoas ?? [];

	return (
		<section>
			<div className="flex min-h-full flex-col gap-8">
				<div>
					<h1 className="text-[24px] font-semibold leading-[35px] text-[#11215a]">
						Welcome, {user?.firstName ? `${user.firstName}!` : "Director"}!
					</h1>
				</div>
				<div className="grid gap-6 xl:grid-cols-4">
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
							<div className="h-[370px] animate-pulse rounded-[12px] border border-[#ebebeb] bg-white" />
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

export function DirectorDashboardPage({
	user,
}: {
	user?: AuthUser | null;
}) {
	return <DirectorDashboardContent user={user} />;
}
