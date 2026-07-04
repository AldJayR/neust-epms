import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/custom/page-header";
import { PageCard } from "@/components/custom/page-card";

export function SettingsSkeleton() {
	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title={<Skeleton className="h-8 w-28 rounded" />}
			/>

			<PageCard className="p-6">
				<Skeleton className="h-5 w-32 rounded mb-4" />
				<div className="space-y-4">
					<div className="flex flex-col gap-1.5">
						<Skeleton className="h-4 w-48 rounded" />
						<Skeleton className="h-9 w-32 rounded-md" />
						<Skeleton className="h-3 w-72 rounded" />
					</div>
					<Skeleton className="h-9 w-20 rounded-lg" />
				</div>
			</PageCard>

			<PageCard className="p-6">
				<Skeleton className="h-5 w-36 rounded mb-4" />
				<div className="space-y-4">
					<div className="flex items-baseline gap-4">
						<Skeleton className="h-4 w-36 shrink-0 rounded" />
						<Skeleton className="h-4 w-24 rounded" />
					</div>
					<div className="flex items-baseline gap-4">
						<Skeleton className="h-4 w-36 shrink-0 rounded" />
						<Skeleton className="h-4 w-16 rounded" />
					</div>
					<div className="flex items-baseline gap-4">
						<Skeleton className="h-4 w-36 shrink-0 rounded" />
						<Skeleton className="h-4 w-20 rounded" />
					</div>
					<div className="flex items-baseline gap-4">
						<Skeleton className="h-4 w-36 shrink-0 rounded" />
						<Skeleton className="h-4 w-28 rounded" />
					</div>
				</div>
			</PageCard>
		</div>
	);
}
