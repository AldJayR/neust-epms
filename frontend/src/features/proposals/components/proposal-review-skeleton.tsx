import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProposalReviewSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			{/* Breadcrumb */}
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<span>Dashboard</span>
				<span>/</span>
				<span>Project Details</span>
				<span>/</span>
				<span className="text-foreground font-medium">Proposal Review</span>
			</div>

			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Skeleton className="h-8 w-64 rounded-md" />
					<Skeleton className="h-5 w-24 rounded-full" />
				</div>
				<Skeleton className="h-9 w-28 rounded-lg" />
			</div>

			{/* Stepper Card */}
			<div className="bg-card border border-border rounded-xl p-6 shadow-sm">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Skeleton className="size-8 rounded-full" />
						<div className="flex flex-col gap-1.5">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-16" />
						</div>
					</div>
					<div className="flex-1 h-0.5 bg-muted mx-4" />
					<div className="flex items-center gap-3">
						<Skeleton className="size-8 rounded-full" />
						<div className="flex flex-col gap-1.5">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-16" />
						</div>
					</div>
					<div className="flex-1 h-0.5 bg-muted mx-4" />
					<div className="flex items-center gap-3">
						<Skeleton className="size-8 rounded-full" />
						<div className="flex flex-col gap-1.5">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-16" />
						</div>
					</div>
				</div>
			</div>

			{/* Main Content Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
				{/* Left Column: PDF Viewer Placeholder */}
				<div className="lg:col-span-8 flex flex-col gap-4">
					<div className="bg-muted border border-border rounded-[12px] shadow-[0_1px_3px_0_var(--shadow-card)] overflow-hidden h-[844px] flex items-center justify-center p-6">
						<div className="flex flex-col items-center gap-4">
							<Skeleton className="h-10 w-10 rounded-full" />
							<Skeleton className="h-4 w-48" />
							<Skeleton className="h-3 w-32" />
						</div>
					</div>
				</div>

				{/* Right Column: Details & Actions */}
				<div className="lg:col-span-4 flex flex-col gap-6">
					<Card className="border-border shadow-[0_1px_3px_0_var(--shadow-card)] rounded-[12px] overflow-hidden pt-2 pb-0 gap-0">
						{/* Tabs Header */}
						<div className="border-b border-border px-4 py-3 flex gap-4">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-4 w-20" />
						</div>

						{/* Details Section */}
						<div className="p-5 space-y-4">
							<div className="flex justify-between items-center">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-32" />
							</div>
							<div className="flex justify-between items-center">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-28" />
							</div>
							<div className="flex justify-between items-center">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-4 w-24" />
							</div>
							<div className="flex justify-between items-center">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-4 w-20" />
							</div>
							<div className="flex justify-between items-center">
								<Skeleton className="h-4 w-12" />
								<Skeleton className="h-4 w-16" />
							</div>
						</div>

						<div className="px-5 py-2">
							<div className="h-px bg-border" />
						</div>

						{/* Attached Documents */}
						<div className="p-5 space-y-3">
							<Skeleton className="h-4 w-36" />
							<div className="space-y-2">
								<div className="p-3 border border-border rounded-md flex flex-col gap-1.5">
									<Skeleton className="h-4 w-40" />
									<Skeleton className="h-3 w-24" />
								</div>
								<div className="p-3 border border-border rounded-md flex flex-col gap-1.5">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-20" />
								</div>
							</div>
						</div>

						<div className="px-5 py-2">
							<div className="h-px bg-border" />
						</div>

						{/* Action Buttons */}
						<div className="p-5 flex gap-3">
							<Skeleton className="h-9 flex-1 rounded-lg" />
							<Skeleton className="h-9 flex-1 rounded-lg" />
						</div>
						<div className="px-5 pb-4 text-center">
							<Skeleton className="h-3 w-40 mx-auto" />
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
