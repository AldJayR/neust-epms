import { PageCard } from "@/components/custom/page-card";
import type { AnalyticsView } from "./schema";

type Breakdown = {
	key: string;
	label: string;
	projects: number;
	trainees: number | null;
	recorded: number;
	missing: number;
};

export function BreakdownCard({
	title,
	groups,
	view,
	onSelect,
}: {
	title: string;
	groups: Breakdown[];
	view: AnalyticsView;
	onSelect: (key: string) => void;
}) {
	const measure = (group: Breakdown) =>
		view === "reach" ? (group.trainees ?? 0) : group.projects;
	const ranked = [...groups]
		.sort((a, b) => measure(b) - measure(a))
		.slice(0, 10);
	const maximum = Math.max(1, ...ranked.map(measure));
	return (
		<PageCard className="space-y-4 p-4">
			<h2 className="font-semibold">{title}</h2>
			{groups.length === 0 ? (
				<p className="text-muted-foreground">
					No records match this scope and period.
				</p>
			) : (
				<>
					<figure
						aria-label={
							view === "reach"
								? "Reported trainees by unit"
								: "Project coverage by category"
						}
						className="space-y-3"
					>
						{ranked.map((group) => (
							<div
								key={group.key}
								className="grid grid-cols-[minmax(100px,1fr)_2fr_auto] items-center gap-3 text-sm"
							>
								<button
									type="button"
									className="truncate text-left text-primary underline"
									title={group.label}
									onClick={() => onSelect(group.key)}
								>
									{group.label}
								</button>
								<div className="h-3 rounded bg-muted" aria-hidden="true">
									<div
										className="h-3 rounded bg-primary"
										style={{ width: `${(measure(group) / maximum) * 100}%` }}
									/>
								</div>
								<span>{measure(group).toLocaleString()}</span>
							</div>
						))}
						<figcaption className="text-xs text-muted-foreground">
							{view === "reach"
								? "Reported trainees"
								: "Projects and proposals"}{" "}
							· Up to 10 categories shown. Full breakdown below.
						</figcaption>
					</figure>
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<caption className="sr-only">{title}</caption>
							<thead>
								<tr>
									<th scope="col" className="p-2">
										Unit / category
									</th>
									<th scope="col" className="p-2">
										Projects
									</th>
									{view === "reach" && (
										<>
											<th scope="col" className="p-2">
												Trainees
											</th>
											<th scope="col" className="p-2">
												Missing counts
											</th>
										</>
									)}
								</tr>
							</thead>
							<tbody>
								{groups.map((group) => (
									<tr key={group.key} className="border-t">
										<th scope="row" className="p-2 font-normal">
											<button
												type="button"
												className="text-primary underline"
												onClick={() => onSelect(group.key)}
											>
												{group.label}
											</button>
										</th>
										<td className="p-2">{group.projects}</td>
										{view === "reach" && (
											<>
												<td className="p-2">
													{group.trainees?.toLocaleString()}
												</td>
												<td className="p-2">{group.missing}</td>
											</>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}
		</PageCard>
	);
}
