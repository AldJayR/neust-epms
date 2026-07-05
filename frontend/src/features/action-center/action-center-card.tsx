import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	ClipboardList,
	FileText,
	FolderOpen,
	Handshake,
	CheckCircle,
	UserPlus,
	Loader2,
	Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActionCenter } from "@/hooks/use-action-center";
import { cn } from "#/lib/utils";
import type { ActionItem } from "@/lib/action-center.functions";

function getCategoryIcon(type: ActionItem["type"]) {
	const classes = "size-4 shrink-0";
	switch (type) {
		case "proposal":
			return {
				icon: <FileText className={classes} />,
				bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
			};
		case "project":
			return {
				icon: <FolderOpen className={classes} />,
				bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
			};
		case "moa":
			return {
				icon: <Handshake className={classes} />,
				bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
			};
		case "report":
			return {
				icon: <ClipboardList className={classes} />,
				bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
			};
		case "registration":
			return {
				icon: <UserPlus className={classes} />,
				bg: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
			};
	}
}

function getUrgencyBadge(urgency: ActionItem["urgency"]) {
	switch (urgency) {
		case "urgent":
			return (
				<Badge
					variant="outline"
					className="bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full"
				>
					Urgent
				</Badge>
			);
		case "soon":
			return (
				<Badge
					variant="outline"
					className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full"
				>
					Soon
				</Badge>
			);
		case "routine":
			return (
				<Badge
					variant="outline"
					className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full"
				>
					Routine
				</Badge>
			);
	}
}

function getNavigationRoute(type: ActionItem["type"], id: string) {
	switch (type) {
		case "proposal":
			return { to: "/proposals/$proposalId" as const, params: { proposalId: id } };
		case "project":
			return { to: "/projects/$projectId" as const, params: { projectId: id } };
		case "moa":
			return { to: "/moas/$moaId" as const, params: { moaId: id } };
		case "report":
			// Report obligations are completed in the project workspace
			return { to: "/projects/$projectId" as const, params: { projectId: id } };
		case "registration":
			return { to: "/admin" as const, params: {} };
	}
}

export function ActionCenterCard() {
	const { data, isLoading, error } = useActionCenter();

	if (isLoading) {
		return (
			<Card size="sm" className="w-full">
				<CardContent className="flex h-32 items-center justify-center gap-2">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
					<span className="text-muted-foreground text-sm">Loading Action Center...</span>
				</CardContent>
			</Card>
		);
	}

	if (error || !data) {
		return null; // Silent failure to avoid breaking dashboard layout
	}

	const { actItems, watchItems } = data;

	return (
		<Card size="sm" className="w-full border border-border shadow-xs">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div>
					<CardTitle className="text-base font-semibold">Action Center</CardTitle>
					<CardDescription className="text-xs">
						Tasks requiring your attention or oversight
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="pt-2">
				<Tabs defaultValue="action" className="w-full">
					<TabsList variant="line" className="border-b border-border w-full justify-start pb-px mb-4 gap-4">
						<TabsTrigger value="action" className="px-1 pb-2 font-semibold">
							Needs Action
							{actItems.length > 0 && (
								<span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground leading-none">
									{actItems.length}
								</span>
							)}
						</TabsTrigger>
						<TabsTrigger value="monitoring" className="px-1 pb-2 font-semibold">
							Monitoring
							{watchItems.length > 0 && (
								<span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-muted-foreground/20 px-1 text-[10px] font-bold text-muted-foreground leading-none">
									{watchItems.length}
								</span>
							)}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="action" className="outline-none">
						<div className="flex flex-col divide-y divide-border/50 max-h-[300px] overflow-y-auto pr-1">
							{actItems.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
									<CheckCircle className="size-8 text-green-500 mb-2" />
									<p className="text-sm font-medium text-foreground">All caught up!</p>
									<p className="text-xs">No pending actions required.</p>
								</div>
							) : (
								actItems.map((item) => {
									const iconConfig = getCategoryIcon(item.type);
									const routeConfig = getNavigationRoute(item.type, item.id);
									return (
										<div key={`${item.type}-${item.id}`} className="group/item flex items-center justify-between py-3 first:pt-0 last:pb-0">
											<div className="flex items-center gap-3 min-w-0">
												<div className={cn("flex size-8 items-center justify-center rounded-lg border", iconConfig.bg)}>
													{iconConfig.icon}
												</div>
												<div className="min-w-0">
													<div className="flex items-center gap-2 mb-0.5">
														<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-[10px]">
															{item.type}
														</span>
														{getUrgencyBadge(item.urgency)}
													</div>
													<h4 className="text-sm font-semibold text-foreground truncate max-w-[280px] sm:max-w-[450px]">
														{item.title}
													</h4>
													<p className="text-xs text-muted-foreground">
														{item.actionRequired}
													</p>
												</div>
											</div>
											<Button
												size="icon-sm"
												variant="ghost"
												className="rounded-full shrink-0"
												render={
													routeConfig.params ? (
														<Link to={routeConfig.to} params={routeConfig.params} />
													) : (
														<Link to={routeConfig.to} />
													)
												}
											>
												<ArrowRight className="size-4 text-muted-foreground group-hover/item:text-foreground transition-colors" />
											</Button>
										</div>
									);
								})
							)}
						</div>
					</TabsContent>

					<TabsContent value="monitoring" className="outline-none">
						<div className="flex flex-col divide-y divide-border/50 max-h-[300px] overflow-y-auto pr-1">
							{watchItems.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
									<Eye className="size-8 text-muted-foreground mb-2" />
									<p className="text-sm font-medium text-foreground">No monitored items</p>
									<p className="text-xs">Items you are watching will appear here.</p>
								</div>
							) : (
								watchItems.map((item) => {
									const iconConfig = getCategoryIcon(item.type);
									const routeConfig = getNavigationRoute(item.type, item.id);
									return (
										<div key={`${item.type}-${item.id}`} className="group/item flex items-center justify-between py-3 first:pt-0 last:pb-0">
											<div className="flex items-center gap-3 min-w-0">
												<div className={cn("flex size-8 items-center justify-center rounded-lg border", iconConfig.bg)}>
													{iconConfig.icon}
												</div>
												<div className="min-w-0">
													<div className="flex items-center gap-2 mb-0.5">
														<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-[10px]">
															{item.type}
														</span>
														{getUrgencyBadge(item.urgency)}
													</div>
													<h4 className="text-sm font-semibold text-foreground truncate max-w-[280px] sm:max-w-[450px]">
														{item.title}
													</h4>
													<p className="text-xs text-muted-foreground">
														{item.actionRequired}
													</p>
												</div>
											</div>
											<Button
												size="icon-sm"
												variant="ghost"
												className="rounded-full shrink-0"
												render={
													routeConfig.params ? (
														<Link to={routeConfig.to} params={routeConfig.params} />
													) : (
														<Link to={routeConfig.to} />
													)
												}
											>
												<ArrowRight className="size-4 text-muted-foreground group-hover/item:text-foreground transition-colors" />
											</Button>
										</div>
									);
								})
							)}
						</div>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
