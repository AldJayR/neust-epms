import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	ClipboardCheck,
	FileCheck2,
} from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toManilaDisplayDate } from "@/lib/dates";
import type { DirectorWorkItem, DirectorWorkQueue } from "@/types/dashboard";
import { directorWorkQueueQueryOptions } from "../../functions";
import { useDirectorDashboardState } from "../use-director-dashboard-state";
import {
	DashboardError,
	DashboardLoading,
	DashboardUpdatedAt,
} from "./dashboard-feedback";

const decisions = [
	{ key: "review", label: "For Review", action: "Review Proposal" },
	{
		key: "signing",
		label: "Awaiting Signed Documents",
		action: "Upload Signed Documents",
	},
	{
		key: "activation",
		label: "Ready for Activation",
		action: "Activate Project",
	},
	{
		key: "completion",
		label: "Completion Approval",
		action: "Review Completion",
	},
] as const;

function WorkItemLink({
	item,
	queue,
	children,
}: {
	item: DirectorWorkItem;
	queue: DirectorWorkQueue;
	children: string;
}) {
	const classes =
		"inline-flex min-h-11 items-center gap-1.5 rounded-md py-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
	const { state } = useDirectorDashboardState();
	return queue === "review" || queue === "signing" ? (
		<Link
			to="/proposals/$proposalId"
			params={{ proposalId: item.proposalId }}
			className={classes}
			aria-label={`${children}: ${item.title}`}
			search={{
				dashboard: state,
				intent: queue === "signing" ? "signing" : undefined,
			}}
		>
			{children}
			<ArrowRight className="size-3.5" />
		</Link>
	) : (
		<Link
			to="/projects/$projectId"
			params={{ projectId: item.projectId ?? item.proposalId }}
			className={classes}
			aria-label={`${children}: ${item.title}`}
			search={{
				dashboard: state,
				intent: queue === "activation" ? "activation" : undefined,
			}}
			hash={
				queue === "completion"
					? "terminal-results"
					: queue === "reports"
						? "reporting-schedule"
						: undefined
			}
			hashScrollIntoView
		>
			{children}
			<ArrowRight className="size-3.5" />
		</Link>
	);
}

function QueuePanel({
	queue,
	children,
}: {
	queue: DirectorWorkQueue;
	children: ReactNode;
}) {
	return queue === "reports" ? (
		children
	) : (
		<TabsContent value={queue}>{children}</TabsContent>
	);
}

export function DirectorDecisionsPanel({
	reporting = false,
}: {
	reporting?: boolean;
}) {
	const { state, update } = useDirectorDashboardState();
	const queue = reporting ? "reports" : (state.decisionQueue ?? "review");
	const expanded =
		(reporting ? state.reportExpanded : state.decisionExpanded) ?? false;
	const page = (reporting ? state.reportPage : state.decisionPage) ?? 1;
	const setPage = (next: number) =>
		void update(reporting ? { reportPage: next } : { decisionPage: next });
	const setExpanded = (next: boolean) =>
		void update(
			reporting
				? { reportExpanded: next, reportPage: 1 }
				: { decisionExpanded: next, decisionPage: 1 },
		);
	const query = useQuery({
		...directorWorkQueueQueryOptions(queue, page, expanded ? 10 : 5),
		placeholderData: keepPreviousData,
	});
	const data = query.data;
	const action =
		decisions.find((tab) => tab.key === queue)?.action ?? "View Reporting";
	const card = (
		<Card
			id={reporting ? "reporting-attention" : "director-decisions"}
			role="region"
			aria-labelledby={
				reporting ? "reporting-attention-title" : "director-decisions-title"
			}
			tabIndex={reporting ? -1 : undefined}
			className="scroll-mt-6"
		>
			<CardHeader className="gap-2">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1.5">
						<CardTitle>
							<h2
								id={
									reporting
										? "reporting-attention-title"
										: "director-decisions-title"
								}
								className="flex items-center gap-2 text-lg"
							>
								{reporting ? (
									<ClipboardCheck className="size-5 text-muted-foreground" />
								) : (
									<FileCheck2 className="size-5 text-muted-foreground" />
								)}
								{reporting ? "Reporting Attention" : "Your Decisions"}
							</h2>
						</CardTitle>
						<CardDescription>
							{reporting
								? "Outstanding terminal reports and incomplete packages · Awaiting Project Leader"
								: "Review, signed documents, activation, and project completion"}
						</CardDescription>
					</div>
					<Badge variant="secondary">
						All project years · Institution-wide
					</Badge>
				</div>
				<DashboardUpdatedAt
					timestamp={query.dataUpdatedAt}
					refreshing={query.isFetching}
				/>
				{!reporting && data && data.overdueReports > 0 && (
					<Alert className="border-danger/30">
						<AlertTriangle className="text-danger" />
						<AlertDescription>
							<a
								href="#reporting-attention"
								className="rounded-sm font-medium text-danger underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{data.overdueReports} overdue terminal-report{" "}
								{data.overdueReports === 1 ? "obligation" : "obligations"}
							</a>
							<span className="text-muted-foreground">
								{" "}
								· Awaiting Project Leader · All project years
							</span>
						</AlertDescription>
					</Alert>
				)}
				{!reporting && (
					<TabsList
						aria-label="Director decision queues"
						variant="line"
						className="h-auto w-full justify-start overflow-x-auto"
					>
						{decisions.map((tab) => (
							<TabsTrigger
								key={tab.key}
								value={tab.key}
								className="shrink-0 gap-2 py-3"
							>
								{tab.label}
								<Badge variant="secondary" className="tabular-nums">
									{data?.counts[tab.key] ?? "—"}
								</Badge>
							</TabsTrigger>
						))}
					</TabsList>
				)}
			</CardHeader>
			<CardContent>
				<QueuePanel queue={queue}>
					{query.isPending || query.isPlaceholderData ? (
						<DashboardLoading />
					) : query.isError && !data ? (
						<DashboardError
							section={reporting ? "terminal reporting" : "your decisions"}
							onRetry={() => void query.refetch()}
							retrying={query.isFetching}
						/>
					) : (
						data && (
							<>
								{query.isError && (
									<div className="mb-4">
										<DashboardError
											section={
												reporting ? "terminal reporting" : "your decisions"
											}
											stale
											onRetry={() => void query.refetch()}
											retrying={query.isFetching}
										/>
									</div>
								)}
								{reporting && (
									<p className="mb-3 text-sm text-muted-foreground">
										<span className="font-semibold text-foreground">
											{data.total}
										</span>{" "}
										outstanding terminal-report obligations
									</p>
								)}
								{data.items.length === 0 ? (
									<div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
										<CheckCircle2 className="size-6" />
										<p className="text-sm font-medium">
											{reporting
												? "No outstanding terminal reports"
												: "No pending items in this queue"}
										</p>
										<p className="text-xs">
											{reporting
												? "Completed packages awaiting approval appear under Your Decisions."
												: "New items will appear here as proposals and projects progress."}
										</p>
									</div>
								) : (
									<ul className="divide-y divide-border">
										{data.items.map((item) => (
											<li
												key={item.id}
												className="flex flex-col justify-between gap-3 py-4 first:pt-0 sm:flex-row sm:items-center"
											>
												<div className="min-w-0 space-y-1">
													<p className="break-words text-sm font-medium text-foreground">
														{item.title}
													</p>
													<p className="text-xs text-muted-foreground">
														{item.unitLabel} · {item.leader}
													</p>
													{item.dueAt ? (
														<div className="flex flex-wrap items-center gap-2 text-xs">
															<Badge variant="outline">{item.status}</Badge>
															{item.overdue && (
																<Badge variant="destructive">Overdue</Badge>
															)}
															{!item.overdue &&
																Date.parse(item.dueAt) - Date.now() <=
																	7 * 86400000 && (
																	<Badge variant="secondary">Due soon</Badge>
																)}
															<span className="text-muted-foreground">
																Due{" "}
																{format(
																	toManilaDisplayDate(item.dueAt),
																	"MMM d, yyyy",
																)}{" "}
																· Project Leader
															</span>
														</div>
													) : item.since ? (
														<p className="text-xs text-muted-foreground">
															Waiting{" "}
															{Math.max(
																0,
																Math.floor(
																	(Date.now() - Date.parse(item.since)) /
																		86400000,
																),
															)}{" "}
															days · Since{" "}
															{format(
																toManilaDisplayDate(item.since),
																"MMM d, yyyy",
															)}
														</p>
													) : null}
													{Boolean(item.missingRequirements?.length) && (
														<ul
															aria-label="Missing terminal-package requirements"
															className="mt-2 list-inside list-disc text-xs text-muted-foreground"
														>
															{item.missingRequirements.map((requirement) => (
																<li key={requirement}>{requirement}</li>
															))}
														</ul>
													)}
												</div>
												<div className="shrink-0">
													<WorkItemLink item={item} queue={queue}>
														{action}
													</WorkItemLink>
												</div>
											</li>
										))}
									</ul>
								)}
								{queue === "activation" && (
									<p className="mt-3 text-xs text-muted-foreground">
										Signed scans and the submitted Special Order are recorded.
										Choose a valid MOA and set report dates in the activation
										wizard.
									</p>
								)}
								{!expanded && data.total > 5 && (
									<Button
										variant="outline"
										size="sm"
										className="mt-4"
										onClick={() => setExpanded(true)}
									>
										View all {data.total} items
										<ArrowRight className="size-4" />
									</Button>
								)}
								{expanded && (
									<>
										<PaginationBar
											page={data.page}
											totalPages={Math.ceil(data.total / data.limit)}
											total={data.total}
											limit={data.limit}
											onPageChange={setPage}
											isLoading={query.isFetching}
										/>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												setExpanded(false);
											}}
										>
											Show preview
										</Button>
									</>
								)}
							</>
						)
					)}
				</QueuePanel>
			</CardContent>
		</Card>
	);
	return reporting ? (
		card
	) : (
		<Tabs
			value={queue}
			onValueChange={(value) => {
				void update({
					decisionQueue: value as Exclude<DirectorWorkQueue, "reports">,
					decisionPage: 1,
					decisionExpanded: false,
				});
			}}
		>
			{card}
		</Tabs>
	);
}
