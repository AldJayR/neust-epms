import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "#/lib/utils";
import type { ReadinessPrerequisite } from "@/lib/project-readiness.functions";

interface ProjectReadinessCardProps {
	isReady: boolean;
	prerequisites: ReadinessPrerequisite[];
	blocker: string | null;
	className?: string;
}

export function ProjectReadinessCard({
	isReady,
	prerequisites,
	blocker,
	className,
}: ProjectReadinessCardProps) {
	return (
		<Card size="sm" className={cn("w-full border shadow-2xs", isReady ? "border-green-500/20 bg-green-50/5" : "border-amber-500/20 bg-amber-50/5", className)}>
			<CardHeader className="pb-3 border-b border-border/40">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-base font-semibold">Project Activation Readiness</CardTitle>
						<CardDescription className="text-xs">
							Pre-implementation compliance and checklist
						</CardDescription>
					</div>
					<BadgeStatus isReady={isReady} />
				</div>
			</CardHeader>
			<CardContent className="pt-4 flex flex-col gap-4">
				<div className="grid gap-3 sm:grid-cols-2">
					{prerequisites.map((req) => {
						return (
							<Tooltip key={req.name}>
								<TooltipTrigger
									render={
										<div
											tabIndex={0}
											className={cn(
												"flex items-start gap-3 p-3 rounded-lg border text-sm transition-colors cursor-help focus-visible:ring-2 focus-visible:ring-ring outline-none",
												req.complete
													? "border-green-500/10 bg-green-500/5 hover:bg-green-500/10"
													: "border-zinc-500/10 bg-zinc-500/5 hover:bg-zinc-500/10"
											)}
										>
											{req.complete ? (
												<CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
											) : (
												<XCircle className="size-5 text-zinc-500 shrink-0 mt-0.5" aria-hidden="true" />
											)}
											<div className="min-w-0">
												<p className="font-semibold text-foreground truncate">{req.name}</p>
												<p className="text-xs text-muted-foreground truncate">{req.details}</p>
												<p className="text-[10px] font-medium text-brand-primary mt-1">
													Owner: {req.owner}
												</p>
											</div>
										</div>
									}
								/>
								<TooltipContent>
									<div className="text-xs max-w-xs space-y-1">
										<p className="font-semibold">{req.name}</p>
										<p>{req.details}</p>
										<p className="text-muted-foreground">Action Owner: {req.owner}</p>
									</div>
								</TooltipContent>
							</Tooltip>
						);
					})}
				</div>

				{!isReady && blocker && (
					<div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-400">
						<AlertCircle className="size-4 shrink-0 mt-0.5" />
						<div className="text-xs">
							<span className="font-semibold">Blocked: </span>
							<span>Activation requires completion of <strong>{blocker}</strong>.</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function BadgeStatus({ isReady }: { isReady: boolean }) {
	return isReady ? (
		<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 border border-green-500/20">
			Ready
		</span>
	) : (
		<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
			Prerequisites Pending
		</span>
	);
}
