import { Skeleton } from "@/components/ui/skeleton";

const METRIC_KEYS = ["first", "second", "third", "fourth", "fifth"];
const ROW_KEYS = ["first", "second", "third", "fourth", "fifth"];

interface PageSkeletonProps {
	title: string;
	actionText?: string;
	metricsCount?: number;
	columnWidths: string[];
}

export function PageSkeleton({
	title,
	actionText,
	metricsCount = 3,
	columnWidths,
}: PageSkeletonProps) {
	return (
		<div className="flex flex-col gap-8 animate-pulse">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-foreground/80">{title}</h1>
				{actionText && <Skeleton className="h-9 w-32 rounded-lg" />}
			</div>

			{/* Metric Cards */}
			{metricsCount > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{METRIC_KEYS.slice(0, metricsCount).map((key) => (
						<div
							key={key}
							className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm"
						>
							<Skeleton className="h-4 w-24 rounded" />
							<Skeleton className="h-8 w-16 rounded" />
						</div>
					))}
				</div>
			)}

			{/* Table area */}
			<div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
				{/* Toolbar */}
				<div className="flex items-center justify-between gap-4">
					<Skeleton className="h-9 w-64 rounded-lg" />
					<Skeleton className="h-9 w-24 rounded-lg" />
				</div>
				{/* Headers */}
				<div className="flex gap-4 border-b border-border pb-3 pt-2">
					{columnWidths.map((width) => (
						<div key={`header-${width}`} className={width}>
							<Skeleton className="h-4 w-[75%] rounded" />
						</div>
					))}
				</div>
				{/* Rows */}
				{ROW_KEYS.map((rowKey) => (
					<div
						key={rowKey}
						className="flex gap-4 py-4 border-b border-border/40"
					>
						{columnWidths.map((width) => (
							<div key={`cell-${width}`} className={width}>
								<Skeleton className="h-4 w-[85%] rounded" />
							</div>
						))}
					</div>
				))}
			</div>
		</div>
	);
}

export function DefaultPageSkeleton() {
	return (
		<PageSkeleton
			title="Loading Page..."
			columnWidths={["w-[30%]", "w-[20%]", "w-[25%]", "w-[15%]", "w-[10%]"]}
		/>
	);
}
