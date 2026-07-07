import { Link, useRouterState } from "@tanstack/react-router";
import { PageCard } from "@/components/custom/page-card";
import { PageHeader } from "@/components/custom/page-header";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuthUser } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";

export function MoaDetailsSkeleton() {
	const user = useRouterState({
		select: (s) => {
			const authMatch = s.matches.find((m) => m.routeId === "/_authenticated");
			return (
				(authMatch?.context as { user: AuthUser | null } | undefined)?.user ??
				null
			);
		},
	});

	const showEdit = isDirector(user);

	return (
		<div className="flex flex-col gap-6">
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
						<BreadcrumbLink
							render={<Link to="/moas" search={{ page: 1, limit: 10 }} />}
						>
							MOAs
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>
							<Skeleton className="h-4 w-24" />
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<PageHeader
				title={<Skeleton className="h-8 w-48 rounded" />}
				actions={showEdit ? <Skeleton className="h-9 w-24 rounded-lg" /> : null}
			/>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				{/* Left column — MOA Info */}
				<div className="lg:col-span-5">
					<PageCard>
						<div className="flex items-center justify-between border-b border-border px-6 py-3">
							<h3 className="text-sm font-medium">MOA Information</h3>
							{showEdit && <Skeleton className="size-8 rounded-md" />}
						</div>
						<div className="divide-y divide-border px-6">
							<div className="flex flex-col gap-2 py-4">
								<span className="text-xs text-muted-foreground">Status</span>
								<Skeleton className="h-6 w-20 rounded-md" />
							</div>
							<div className="flex flex-col gap-2 py-4">
								<span className="text-xs text-muted-foreground">
									Partner Organization
								</span>
								<Skeleton className="h-5 w-48" />
							</div>
							<div className="flex flex-col gap-2 py-4">
								<span className="text-xs text-muted-foreground">
									Date Signed
								</span>
								<Skeleton className="h-5 w-32" />
							</div>
							<div className="flex flex-col gap-2 py-4">
								<span className="text-xs text-muted-foreground">
									Expiry Date
								</span>
								<Skeleton className="h-5 w-32" />
							</div>
						</div>
					</PageCard>
				</div>

				{/* Right column — Linked Projects */}
				<div className="lg:col-span-7">
					<PageCard>
						<div className="border-b border-border px-6 py-3">
							<Skeleton className="h-5 w-40" />
						</div>
						<div className="flex flex-col gap-3 p-4">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="flex items-center justify-between rounded-lg border border-border p-4"
								>
									<div className="flex flex-col gap-2">
										<Skeleton className="h-5 w-56" />
										<div className="flex items-center gap-4">
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-4 w-32" />
										</div>
									</div>
									<Skeleton className="h-8 w-16 rounded-md" />
								</div>
							))}
						</div>
					</PageCard>
				</div>
			</div>
		</div>
	);
}
