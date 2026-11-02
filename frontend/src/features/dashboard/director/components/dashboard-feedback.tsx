import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardError({
	onRetry,
	retrying = false,
	section,
	stale = false,
}: {
	onRetry: () => void;
	retrying?: boolean;
	section: string;
	stale?: boolean;
}) {
	return (
		<Alert variant={stale ? "default" : "destructive"}>
			<AlertCircle />
			<AlertTitle>
				Unable to {stale ? "refresh" : "load"} {section}
			</AlertTitle>
			<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
				<p>
					{stale
						? "Showing previously loaded data. Check the update timestamp before acting."
						: "Please try again. Other dashboard sections are still available."}
				</p>
				<Button
					variant="outline"
					size="sm"
					disabled={retrying}
					onClick={onRetry}
				>
					{retrying ? "Retrying…" : "Try again"}
				</Button>
			</AlertDescription>
		</Alert>
	);
}

export function DashboardLoading() {
	return (
		<div role="status" className="space-y-3 py-4">
			<span className="sr-only">Loading dashboard section</span>
			<Skeleton className="h-5 w-48" />
			<Skeleton className="h-20 w-full" />
			<Skeleton className="h-20 w-full" />
		</div>
	);
}

export function DashboardUpdatedAt({
	timestamp,
	refreshing,
}: {
	timestamp: number;
	refreshing: boolean;
}) {
	return (
		<p className="text-xs text-muted-foreground" role="status">
			{refreshing
				? "Refreshing…"
				: timestamp
					? `Updated ${new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(timestamp)} · Manila time`
					: ""}
		</p>
	);
}
