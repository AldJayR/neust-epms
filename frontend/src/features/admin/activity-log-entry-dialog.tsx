import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { AuditLog, JsonValue } from "./functions";
import { formatActivityAction } from "./hooks/use-activity-log-view";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
	dateStyle: "medium",
	timeStyle: "medium",
	timeZone: "UTC",
});

const formatTableName = (table: string) =>
	table.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatFieldName = (field: string) =>
	field
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/_/g, " ")
		.replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatValue = (value: JsonValue | undefined) => {
	if (value === null || value === undefined || value === "") {
		return "Not recorded";
	}
	if (typeof value === "string" || typeof value === "number")
		return String(value);
	if (typeof value === "boolean") return value ? "Yes" : "No";
	return JSON.stringify(value, null, 2);
};

export function ActivityLogEntryDialog({
	log,
	onOpenChange,
}: {
	log: AuditLog | null;
	onOpenChange: (open: boolean) => void;
}) {
	const changedFields = log
		? Array.from(
				new Set([
					...Object.keys(log.oldValue ?? {}),
					...Object.keys(log.newValue ?? {}),
				]),
			)
		: [];

	return (
		<Dialog open={log !== null} onOpenChange={onOpenChange}>
			{log && (
				<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Activity log entry</DialogTitle>
						<DialogDescription>Full details of this action.</DialogDescription>
					</DialogHeader>

					<dl className="divide-y divide-border rounded-lg border border-border text-sm">
						{[
							["Action", formatActivityAction(log.action)],
							["Actor", log.actorName ?? "System"],
							["Role", log.actorRole ?? "Automated"],
							[
								"Date and time",
								`${dateTimeFormatter.format(new Date(log.createdAt))} UTC`,
							],
							["Affected record", formatTableName(log.tableAffected)],
							["IP address", log.ipAddress ?? "Not recorded"],
						].map(([label, value]) => (
							<div
								key={label}
								className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-4"
							>
								<dt className="text-muted-foreground">{label}</dt>
								<dd className="min-w-0 break-words font-medium text-foreground">
									{value}
								</dd>
							</div>
						))}
					</dl>

					<section>
						<h3 className="mb-3 text-sm font-semibold">Changed fields</h3>
						{changedFields.length === 0 ? (
							<p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
								No field-level changes were recorded for this action.
							</p>
						) : (
							<div className="overflow-hidden rounded-lg border border-border text-sm">
								{changedFields.map((field) => (
									<div
										key={field}
										className="grid gap-3 border-b border-border p-4 last:border-0 sm:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]"
									>
										<p className="font-medium text-foreground">
											{formatFieldName(field)}
										</p>
										<div>
											<p className="mb-1 text-xs text-muted-foreground">
												Before
											</p>
											<pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 font-sans text-xs text-foreground">
												{formatValue(log.oldValue?.[field])}
											</pre>
										</div>
										<div>
											<p className="mb-1 text-xs text-muted-foreground">
												After
											</p>
											<pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 font-sans text-xs text-foreground">
												{formatValue(log.newValue?.[field])}
											</pre>
										</div>
									</div>
								))}
							</div>
						)}
					</section>
				</DialogContent>
			)}
		</Dialog>
	);
}
