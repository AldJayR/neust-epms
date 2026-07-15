import { Skeleton } from "@/components/ui/skeleton";

const METRIC_KEYS = ["first", "second", "third", "fourth"];
const ROW_KEYS = ["first", "second", "third", "fourth", "fifth"];
const COLUMN_KEYS = ["time", "action", "actor", "type", "menu"];

export function ActivityLogPendingSkeleton() {
	return (
		<div className="flex flex-col gap-8 animate-pulse">
			<div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<h1 className="text-2xl font-semibold text-heading">Activity Log</h1>
				<Skeleton className="h-9 w-28 rounded-lg" />
			</div>

			<div className="grid gap-6 md:grid-cols-4">
				{METRIC_KEYS.map((key) => (
					<div
						key={key}
						className="rounded-xl border border-border bg-card p-4"
					>
						<Skeleton className="h-4 w-32 rounded" />
						<Skeleton className="mt-4 h-9 w-16 rounded" />
					</div>
				))}
			</div>

			<div className="flex flex-col gap-8">
				<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					<Skeleton className="h-9 w-full rounded-lg sm:max-w-[352px]" />
					<Skeleton className="h-9 w-9 rounded-lg" />
				</div>

				<div className="overflow-x-auto rounded-xl border border-border bg-card">
					<div className="min-w-[820px]">
						<div className="grid grid-cols-[140px_minmax(260px,1fr)_200px_130px_40px] gap-4 border-b border-border px-4 py-3">
							{COLUMN_KEYS.map((key) => (
								<Skeleton key={key} className="h-4 w-3/4 rounded" />
							))}
						</div>
						{ROW_KEYS.map((row) => (
							<div
								key={row}
								className="grid grid-cols-[140px_minmax(260px,1fr)_200px_130px_40px] gap-4 border-b border-border/60 px-4 py-3 last:border-0"
							>
								<div className="flex flex-col gap-1.5">
									<Skeleton className="h-4 w-20 rounded" />
									<Skeleton className="h-3 w-16 rounded" />
								</div>
								<Skeleton className="h-4 w-4/5 rounded" />
								<div className="flex flex-col gap-1.5">
									<Skeleton className="h-4 w-28 rounded" />
									<Skeleton className="h-3 w-20 rounded" />
								</div>
								<Skeleton className="h-[22px] w-20 rounded-lg" />
								<Skeleton className="size-8 rounded-md" />
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Skeleton className="h-4 w-44 rounded" />
					<Skeleton className="h-9 w-52 rounded-lg" />
				</div>
			</div>
		</div>
	);
}
