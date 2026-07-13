import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReadinessPrerequisite } from "./readiness.functions";

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
		<Card size="sm" className={className}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-base font-semibold">
							Project Activation Readiness
						</CardTitle>
						<CardDescription className="text-xs">
							Pre-implementation compliance and checklist
						</CardDescription>
					</div>
					<Badge variant={isReady ? "default" : "secondary"}>
						{isReady ? "Ready" : "Pending"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="pt-0 flex flex-col gap-4">
				<div className="grid gap-3 sm:grid-cols-2">
					{prerequisites.map((req) => (
						<Tooltip key={req.name}>
							<TooltipTrigger
								render={
									<div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background text-sm">
										{req.complete ? (
											<CheckCircle2
												className="size-4 text-green-600 shrink-0 mt-0.5"
												aria-hidden="true"
											/>
										) : (
											<XCircle
												className="size-4 text-muted-foreground shrink-0 mt-0.5"
												aria-hidden="true"
											/>
										)}
										<div className="min-w-0">
											<p className="font-medium text-foreground truncate">
												{req.name}
											</p>
											<p className="text-xs text-muted-foreground truncate">
												{req.details}
											</p>
											<p className="text-[10px] text-muted-foreground mt-1">
												{req.owner}
											</p>
										</div>
									</div>
								}
							/>
							<TooltipContent>
								<div className="text-xs max-w-xs space-y-1">
									<p className="font-semibold">{req.name}</p>
									<p>{req.details}</p>
									<p className="text-muted-foreground">Owner: {req.owner}</p>
								</div>
							</TooltipContent>
						</Tooltip>
					))}
				</div>

				{!isReady && blocker && (
					<div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-muted text-sm">
						<AlertCircle className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
						<span className="text-muted-foreground">
							<span className="font-medium text-foreground">Blocked:</span>{" "}
							{blocker}
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
