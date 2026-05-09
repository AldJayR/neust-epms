import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { directorDashboardQueryOptions } from "@/lib/director.functions";
import type { AuthUser } from "@/lib/auth";
import { AppShell } from "../layout/app-shell";

const ProjectsChartCard = React.lazy(() => import("./projects-chart-card"));

const metricCards = [
	{ label: "Total Projects", key: "totalProjects" as const },
	{ label: "Ongoing Projects", key: "ongoingProjects" as const },
	{ label: "Under Evaluation", key: "underEvaluation" as const },
	{ label: "Completed", key: "completed" as const },
];

const projectChartData = [
	{ label: "COA", value: 104 },
	{ label: "COC", value: 170 },
	{ label: "COE", value: 132 },
	{ label: "CICT", value: 40 },
	{ label: "CMBT", value: 116 },
	{ label: "CPADM", value: 119 },
];

const recentActivities = [
	{
		title: "New Proposal Submitted",
		description: "“Digital Literacy Drive in Barangay Sumacab” by CICT Dept.",
		time: "2 hours ago",
		color: "bg-[#14369c]",
	},
	{
		title: "Project Approved",
		description: "“Community Health Training” has been approved by the Director.",
		time: "Yesterday, 4:20pm",
		color: "bg-[#16a34a]",
	},
	{
		title: "Review Pending",
		description: "Prof. Reyes updated the budget for “Sustainable Farming”.",
		time: "Yesterday, 2:46pm",
		color: "bg-[#f59e0b]",
	},
];

const expiringMoas = [
	{ name: "LGU MOA", dueText: "Expires in 14 days" },
	{ name: "LGU MOA", dueText: "Expires in 14 days" },
];

function MetricCard({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="flex h-[104px] flex-col gap-4 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<p className="text-[14px] leading-4 text-[#666]">{label}</p>
			<p className="text-[36px] font-semibold leading-9 text-[#11215a]">{value}</p>
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
				<button type="button" className="text-[12px] font-medium leading-4">View All</button>
			</div>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				{activities.map((activity, index) => (
					<div key={`${activity.title}-${index}`} className="border-t border-[#ebebeb] p-4">
						<div className="flex flex-col gap-6">
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1.5">
									<span className={`size-2 shrink-0 rounded-full ${["bg-[#14369c]", "bg-[#16a34a]", "bg-[#f59e0b]"][index % 3]}`} aria-hidden="true" />
									<p className="text-[14px] font-medium leading-5 text-[#0a0a0a]">{activity.title}</p>
								</div>
								<p className="text-[12px] leading-[14px] text-[#666]">{activity.description}</p>
							</div>
							<p className="text-[12px] leading-[14px] text-[#666]">{activity.time}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function ExpiringMoasCard({ moas }: { moas: { name: string; dueText: string }[] }) {
	return (
		<div className="h-[148px] flex flex-col overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<div className="flex items-center justify-between px-4 py-2 text-[#666]">
				<p className="text-[14px] font-medium leading-5">Expiring MOAs</p>
				<button type="button" className="text-[12px] font-medium leading-4">View All</button>
			</div>
			<div className="flex flex-1 flex-col overflow-hidden">
				{moas.length > 0 ? (
					moas.map((moa) => (
						<div key={`${moa.name}-${moa.dueText}`} className="border-t border-[#ebebeb] px-4 py-4">
							<div className="flex items-center justify-between gap-4">
								<p className="text-[14px] font-medium leading-5 text-[#0a0a0a]">{moa.name}</p>
								<p className="text-[14px] leading-5 text-[#dc2626]">{moa.dueText}</p>
							</div>
						</div>
					))
				) : (
					<div className="flex flex-1 items-center justify-center border-t border-[#ebebeb] px-4 pb-2">
						<p className="text-[14px] text-[#737373] italic">No MOAs expiring soon.</p>
					</div>
				)}
			</div>
		</div>
	);
}

function DirectorDashboardContent() {
	const dashboardQuery = useQuery(directorDashboardQueryOptions());
	const dashboard = dashboardQuery.data;
	const metrics = dashboard?.metrics ?? {
		totalProjects: 0,
		ongoingProjects: 0,
		underEvaluation: 0,
		completed: 0,
	};
	const chartData = dashboard?.chartData ?? projectChartData;
	const activities = dashboard?.recentActivities ?? recentActivities;
	const moas = dashboard?.expiringMoas ?? expiringMoas;

	return (
		<section className="px-6 py-6">
			<div className="flex min-h-full flex-col gap-8">
				<div>
					<h1 className="text-[24px] font-semibold leading-[35px] text-[#11215a]">
						Welcome, Dr. Santos!
					</h1>
				</div>
				<div className="grid gap-6 xl:grid-cols-4">
					{metricCards.map((card) => (
						<MetricCard key={card.label} label={card.label} value={metrics[card.key]} />
					))}
				</div>
				<div className="grid gap-8 lg:grid-cols-[minmax(0,630px)_minmax(0,1fr)]">
					<React.Suspense fallback={<div className="h-[370px] rounded-[12px] border border-[#ebebeb] bg-white animate-pulse" />}>
						<ProjectsChartCard chartData={chartData} />
					</React.Suspense>
					<RecentActivitiesCard activities={activities} />
				</div>
				<ExpiringMoasCard moas={moas} />
			</div>
		</section>
	);
}

export function DirectorDashboardPage({ user }: { user?: AuthUser | null }) {
	return <DirectorDashboardContent />;
}
