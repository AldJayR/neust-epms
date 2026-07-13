import { Link } from "@tanstack/react-router";
import {
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

export function ActionCenterCard() {
	const { data, isLoading, error } = useActionCenter();

	if (isLoading) {
		return (
			<Card size="sm" className="w-full">
				<CardContent className="flex h-32 items-center justify-center gap-2">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
					<span className="text-muted-foreground text-sm">
						Loading Action Center...
					</span>
				</CardContent>
			</Card>
		);
	}

	if (error || !data) {
		return null;
	}

	const { actItems, watchItems } = data;

	const isEmpty = actItems.length === 0 && watchItems.length === 0;

	if (isEmpty) {
		return (
			<Card size="sm" className="w-full">
				<CardContent className="flex items-center gap-3 py-3">
					<CheckCircle className="size-4 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">
						All caught up — no pending actions.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card size="sm" className="w-full">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-base font-semibold">Action Center</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				<Tabs defaultValue="action" className="w-full">
					<TabsList
						variant="line"
						className="w-full justify-start border-b border-border pb-px mb-4 gap-4"
					>
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
								<span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold text-muted-foreground leading-none">
									{watchItems.length}
								</span>
							)}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="action" className="outline-none">
						<div className="flex flex-col divide-y divide-border max-h-[300px] overflow-y-auto pr-1">
							{actItems.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
									<CheckCircle className="size-6 text-muted-foreground/50 mb-2" />
									<p className="text-sm font-medium">All caught up!</p>
									<p className="text-xs">No pending actions required.</p>
								</div>
							) : (
								actItems.map((item) => {
									const routeConfig = getNavigationRoute(item.type, item.id);
									return (
										<div
											key={`${item.type}-${item.dateId ?? item.id}`}
											className="group/item flex items-center justify-between py-3 first:pt-0 last:pb-0"
										>
											<div className="flex items-center gap-3 min-w-0">
												<div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
													{getCategoryIcon(item.type)}
												</div>
												<div className="min-w-0">
													<h4 className="text-sm font-medium text-foreground truncate max-w-[280px] sm:max-w-[450px]">
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
												nativeButton={false}
												className="shrink-0 rounded-full"
												render={
													routeConfig.params ? (
														<Link
															to={routeConfig.to}
															params={routeConfig.params}
														/>
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
						<div className="flex flex-col divide-y divide-border max-h-[300px] overflow-y-auto pr-1">
							{watchItems.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
									<Eye className="size-6 text-muted-foreground/50 mb-2" />
									<p className="text-sm font-medium">No monitored items</p>
									<p className="text-xs">
										Items you are watching will appear here.
									</p>
								</div>
							) : (
								watchItems.map((item) => {
									const routeConfig = getNavigationRoute(item.type, item.id);
									return (
										<div
											key={`${item.type}-${item.dateId ?? item.id}`}
											className="group/item flex items-center justify-between py-3 first:pt-0 last:pb-0"
										>
											<div className="flex items-center gap-3 min-w-0">
												<div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
													{getCategoryIcon(item.type)}
												</div>
												<div className="min-w-0">
													<h4 className="text-sm font-medium text-foreground truncate max-w-[280px] sm:max-w-[450px]">
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
												nativeButton={false}
												className="shrink-0 rounded-full"
												render={
													routeConfig.params ? (
														<Link
															to={routeConfig.to}
															params={routeConfig.params}
														/>
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
