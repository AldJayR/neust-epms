import { useQuery } from "@tanstack/react-query";
import { FileText, Users, Calendar, Target, HelpCircle } from "lucide-react";
import { proposalRequirementsQueryOptions } from "@/lib/ret.functions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ProposalStepRequirements() {
	const { data: requirements, isLoading } = useQuery(
		proposalRequirementsQueryOptions(),
	);

	if (isLoading) {
		return (
			<div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
				Loading checklist requirements...
			</div>
		);
	}

	const reqList = [
		{
			title: "Project Overview",
			icon: <Target className="size-4 text-muted-foreground" />,
			desc: requirements?.sdgs.description || "Project title, category, locale, and SDG alignments.",
		},
		{
			title: "Timeline & Budget",
			icon: <Calendar className="size-4 text-muted-foreground" />,
			desc: requirements?.dates.description || "Start/end implementation dates and budget allocation.",
		},
		{
			title: "Team Composition",
			icon: <Users className="size-4 text-muted-foreground" />,
			desc: requirements?.members.description || "Assigned faculty roles (Project Leader role is mandatory).",
		},
		{
			title: "Proposal PDF Document",
			icon: <FileText className="size-4 text-muted-foreground" />,
			desc: requirements?.documents[0]?.description || "PDF upload of the physical signed proposal form.",
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-lg border border-border bg-muted p-4">
				<h3 className="text-sm font-semibold text-foreground">
					Pre-Submission Checklist
				</h3>
				<p className="text-xs text-muted-foreground mt-1 leading-relaxed">
					Please prepare the following details before submitting. You may save your progress as a Draft at any point and complete these requirements later.
				</p>
			</div>

			<div className="grid gap-3">
				{reqList.map((req) => (
					<div
						key={req.title}
						className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background"
					>
						<div className="flex size-8 items-center justify-center rounded-lg bg-muted shrink-0">
							{req.icon}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-1.5">
								<h4 className="text-sm font-medium text-foreground">{req.title}</h4>
								<Tooltip>
									<TooltipTrigger
										render={
											<HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
										}
									/>
									<TooltipContent className="text-xs max-w-xs">{req.desc}</TooltipContent>
								</Tooltip>
							</div>
							<p className="text-xs text-muted-foreground mt-0.5">
								{req.desc}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
