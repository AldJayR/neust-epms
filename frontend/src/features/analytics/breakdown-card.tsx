import { PageCard } from "@/components/custom/page-card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
				<Empty className="p-6">
					<EmptyHeader>
						<EmptyTitle>No results</EmptyTitle>
						<EmptyDescription>
							No records match this scope and period. Try another period or
							reset your filters.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
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
					<Table>
						<TableCaption className="sr-only">{title}</TableCaption>
						<TableHeader>
							<TableRow>
								<TableHead>Unit / category</TableHead>
								<TableHead>Projects</TableHead>
								{view === "reach" && (
									<>
										<TableHead>Trainees</TableHead>
										<TableHead>Missing counts</TableHead>
									</>
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{groups.map((group) => (
								<TableRow key={group.key}>
									<TableHead scope="row" className="font-normal">
										<button
											type="button"
											className="text-primary underline"
											onClick={() => onSelect(group.key)}
										>
											{group.label}
										</button>
									</TableHead>
									<TableCell>{group.projects}</TableCell>
									{view === "reach" && (
										<>
											<TableCell>{group.trainees?.toLocaleString()}</TableCell>
											<TableCell>{group.missing}</TableCell>
										</>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</>
			)}
		</PageCard>
	);
}
