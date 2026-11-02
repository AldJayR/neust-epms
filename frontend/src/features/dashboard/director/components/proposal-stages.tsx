import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type {
	DirectorOverviewFilters,
	DirectorOverviewResponse,
} from "@/types/dashboard";
import { ProjectCountLink } from "./project-count-link";

const stageOrder = [
	"Pending Review",
	"Endorsed",
	"Returned",
	"Approved",
	"Institutionally Approved",
	"Rejected",
];

export function ProposalStages({
	stages,
	filters,
}: {
	stages: DirectorOverviewResponse["proposalStages"];
	filters: DirectorOverviewFilters;
}) {
	const orderedStages = [...stages].sort(
		(a, b) => stageOrder.indexOf(a.status) - stageOrder.indexOf(b.status),
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<h3>Proposal Stages</h3>
				</CardTitle>
				<CardDescription>
					Current proposal statuses. Institutionally approved proposals may
					already be active or completed projects.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ul className="divide-y divide-border">
					{orderedStages.map((stage) => (
						<li
							key={stage.status}
							className="flex items-center justify-between gap-3 py-3 first:pt-0"
						>
							<span>{stage.status}</span>
							<ProjectCountLink
								filters={filters}
								kind="submitted"
								status={stage.status}
								label={`View ${stage.status.toLowerCase()} proposals`}
							>
								{stage.count.toLocaleString()}
							</ProjectCountLink>
						</li>
					))}
				</ul>
				{stages.length === 0 && (
					<p className="py-4 text-sm text-muted-foreground">
						No submitted proposals in this scope.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
