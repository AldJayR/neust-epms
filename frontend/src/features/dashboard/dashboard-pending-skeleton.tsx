import { Skeleton } from "@/components/ui/skeleton";
import type { AuthUser } from "@/lib/auth";
import { isDirector, isRETChair, isSuperAdmin } from "@/lib/permissions";

const THREE_METRICS = ["first", "second", "third"];
const FOUR_METRICS = [...THREE_METRICS, "fourth"];
const FOUR_ROWS = ["first", "second", "third", "fourth"];
const FIVE_ROWS = [...FOUR_ROWS, "fifth"];
const TABLE_COLUMNS = ["first", "second", "third", "fourth", "fifth"];

function HeaderSkeleton({ action = true }: { action?: boolean }) {
	return (
		<div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="flex flex-col gap-2">
				<Skeleton className="h-8 w-64 max-w-full rounded-md" />
				<Skeleton className="h-4 w-80 max-w-full rounded-md" />
			</div>
			{action && <Skeleton className="h-9 w-56 rounded-lg" />}
		</div>
	);
}

function ActionCenterSkeleton() {
	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-col gap-2">
					<Skeleton className="h-5 w-36 rounded" />
					<Skeleton className="h-4 w-72 max-w-full rounded" />
				</div>
				<Skeleton className="h-9 w-28 rounded-lg" />
			</div>
		</div>
	);
}

function MetricsSkeleton({ count = 3 }: { count?: 3 | 4 }) {
	const keys = count === 4 ? FOUR_METRICS : THREE_METRICS;
	return (
		<div
			className={`grid gap-6 md:grid-cols-3 ${count === 4 ? "xl:grid-cols-4" : ""}`}
		>
			{keys.map((key) => (
				<div key={key} className="rounded-xl border border-border bg-card p-4">
					<Skeleton className="h-4 w-28 rounded" />
					<Skeleton className="mt-4 h-9 w-16 rounded" />
				</div>
			))}
		</div>
	);
}

function TableSkeleton() {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Skeleton className="h-9 w-full rounded-lg sm:max-w-[352px]" />
				<Skeleton className="h-9 w-9 rounded-lg" />
			</div>
			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<div className="grid grid-cols-5 gap-4 border-b border-border px-4 py-3">
					{TABLE_COLUMNS.map((key) => (
						<Skeleton key={key} className="h-4 w-3/4 rounded" />
					))}
				</div>
				{FIVE_ROWS.map((row) => (
					<div
						key={row}
						className="grid grid-cols-5 gap-4 border-b border-border/60 px-4 py-4 last:border-0"
					>
						{TABLE_COLUMNS.map((column) => (
							<Skeleton key={column} className="h-4 w-4/5 rounded" />
						))}
					</div>
				))}
			</div>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Skeleton className="h-4 w-40 rounded" />
				<Skeleton className="h-9 w-52 rounded-lg" />
			</div>
		</div>
	);
}

function AdminDashboardSkeleton() {
	return (
		<div className="flex flex-col gap-8 animate-pulse">
			<HeaderSkeleton />
			<MetricsSkeleton />
			<TableSkeleton />
		</div>
	);
}

function DirectorDashboardSkeleton() {
	return (
		<div className="flex flex-col gap-8 animate-pulse">
			<HeaderSkeleton action={false} />
			<ActionCenterSkeleton />
			<MetricsSkeleton count={4} />
			<div className="grid gap-8 lg:grid-cols-[minmax(0,630px)_minmax(0,1fr)]">
				<Skeleton className="min-h-[340px] rounded-xl" />
				<div className="min-h-[300px] rounded-xl border border-border bg-card p-4">
					<Skeleton className="h-5 w-36 rounded" />
					{FOUR_ROWS.map((key) => (
						<div key={key} className="mt-4 border-t border-border pt-4">
							<Skeleton className="h-4 w-2/3 rounded" />
							<Skeleton className="mt-2 h-3 w-5/6 rounded" />
						</div>
					))}
				</div>
			</div>
			<div className="min-h-[148px] rounded-xl border border-border bg-card p-4">
				<Skeleton className="h-5 w-28 rounded" />
				<Skeleton className="mt-5 h-4 w-full rounded" />
				<Skeleton className="mt-4 h-4 w-3/4 rounded" />
			</div>
		</div>
	);
}

function RetDashboardSkeleton() {
	return (
		<div className="flex flex-col gap-8 animate-pulse">
			<HeaderSkeleton />
			<ActionCenterSkeleton />
			<MetricsSkeleton />
			<TableSkeleton />
		</div>
	);
}

function FacultyDashboardSkeleton() {
	return (
		<div className="flex flex-col gap-8 animate-pulse">
			<HeaderSkeleton />
			<ActionCenterSkeleton />
			<MetricsSkeleton />
			<div className="flex w-full flex-col gap-4">
				{FOUR_ROWS.map((key) => (
					<div
						key={key}
						className="min-h-[112px] rounded-xl border border-border bg-card p-4"
					>
						<div className="flex items-start justify-between gap-4">
							<div className="flex w-1/2 flex-col gap-2">
								<Skeleton className="h-5 w-3/4 rounded" />
								<Skeleton className="h-3 w-1/2 rounded" />
							</div>
							<Skeleton className="h-[22px] w-24 rounded-lg" />
						</div>
						<div className="mt-4 flex items-center justify-between">
							<Skeleton className="h-[22px] w-28 rounded-lg" />
							<Skeleton className="h-4 w-20 rounded" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export function DashboardPendingSkeleton({ user }: { user: AuthUser }) {
	if (isSuperAdmin(user)) return <AdminDashboardSkeleton />;
	if (isDirector(user)) return <DirectorDashboardSkeleton />;
	if (isRETChair(user)) return <RetDashboardSkeleton />;
	return <FacultyDashboardSkeleton />;
}
