import { Link } from "@tanstack/react-router";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { PageCard } from "@/components/custom/page-card";
import { PageHeader } from "@/components/custom/page-header";
import { DetailsRow } from "@/components/custom/details-row";

export function ProjectDetailsSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			{/* Breadcrumb */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							render={
								<Link to="/dashboard" search={{ page: 1, pageSize: 10 }} />
							}
						>
							Dashboard
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Project Details</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<PageHeader
				title={
					<div className="flex items-center gap-3">
						<Skeleton className="h-7 w-80" />
						<Skeleton className="h-5 w-20 rounded-md" />
						<Skeleton className="h-4 w-16" />
					</div>
				}
				actions={<Skeleton className="h-9 w-48 rounded-lg" />}
			/>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
				{/* Main Column */}
				<div className="lg:col-span-8 flex flex-col gap-6">
					{/* Project Overview */}
					<PageCard>
						<div className="bg-card border-b border-border px-6 py-3">
							<Skeleton className="h-4 w-32" />
						</div>
						<div className="divide-y divide-border">
							<DetailsRow label={<Skeleton className="h-4 w-28" />}>
								<div className="flex items-center gap-3">
									<Skeleton className="size-8 rounded-full" />
									<Skeleton className="h-4 w-32" />
								</div>
							</DetailsRow>
							<DetailsRow label={<Skeleton className="h-4 w-32" />}>
								<Skeleton className="h-4 w-40" />
							</DetailsRow>
							<DetailsRow label={<Skeleton className="h-4 w-20" />}>
								<Skeleton className="h-4 w-36" />
							</DetailsRow>
							<DetailsRow label={<Skeleton className="h-4 w-24" />}>
								<Skeleton className="h-4 w-20" />
							</DetailsRow>
							<DetailsRow label={<Skeleton className="h-4 w-24" />}>
								<div className="flex flex-col items-end gap-1">
									<Skeleton className="h-5 w-28" />
									<Skeleton className="h-3 w-48" />
								</div>
							</DetailsRow>
							<DetailsRow label={<Skeleton className="h-4 w-28" />}>
								<div className="flex items-center gap-4">
									<div className="flex -space-x-2">
										<Skeleton className="size-8 rounded-full" />
										<Skeleton className="size-8 rounded-full" />
										<Skeleton className="size-8 rounded-full" />
									</div>
									<Skeleton className="size-4" />
								</div>
							</DetailsRow>
						</div>
					</PageCard>

					{/* Document History */}
					<PageCard noOverflow>
						<div className="px-6 py-3 border-b border-border">
							<Skeleton className="h-4 w-32" />
						</div>
						<div className="px-6 py-4">
							<div className="relative space-y-6 before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-border">
								{[1, 2].map((i) => (
									<div key={i} className="relative flex items-start gap-4 pl-8">
										<Skeleton className="absolute left-0 mt-1 size-[22px] rounded-full" />
										<div className="flex flex-1 flex-col gap-1">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<Skeleton className="h-4 w-20" />
													<Skeleton className="h-5 w-16 rounded-md" />
												</div>
												<Skeleton className="h-3 w-28" />
											</div>
											<Skeleton className="h-3 w-36" />
										</div>
									</div>
								))}
							</div>
						</div>
					</PageCard>
				</div>

				{/* Sidebar */}
				<div className="lg:col-span-4 flex flex-col gap-6">
					{/* Attachments */}
					<PageCard>
						<div className="bg-card border-b border-border px-6 py-3">
							<Skeleton className="h-4 w-24" />
						</div>
						<div className="p-4 flex flex-col gap-3">
							{[1].map((i) => (
								<div
									key={i}
									className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
								>
									<div className="flex items-center gap-3">
										<Skeleton className="size-10 rounded-lg" />
										<div className="flex flex-1 flex-col gap-1">
											<Skeleton className="h-4 w-40" />
											<Skeleton className="h-3 w-20" />
										</div>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<Skeleton className="h-8 rounded-lg" />
										<Skeleton className="h-8 rounded-lg" />
									</div>
								</div>
							))}
						</div>
					</PageCard>
				</div>
			</div>
		</div>
	);
}
