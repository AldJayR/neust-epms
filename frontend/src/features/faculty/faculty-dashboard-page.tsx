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
import { StatusBadge } from "@/components/ui/status-badge";
import type { AuthUser } from "@/lib/auth";
import {
	facultyProjectsQueryOptions,
	facultyProposalsQueryOptions,
} from "@/features/faculty";
import { ActionCenterCard } from "@/features/action-center";
import { CreateProposalModal } from "@/features/proposals";
import { toStableDate } from "@/lib/utils";

export function FacultyDashboardPage({ user }: { user: AuthUser }) {
	const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
	const hour = new Date().getHours();
	const timeOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

	const { data: proposalsData, isLoading: isProposalsLoading } = useQuery(
		facultyProposalsQueryOptions({
			page: 1,
			limit: 100,
		}),
	);

	const { data: projectsData, isLoading: isProjectsLoading } = useQuery(
		facultyProjectsQueryOptions({
			page: 1,
			limit: 100,
		}),
	);

	const isLoading = isProposalsLoading || isProjectsLoading;

	const projectsList = projectsData?.items ?? [];
	const proposalsList = proposalsData?.items ?? [];

	const userFullName = `${user.firstName} ${user.lastName}`;

	const combinedItems = [
		...projectsList.map((p) => {
			const isLeader =
				(p.leaderFirstName &&
					p.leaderLastName &&
					`${p.leaderFirstName} ${p.leaderLastName}` === userFullName) ||
				false;
			return {
				id: p.projectId,
				proposalId: p.proposalId,
				title: p.title || "Untitled Project",
				startDate: p.targetStartDate,
				endDate: p.targetEndDate,
				status: p.projectStatus,
				isLeader,
				isProject: true,
				isMember: p.isMember,
			};
		}),
		...proposalsList
			.filter(
				(p) => !projectsList.some((proj) => proj.proposalId === p.proposalId),
			)
			.map((p) => {
				const isLeader =
					(p.leaderFirstName &&
						p.leaderLastName &&
						`${p.leaderFirstName} ${p.leaderLastName}` === userFullName) ||
					false;
				return {
					id: p.proposalId,
					proposalId: p.proposalId,
					title: p.title || "Untitled Proposal",
					startDate: p.targetStartDate,
					endDate: p.targetEndDate,
					status: p.status,
					isLeader,
					isProject: false,
					isMember: p.isMember,
				};
			}),
	];

	const userItems = combinedItems.filter(
		(item) => item.isMember || item.isLeader,
	);

	const myTotalSubmissions = userItems.length;
	const ongoingProjects = userItems.filter(
		(item) => item.status === "Ongoing",
	).length;
	const proposalsSubmitted = userItems.filter((item) => !item.isProject).length;

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
					<BrandButton onClick={() => setIsCreateModalOpen(true)}>
						<Plus className="size-4" />
						<span>Start New Project Proposal</span>
					</BrandButton>
				}
			/>

			<ActionCenterCard />

			<div className="grid gap-6 md:grid-cols-3">
				<MetricCard
					label="My Total Submission"
					value={isLoading ? undefined : myTotalSubmissions}
					isLoading={isLoading}
				/>
				<MetricCard
					label="Ongoing Projects"
					value={isLoading ? undefined : ongoingProjects}
					isLoading={isLoading}
				/>
				<MetricCard
					label="Proposals Submitted"
					value={isLoading ? undefined : proposalsSubmitted}
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
				) : userItems.length === 0 ? (
						<PageCard className="p-8 text-center">
							<p className="text-sm font-medium text-foreground">
								No proposals or projects yet
							</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Start a proposal to begin tracking your extension work here.
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

			<CreateProposalModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
				user={user}
			/>
		</div>
	);
}
