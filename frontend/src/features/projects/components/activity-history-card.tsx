import { format } from "date-fns";
import { FileText } from "lucide-react";
import { PageCard } from "@/components/custom/page-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Activity {
	id: string | number;
	type: "document" | "review" | "edit";
	version: string;
	status: string;
	date: string;
	actorName: string;
	comment?: string;
}

export function ActivityHistoryCard({ history }: { history: Activity[] }) {
	return (
		<PageCard noOverflow>
			<div className="px-6 py-3 border-b border-border">
				<h2 className="text-sm font-semibold text-heading">Activity History</h2>
			</div>
			<div className="px-6 py-4">
				<ul className="relative space-y-6 before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-border">
					{history.map((item, index) => (
						<li key={item.id} className="relative flex items-start gap-4 pl-8">
							<div
								className={`absolute left-0 mt-1 size-[22px] rounded-full border-[3px] border-white shadow-sm ring-1 ring-border ${index === 0 ? "bg-brand-primary" : "bg-background"}`}
							/>
							<div className="flex flex-1 flex-col gap-1">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										{item.type !== "edit" && (
											<span className="text-sm font-medium text-foreground">
												Version {item.version}
											</span>
										)}
										<Badge
											className={`${
												item.status === "Current"
													? "bg-blue-50 text-blue-600 border-blue-100"
													: item.status === "Returned"
														? "bg-red-50 text-red-600 border-red-100"
														: item.status === "Updated"
															? "bg-amber-50 text-amber-600 border-amber-100"
															: "bg-gray-50 text-gray-600 border-gray-100"
											} rounded-md px-2 py-0 h-5 text-[10px] font-semibold uppercase`}
										>
											{item.status}
										</Badge>
									</div>
									<span className="text-xs text-muted-foreground">
										{format(new Date(item.date), "MMM dd, yyyy · hh:mm a")}
									</span>
								</div>
								<p className="text-[13px] text-muted-foreground">
									{item.type === "edit"
										? `Edited by ${item.actorName}`
										: item.status === "Returned"
											? `Returned by ${item.actorName}`
											: item.status === "Endorsed"
												? `Endorsed by ${item.actorName}`
												: item.status === "Approved"
													? `Approved by ${item.actorName}`
													: `Uploaded by ${item.actorName}`}
								</p>
								{item.comment && (
									<div className="rounded-lg border border-dashed border-border bg-card p-3 text-xs italic text-muted-foreground">
										"{item.comment}"
									</div>
								)}
								{item.type === "document" && item.status !== "Current" && (
									<Button
										variant="outline"
										size="sm"
										className="w-fit gap-1.5 rounded-lg border-border h-7 text-xs font-medium text-muted-foreground hover:bg-card"
									>
										<FileText className="size-3" />
										View Version
									</Button>
								)}
							</div>
						</li>
					))}
				</ul>
			</div>
		</PageCard>
	);
}
