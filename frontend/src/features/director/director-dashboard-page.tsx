import { Link } from "@tanstack/react-router";
import {
	Bell,
	Building2,
	ChartColumn,
	ChevronsUpDown,
	FileText,
	FolderKanban,
	LayoutGrid,
	PanelLeft,
	Search,
	Settings,
	Square,
	Users,
} from "lucide-react";

import { RoleSidebar, type RoleSidebarGroup } from "@/components/role-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { directorDashboardQueryOptions } from "@/lib/director.functions";
import type { AuthUser } from "@/lib/auth";

const metricCards = [
	{ label: "Total Projects", key: "totalProjects" as const },
	{ label: "Ongoing Projects", key: "ongoingProjects" as const },
	{ label: "Under Evaluation", key: "underEvaluation" as const },
	{ label: "Completed", key: "completed" as const },
];

const projectChartData = [
	{ label: "COA", value: 104.04 },
	{ label: "COC", value: 170.61 },
	{ label: "COE", value: 132.57 },
	{ label: "CICT", value: 40.83 },
	{ label: "CMBT", value: 116.91 },
	{ label: "CPADM", value: 119.71 },
];

const recentActivities = [
	{
		title: "New Proposal Submitted",
		description: "\u201cDigital Literacy Drive in Barangay Sumacab\u201d by CICT Dept.",
		time: "2 hours ago",
		color: "bg-[#14369c]",
	},
	{
		title: "Project Approved",
		description: "\u201cCommunity Health Training\u201d has been approved by the Director.",
		time: "Yesterday, 4:20pm",
		color: "bg-[#16a34a]",
	},
	{
		title: "Review Pending",
		description: "Prof. Reyes updated the budget for \u201cSustainable Farming\u201d.",
		time: "Yesterday, 2:46pm",
		color: "bg-[#f59e0b]",
	},
];

const expiringMoas = [
	{ name: "LGU MOA", dueText: "Expires in 14 days" },
	{ name: "LGU MOA", dueText: "Expires in 14 days" },
];

const sidebarGroups: RoleSidebarGroup[] = [
	{
		title: "Dashboard",
		items: [
			{ title: "Overview", icon: LayoutGrid, active: true },
			{ title: "Projects", icon: FolderKanban },
			{ title: "Faculty", icon: Users },
			{ title: "Departments", icon: Building2 },
			{ title: "Memoranda of Agreements", icon: FileText },
		],
	},
	{
		title: "Management",
		items: [
			{ title: "Reports", icon: ChartColumn },
			{ title: "Settings", icon: Settings },
		],
	},
];

function MetricCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex h-[104px] flex-col gap-4 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<p className="text-[14px] leading-4 text-[#666]">{label}</p>
			<p className="text-[36px] font-semibold leading-9 text-[#11215a]">{value}</p>
		</div>
	);
}

function DirectorHeader() {
	return (
		<header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-white px-4">
			<div className="flex min-w-0 items-center gap-2">
				<button
					type="button"
					className="inline-flex size-7 items-center justify-center rounded-full text-[#0a0a0a] transition-colors hover:bg-[#f5f5f5]"
					aria-label="Toggle sidebar"
				>
					<PanelLeft className="size-4" />
				</button>
				<Square className="size-4 text-[#0a0a0a]" aria-hidden="true" />
				<div className="relative w-[212px] shrink-0">
					<Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-[#737373]" />
					<input
						type="search"
						placeholder="Type to search..."
						className="h-8 w-full rounded-md border border-[#e5e5e5] bg-white pl-8 pr-3 text-[14px] text-[#0a0a0a] shadow-[0px_1px_1px_rgba(0,0,0,0.1)] placeholder:text-[#737373] focus:outline-none"
					/>
				</div>
			</div>
			<button
				type="button"
				className="inline-flex size-7 items-center justify-center rounded-full text-[#0a0a0a] transition-colors hover:bg-[#f5f5f5]"
				aria-label="Notifications"
			>
				<Bell className="size-4" />
			</button>
		</header>
	);
}

function ProjectsChartCard({
	chartData,
}: {
	chartData: { label: string; value: number }[];
}) {
	const maxValue = Math.max(...chartData.map((entry) => entry.value), 1);

	return (
		<div className="h-[370px] overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<div className="flex h-[72px] items-start justify-between border-b border-white px-6 pt-4 pb-3">
				<div className="leading-tight">
					<p className="text-[14px] font-semibold leading-5 text-[#0a0a0a]">Total Projects</p>
					<p className="text-[14px] leading-5 text-[#666]">per college</p>
				</div>
				<button
					type="button"
					className="flex h-9 w-[200px] items-center justify-between rounded-md border border-[#e5e5e5] bg-white px-3 text-[14px] text-[#737373] shadow-[0px_1px_1px_rgba(0,0,0,0.1)]"
				>
					<span>Select campus...</span>
					<ChevronsUpDown className="size-4 opacity-50" />
				</button>
			</div>
			<div className="flex h-[298px] items-center justify-center px-6 pb-6 pt-10">
				<div className="flex w-full max-w-[536px] flex-col gap-2">
					<div className="relative h-[188px] w-full">
						{[0, 47, 94, 141, 188].map((top) => (
							<div key={top} className="absolute left-[-31px] right-0 h-px bg-[#ebebeb]" style={{ top }} />
						))}
						<div className="absolute inset-x-0 bottom-0 flex items-end justify-between">
							{chartData.map((entry) => {
								const height = (entry.value / maxValue) * 170.61;

								return (
									<div key={entry.label} className="flex w-[50px] flex-col items-center gap-2">
										<div className="w-[50px] rounded-[4px] bg-[#14369c]" style={{ height }} />
										<span className="text-[12px] leading-4 text-[#737373]">{entry.label}</span>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>
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
					<div key={activity.title} className="border-t border-[#ebebeb] p-4">
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
		<div className="h-[148px] overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<div className="flex items-center justify-between px-4 py-2 text-[#666]">
				<p className="text-[14px] font-medium leading-5">Expiring MOAs</p>
				<button type="button" className="text-[12px] font-medium leading-4">View All</button>
			</div>
			<div className="flex flex-1 flex-col overflow-hidden">
				{moas.map((moa) => (
					<div key={`${moa.name}-${moa.dueText}`} className="border-t border-[#ebebeb] px-4 py-4">
						<div className="flex items-center justify-between gap-4">
							<p className="text-[14px] font-medium leading-5 text-[#0a0a0a]">{moa.name}</p>
							<p className="text-[14px] leading-5 text-[#dc2626]">{moa.dueText}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function DirectorMainContent() {
	const dashboardQuery = useQuery(directorDashboardQueryOptions());
	const dashboard = dashboardQuery.data;
	const metrics = dashboard?.metrics ?? {
		totalProjects: 13,
		ongoingProjects: 12,
		underEvaluation: 182,
		completed: 3,
	};
	const chartData = dashboard?.chartData ?? projectChartData;
	const activities = dashboard?.recentActivities ?? recentActivities;
	const moas = dashboard?.expiringMoas ?? expiringMoas;

	return (
		<main className="min-w-0 flex-1 overflow-auto bg-white">
			<DirectorHeader />
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
						<ProjectsChartCard chartData={chartData} />
						<RecentActivitiesCard activities={activities} />
					</div>
					<ExpiringMoasCard moas={moas} />
				</div>
			</section>
		</main>
	);
}

export function DirectorDashboardPage({ user }: { user?: AuthUser | null }) {
	return (
		<SidebarProvider>
			<RoleSidebar
				headerRender={<Link to="/dashboard" />}
				headerContent={
					<>
						<div className="flex aspect-square size-8 items-center justify-center">
							<img
								src="https://www.figma.com/api/mcp/asset/f4d2e42a-b415-4ff3-b36f-5aa4acd0b8ad"
								alt="NEUST Logo"
								className="size-7"
							/>
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold text-[#0a0a0a]">NEUST</span>
							<span className="truncate text-xs text-[#0a0a0a]">Extension Services</span>
						</div>
					</>
				}
				groups={sidebarGroups}
				user={user ?? null}
				fallbackFullName="Dr. A. Santos"
				fallbackRole="Director"
			/>
			<SidebarInset className="bg-white">
				<DirectorMainContent />
			</SidebarInset>
		</SidebarProvider>
	);
}
