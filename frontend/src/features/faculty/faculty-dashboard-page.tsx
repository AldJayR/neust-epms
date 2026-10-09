import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Crown, Plus, Users } from "lucide-react";
import * as React from "react";
import { BrandButton } from "@/components/custom/brand-button";
import { MetricCard } from "@/components/custom/metric-card";
import { PageCard } from "@/components/custom/page-card";
import { PageHeader } from "@/components/custom/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionCenterCard } from "@/features/action-center";
import { facultyDashboardQueryOptions } from "@/features/dashboard";
import {
	DashboardPeriodNote,
	DashboardYearFilter,
} from "@/features/dashboard/components/dashboard-year-filter";
import { CreateProposalModal } from "@/features/proposals";
import type { AuthUser } from "@/lib/auth";
import type { DashboardYearProps } from "@/lib/dashboard-year";
import { toManilaDisplayDate as toStableDate } from "@/lib/dates";

export function FacultyDashboardPage({
	user,
	year,
	onYearChange,
	page,
	pageSize,
	onPageChange,
}: {
	user: AuthUser;
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
} & DashboardYearProps) {
	const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
	const hour = new Date().getHours();
	const timeOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

	const {
		data: dashboard,
		isPending: isLoading,
		error,
		refetch,
	} = useQuery(facultyDashboardQueryOptions(year, page, pageSize));
	const userItems = (dashboard?.items ?? []).map((item) => ({
		...item,
		id: item.proposalId,
		startDate: item.targetStartDate,
		endDate: item.targetEndDate,
		isProject: Boolean(item.projectId),
	}));

	const formatDateRange = (start?: string | null, end?: string | null) => {
		if (!start && !end) return "No duration set";
		try {
			const startStr = start ? format(toStableDate(start), "MMM yyyy") : "";
			const endStr = end ? format(toStableDate(end), "MMM yyyy") : "";
			if (startStr && endStr) return `${startStr} - ${endStr}`;
			return startStr || endStr;
		} catch {
			return "Invalid Date";
		}
	};

	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title={
					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-semibold text-heading">
							Good {timeOfDay}, {user.firstName}
						</h1>
						<p className="text-sm text-muted-foreground">
							Your proposals, projects, and upcoming obligations
						</p>
					</div>
				}
				actions={
					<div className="flex flex-wrap items-center gap-3">
						<DashboardYearFilter
							year={year}
							onYearChange={onYearChange}
							availableYears={dashboard?.availableYears}
						/>
						<BrandButton onClick={() => setIsCreateModalOpen(true)}>
							<Plus className="size-4" />
							<span>Start New Project Proposal</span>
						</BrandButton>
					</div>
				}
			/>

			<DashboardPeriodNote
				year={year}
			/>
			<div>
				<p className="mb-2 text-xs text-muted-foreground">
					Current obligations · all project years
				</p>
				<ActionCenterCard />
			</div>
			{error && (
				<div role="alert" className="flex items-center justify-between gap-3">
					<p className="text-destructive">
						Unable to load your dashboard. Please try again.
					</p>
					<Button variant="outline" onClick={() => void refetch()}>
						Retry
					</Button>
				</div>
			)}

			<div className="grid gap-6 md:grid-cols-3">
				<MetricCard
					label="My Proposals & Projects"
					value={dashboard?.metrics.totalSubmissions}
					isLoading={isLoading}
				/>
				<MetricCard
					label="Ongoing Projects"
					value={dashboard?.metrics.ongoingProjects}
					isLoading={isLoading}
				/>
				<MetricCard
					label="Proposals"
					value={dashboard?.metrics.proposals}
					isLoading={isLoading}
				/>
			</div>

			<div className="flex flex-col gap-4 w-full">
				{isLoading ? (
					[1, 2, 3, 4].map((i) => (
						<PageCard
							key={i}
							className="flex min-h-[112px] flex-col gap-4 p-4 animate-pulse"
						>
							<div className="flex justify-between items-start">
								<div className="flex flex-col gap-2 w-1/3">
									<div className="h-5 w-3/4 rounded bg-muted" />
									<div className="h-3 w-1/2 rounded bg-muted" />
								</div>
								<div className="h-[22px] w-24 rounded-lg bg-muted" />
							</div>
							<div className="flex justify-between items-center mt-auto">
								<div className="h-[22px] w-28 rounded-lg bg-muted" />
								<div className="h-4 w-20 rounded bg-muted" />
							</div>
						</PageCard>
					))
				) : !error && userItems.length === 0 ? (
					<PageCard className="p-8 text-center">
						<p className="text-sm font-medium text-foreground">
							No proposals or projects scheduled during {year}
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Choose another year or open Project Hub to find drafts without dates.
						</p>
					</PageCard>
				) : (
					userItems.map((item) => (
						<PageCard key={item.id} className="flex flex-col gap-2.5 p-4">
							<div className="flex items-start justify-between w-full">
								<div>
									<h3 className="text-base font-semibold text-foreground">
										{item.title}
									</h3>
									<p className="text-xs text-muted-foreground mt-0.5">
										{formatDateRange(item.startDate, item.endDate)}
									</p>
								</div>
								<StatusBadge status={item.status} />
							</div>

							<div className="flex items-center justify-between w-full mt-1">
								{item.isLeader ? (
									<Badge
										variant="outline"
										className="gap-1 text-muted-foreground"
									>
										<Crown className="size-3.5 text-amber-500" />
										Project Leader
									</Badge>
								) : (
									<Badge
										variant="outline"
										className="gap-1 text-muted-foreground"
									>
										<Users className="size-3.5 text-sky-500" />
										Project Member
									</Badge>
								)}
								<Link
									to="/projects/$projectId"
									params={{ projectId: item.proposalId }}
									className="text-xs font-semibold text-brand-primary hover:underline"
								>
									{item.isProject ? "View Project" : "View Details"} &rarr;
								</Link>
							</div>
						</PageCard>
					))
				)}
			</div>
			{!isLoading && !error && (
				<div className="flex items-center justify-between gap-3">
					<Button
						variant="outline"
						disabled={page === 1}
						onClick={() => onPageChange(page - 1)}
					>
						Previous
					</Button>
					<span className="text-sm text-muted-foreground">
						Page {page} · {dashboard?.total ?? 0} records
					</span>
					<Button
						variant="outline"
						disabled={page * pageSize >= (dashboard?.total ?? 0)}
						onClick={() => onPageChange(page + 1)}
					>
						Next
					</Button>
				</div>
			)}

			<CreateProposalModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
				user={user}
			/>
		</div>
	);
}
