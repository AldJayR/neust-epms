import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination-bar";
import type {
	DirectorMilestone,
	DirectorMilestoneKind,
} from "@/types/dashboard";
import { directorMilestonesQueryOptions } from "../../milestones.functions";
import { useDirectorDashboardState } from "../use-director-dashboard-state";
import {
	DashboardError,
	DashboardLoading,
	DashboardUpdatedAt,
} from "./dashboard-feedback";

const headings: Record<DirectorMilestoneKind, { title: string; own: string }> =
	{
		proposal_endorsed: {
			title: "Proposal endorsed for Director review",
			own: "You endorsed a proposal",
		},
		proposal_approved: {
			title: "Proposal approved",
			own: "You approved a proposal",
		},
		proposal_returned: {
			title: "Proposal returned for revision",
			own: "You returned a proposal for revision",
		},
		proposal_rejected: {
			title: "Proposal rejected",
			own: "You rejected a proposal",
		},
		signed_documents_completed: {
			title: "Signed documents completed",
			own: "You recorded the signed documents",
		},
		project_activated: {
			title: "Project activated",
			own: "You activated a project",
		},
		terminal_package_completed: {
			title: "Terminal package ready for review",
			own: "You completed a terminal package",
		},
		project_completed: {
			title: "Project completed",
			own: "You approved project completion",
		},
	};

const projectKinds = new Set<DirectorMilestoneKind>([
	"project_activated",
	"terminal_package_completed",
	"project_completed",
]);
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "Asia/Manila",
});

function MilestoneRow({
	item,
	currentUserId,
}: {
	item: DirectorMilestone;
	currentUserId?: string;
}) {
	const { state } = useDirectorDashboardState();
	const own = item.actorId !== null && item.actorId === currentUserId;
	const projectLink = projectKinds.has(item.kind) && item.projectId !== null;
	const linkClass =
		"inline-flex min-h-9 items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
	const label = `View ${projectLink ? "project" : "proposal"}: ${item.title}`;
	return (
		<li className="space-y-1 py-4 first:pt-0 last:pb-0">
			<p className="text-sm font-semibold">
				{own ? headings[item.kind].own : headings[item.kind].title}
			</p>
			{projectLink ? (
				<Link
					to="/projects/$projectId"
					params={{ projectId: item.projectId ?? item.proposalId }}
					search={{ dashboard: state }}
					hash={
						item.kind === "terminal_package_completed" ||
						item.kind === "project_completed"
							? "terminal-results"
							: undefined
					}
					hashScrollIntoView
					className={linkClass}
					aria-label={label}
				>
					{item.title}
					<ArrowUpRight className="size-3.5 shrink-0" />
				</Link>
			) : (
				<Link
					to="/proposals/$proposalId"
					params={{ proposalId: item.proposalId }}
					search={{ dashboard: state }}
					className={linkClass}
					aria-label={label}
				>
					{item.title}
					<ArrowUpRight className="size-3.5 shrink-0" />
				</Link>
			)}
			<p className="text-xs text-muted-foreground">{item.unitLabel}</p>
			<p className="text-xs text-muted-foreground">
				{own ? "You" : (item.actorName ?? "Actor not recorded")} ·{" "}
				<time dateTime={item.occurredAt}>
					{dateFormatter.format(new Date(item.occurredAt))}
				</time>
			</p>
		</li>
	);
}

export function RecentProjectUpdates({
	currentUserId,
}: {
	currentUserId?: string;
}) {
	const { state, update } = useDirectorDashboardState();
	const expanded = state.updatesExpanded ?? false;
	const page = expanded ? (state.updatesPage ?? 1) : 1;
	const query = useQuery({
		...directorMilestonesQueryOptions(page, expanded ? 10 : 5),
		placeholderData: keepPreviousData,
	});
	const data = query.data;
	return (
		<Card role="region" aria-labelledby="recent-project-updates-title">
			<CardHeader>
				<CardTitle>
					<h2
						id="recent-project-updates-title"
						className="flex items-center gap-2"
					>
						<History className="size-4 text-muted-foreground" />
						Recent Project Updates
					</h2>
				</CardTitle>
				<CardDescription>
					Major milestones relevant to the Director · All project years · Manila
					time
				</CardDescription>
				<DashboardUpdatedAt
					timestamp={query.dataUpdatedAt}
					refreshing={query.isFetching}
				/>
			</CardHeader>
			<CardContent>
				{query.isPending || query.isPlaceholderData ? (
					<DashboardLoading />
				) : query.isError && !data ? (
					<DashboardError
						section="recent project updates"
						onRetry={() => void query.refetch()}
						retrying={query.isFetching}
					/>
				) : (
					data && (
						<div className="space-y-4">
							{query.isError && (
								<DashboardError
									section="recent project updates"
									stale
									onRetry={() => void query.refetch()}
									retrying={query.isFetching}
								/>
							)}
							{data.items.length ? (
								<ul className="divide-y divide-border">
									{data.items.map((item) => (
										<MilestoneRow
											key={item.id}
											item={item}
											currentUserId={currentUserId}
										/>
									))}
								</ul>
							) : (
								<p className="py-5 text-sm text-muted-foreground">
									Project milestones and review decisions will appear here as
									proposals and projects progress.
								</p>
							)}
							{!expanded && data.total > 5 && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										void update({ updatesExpanded: true, updatesPage: 1 })
									}
								>
									View all {data.total} milestones
								</Button>
							)}
							{expanded && (
								<>
									<PaginationBar
										page={data.page}
										totalPages={Math.ceil(data.total / data.limit)}
										total={data.total}
										limit={data.limit}
										isLoading={query.isFetching}
										onPageChange={(next) => void update({ updatesPage: next })}
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() =>
											void update({ updatesExpanded: false, updatesPage: 1 })
										}
									>
										Show recent five
									</Button>
								</>
							)}
						</div>
					)
				)}
			</CardContent>
		</Card>
	);
}
