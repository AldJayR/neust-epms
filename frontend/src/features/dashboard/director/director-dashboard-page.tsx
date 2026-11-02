import { useIsFetching, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { PageCard } from "@/components/custom/page-card";
import { PageHeader } from "@/components/custom/page-header";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth";
import type { DashboardYearProps } from "@/lib/dashboard-year";
import { directorDashboardQueryOptions } from "../functions";
import {
	DashboardError,
	DashboardUpdatedAt,
} from "./components/dashboard-feedback";
import { DirectorDecisionsPanel } from "./components/director-decisions-panel";
import { InstitutionalOverview } from "./components/institutional-overview";

function RecentActivitiesCard({
	activities,
}: {
	activities: { title: string; description: string; time: string }[];
}) {
	return (
		<PageCard className="flex min-h-[300px] max-h-[370px] flex-col">
			<div className="flex items-center justify-between px-4 py-2 text-muted-foreground">
				<h2 className="text-sm font-semibold leading-5 text-heading">
					Your Recent Activities
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
	const queryClient = useQueryClient();
	const refreshing = useIsFetching({ queryKey: ["dashboard"] }) > 0;
	const supportQuery = useQuery(directorDashboardQueryOptions());
	const dashboard = supportQuery.data;
	const activities = dashboard?.recentActivities ?? [];
	const moas = dashboard?.expiringMoas ?? [];

	return (
		<section>
			<div className="flex min-h-full flex-col gap-8">
				<PageHeader
					actions={
						<Button
							variant="outline"
							size="sm"
							disabled={refreshing}
							onClick={() =>
								void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
							}
						>
							<RefreshCw
								className={`size-4 ${refreshing ? "animate-spin" : ""}`}
							/>
							{refreshing ? "Refreshing…" : "Refresh dashboard"}
						</Button>
					}
					title={
						<div className="flex flex-col gap-1">
							<h1 className="text-2xl font-semibold text-heading">
								Director Dashboard
							</h1>
							<p className="text-sm text-muted-foreground">
								{user?.firstName ? `${user.firstName}, manage` : "Manage"}{" "}
								extension projects, approvals, and faculty participation.
							</p>
						</div>
					}
				/>
				<DirectorDecisionsPanel />
				<InstitutionalOverview
					year={year}
					onYearChange={onYearChange}
					availableYears={dashboard?.availableYears}
				/>
				<DirectorDecisionsPanel reporting />
				{supportQuery.isError && !dashboard ? (
					<DashboardError
						section="your activities and expiring MOAs"
						onRetry={() => void supportQuery.refetch()}
						retrying={supportQuery.isFetching}
					/>
				) : supportQuery.isPending ? (
					<p role="status" className="text-sm text-muted-foreground">
						Loading activities and MOAs…
					</p>
				) : (
					<div className="space-y-4">
						<DashboardUpdatedAt
							timestamp={supportQuery.dataUpdatedAt}
							refreshing={supportQuery.isFetching}
						/>
						{supportQuery.isError && (
							<DashboardError
								section="your activities and expiring MOAs"
								stale
								onRetry={() => void supportQuery.refetch()}
								retrying={supportQuery.isFetching}
							/>
						)}
						<div className="grid items-start gap-5 lg:grid-cols-2">
							<ExpiringMoasCard moas={moas} />
							<RecentActivitiesCard activities={activities} />
						</div>
					</div>
				)}
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
