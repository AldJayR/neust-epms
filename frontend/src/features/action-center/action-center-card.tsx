import { Link } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle,
	ClipboardList,
	Eye,
	FileText,
	FolderOpen,
	Handshake,
	Loader2,
	UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActionCenter } from "@/hooks/use-action-center";
import type { ActionItem } from "./functions";
import { partitionActionItems } from "./helpers/action-center-helpers";

function getCategoryIcon(type: ActionItem["type"]) {
	const classes = "size-4 shrink-0";
	switch (type) {
		case "proposal":
			return <FileText className={classes} />;
		case "project":
			return <FolderOpen className={classes} />;
		case "moa":
			return <Handshake className={classes} />;
		case "report":
			return <ClipboardList className={classes} />;
		case "registration":
			return <UserPlus className={classes} />;
	}
}

function getNavigationRoute(type: ActionItem["type"], id: string) {
	switch (type) {
		case "proposal":
			return {
				to: "/proposals/$proposalId" as const,
				params: { proposalId: id },
			};
		case "project":
			return { to: "/projects/$projectId" as const, params: { projectId: id } };
		case "moa":
			return { to: "/moas/$moaId" as const, params: { moaId: id } };
		case "report":
			return { to: "/projects/$projectId" as const, params: { projectId: id } };
		case "registration":
			return { to: "/admin" as const, params: {} };
	}
}

function getUrgencyLabel(urgency: ActionItem["urgency"]) {
	if (urgency === "urgent") return "Urgent";
	if (urgency === "soon") return "Due soon";
	return "Routine";
}

function getUrgencyClassName(urgency: ActionItem["urgency"]) {
	if (urgency === "urgent") {
		return "bg-danger/10 text-danger";
	}
	if (urgency === "soon") {
		return "bg-warning/10 text-warning";
	}
	return "bg-muted text-muted-foreground";
}

function ActionItemsList({
	items,
	emptyIcon: EmptyIcon,
	emptyTitle,
	emptyDescription,
}: {
	items: ActionItem[];
	emptyIcon: typeof CheckCircle | typeof Eye | typeof Loader2;
	emptyTitle: string;
	emptyDescription: string;
}) {
	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
				<EmptyIcon className="mb-2 size-6 text-muted-foreground/50" />
				<p className="text-sm font-medium">{emptyTitle}</p>
				<p className="text-xs">{emptyDescription}</p>
			</div>
		);
	}

	return (
		<div className="flex max-h-[300px] flex-col divide-y divide-border overflow-y-auto pr-1">
			{items.map((item) => {
				const routeConfig = getNavigationRoute(item.type, item.id);
				const actionLabel = `Open ${item.type} action: ${item.title}`;

				return (
					<div
						key={`${item.type}-${item.dateId ?? item.id}`}
						className="group/item flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
					>
						<div className="flex min-w-0 items-start gap-3">
							<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
								{getCategoryIcon(item.type)}
							</div>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<h4
										className="max-w-[280px] truncate text-sm font-medium text-foreground sm:max-w-[450px]"
										title={item.title}
									>
										{item.title}
									</h4>
									<span
										className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${getUrgencyClassName(item.urgency)}`}
									>
										{getUrgencyLabel(item.urgency)}
									</span>
								</div>
								<p className="mt-0.5 text-xs text-muted-foreground">
									{item.actionRequired}
									{item.derivedState !== "ACT" && ` · Owner: ${item.owner}`}
								</p>
							</div>
						</div>
						<Button
							size="icon-sm"
							variant="ghost"
							nativeButton={false}
							className="shrink-0 rounded-full"
							aria-label={actionLabel}
							render={
								routeConfig.params ? (
									<Link to={routeConfig.to} params={routeConfig.params} />
								) : (
									<Link to={routeConfig.to} />
								)
							}
						>
							<ArrowRight className="size-4 text-muted-foreground transition-colors group-hover/item:text-foreground" />
						</Button>
					</div>
				);
			})}
		</div>
	);
}

export function ActionCenterCard() {
	const { data, isLoading, error, refetch, isRefetching } = useActionCenter();

	if (isLoading) {
		return (
			<Card size="sm" className="w-full">
				<CardContent className="flex min-h-32 items-center justify-center gap-2">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
					<span className="text-sm text-muted-foreground">
						Loading your work queue...
					</span>
				</CardContent>
			</Card>
		);
	}

	if (error || !data) {
		return (
			<Card size="sm" className="w-full">
				<CardContent className="flex flex-col items-start gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-3">
						<AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
						<div>
							<p className="text-sm font-medium text-foreground">
								Action Center unavailable
							</p>
							<p className="text-xs text-muted-foreground">
								Your dashboard is still available. Try loading your work queue
								again.
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						disabled={isRefetching}
						onClick={() => void refetch()}
					>
						{isRefetching ? "Retrying..." : "Try again"}
					</Button>
				</CardContent>
			</Card>
		);
	}

	const { actItems, waitItems, watchItems } = partitionActionItems(
		data.actItems,
		data.watchItems,
	);
	const totalItems = actItems.length + waitItems.length + watchItems.length;

	if (totalItems === 0) {
		return (
			<Card size="sm" className="w-full">
				<CardContent className="flex items-center gap-3 py-4">
					<CheckCircle className="size-5 text-success" />
					<div>
						<p className="text-sm font-medium text-foreground">
							You are all caught up
						</p>
						<p className="text-xs text-muted-foreground">
							No action is required from your current work queue.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card size="sm" className="w-full">
			<CardHeader className="gap-1 pb-3">
				<CardTitle className="text-base font-semibold">Action Center</CardTitle>
				<p className="text-xs text-muted-foreground">
					A focused view of the work that needs attention next.
				</p>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="mb-4 grid grid-cols-3 gap-2 border-y border-border py-3">
					{[
						["Needs action", actItems.length, "text-danger"],
						["Waiting", waitItems.length, "text-warning"],
						["Monitoring", watchItems.length, "text-muted-foreground"],
					].map(([label, count, color]) => (
						<div key={label} className="min-w-0">
							<p className="truncate text-[11px] text-muted-foreground">
								{label}
							</p>
							<p className={`text-lg font-semibold ${color}`}>{count}</p>
						</div>
					))}
				</div>

				<Tabs defaultValue="action" className="w-full">
					<TabsList
						variant="line"
						className="mb-4 w-full justify-start gap-4 overflow-x-auto border-b border-border pb-px"
					>
						<TabsTrigger value="action" className="px-1 pb-2 font-semibold">
							Needs Action
							{actItems.length > 0 && (
								<span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger/10 px-1 text-[10px] font-bold text-danger">
									{actItems.length}
								</span>
							)}
						</TabsTrigger>
						<TabsTrigger value="waiting" className="px-1 pb-2 font-semibold">
							Waiting
							{waitItems.length > 0 && (
								<span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/10 px-1 text-[10px] font-bold text-warning">
									{waitItems.length}
								</span>
							)}
						</TabsTrigger>
						<TabsTrigger value="monitoring" className="px-1 pb-2 font-semibold">
							Monitoring
							{watchItems.length > 0 && (
								<span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold text-muted-foreground">
									{watchItems.length}
								</span>
							)}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="action" className="outline-none">
						<ActionItemsList
							items={actItems}
							emptyIcon={CheckCircle}
							emptyTitle="No pending actions"
							emptyDescription="Nothing needs your immediate attention."
						/>
					</TabsContent>
					<TabsContent value="waiting" className="outline-none">
						<ActionItemsList
							items={waitItems}
							emptyIcon={Loader2}
							emptyTitle="Nothing is waiting"
							emptyDescription="No work is currently waiting on another owner."
						/>
					</TabsContent>
					<TabsContent value="monitoring" className="outline-none">
						<ActionItemsList
							items={watchItems}
							emptyIcon={Eye}
							emptyTitle="No monitored items"
							emptyDescription="Items you are tracking will appear here."
						/>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
