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
			icon: <Target className="size-5 text-indigo-500" />,
			desc: requirements?.sdgs.description || "Project title, category, locale, and SDG alignments.",
		},
		{
			title: "Timeline & Budget",
			icon: <Calendar className="size-5 text-amber-500" />,
			desc: requirements?.dates.description || "Start/end implementation dates and budget allocation.",
		},
		{
			title: "Team Composition",
			icon: <Users className="size-5 text-emerald-500" />,
			desc: requirements?.members.description || "Assigned faculty roles (Project Leader role is mandatory).",
		},
		{
			title: "Proposal PDF Document",
			icon: <FileText className="size-5 text-rose-500" />,
			desc: requirements?.documents[0]?.description || "PDF upload of the physical signed proposal form.",
		},
	];

	return (
		<div className="space-y-5">
			<div className="rounded-lg border border-indigo-500/10 bg-indigo-500/5 p-4">
				<h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-400">
					Pre-Submission Checklist
				</h3>
				<p className="text-xs text-muted-foreground mt-1 leading-relaxed">
					Please prepare the following details before submitting. You may save your progress as a **Draft** at any point and complete these requirements later.
				</p>
			</div>

			<div className="grid gap-4">
				{reqList.map((req) => (
					<div
						key={req.title}
						className="flex items-start gap-4 p-3.5 rounded-lg border border-border bg-card shadow-3xs"
					>
						<div className="flex size-9 items-center justify-center rounded-lg bg-muted border border-border/50">
							{req.icon}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-1.5">
								<h4 className="text-sm font-semibold text-foreground">{req.title}</h4>
								<Tooltip>
									<TooltipTrigger render={<HelpCircle className="size-3.5 text-muted-foreground cursor-help focus-visible:ring-2 focus-visible:ring-ring rounded-full outline-none" tabIndex={0} role="img" aria-label="Help details" />} />
									<TooltipContent className="text-xs max-w-xs">{req.desc}</TooltipContent>
								</Tooltip>
							</div>
							<p className="text-xs text-muted-foreground mt-0.5 leading-normal">
								{req.desc}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
