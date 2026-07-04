import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pencil, ExternalLink, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { PageCard } from "@/components/custom/page-card";
import { PageHeader } from "@/components/custom/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	moaDetailsQueryOptions,
	moaLinkedProjectsQueryOptions,
	type MoaLinkedProject,
} from "@/lib/moa.functions";
import { isDirector } from "@/lib/permissions";
import type { AuthUser } from "@/lib/auth";
import { EditMoaModal } from "./components/edit-moa-modal";
import { MoaDetailsSkeleton } from "./moa-details-skeleton";

interface MoaDetailsPageProps {
	moaId: string;
	currentUser?: AuthUser | null;
}

export function MoaDetailsPage({ moaId, currentUser }: MoaDetailsPageProps) {
	const [editOpen, setEditOpen] = useState(false);

	const { data: moa, isLoading: moaLoading } = useQuery(
		moaDetailsQueryOptions(moaId),
	);
	const { data: projects, isLoading: projectsLoading } = useQuery(
		moaLinkedProjectsQueryOptions(moaId),
	);

	if (moaLoading) return <MoaDetailsSkeleton />;
	if (!moa) return <div className="py-12 text-center text-muted-foreground">MOA not found.</div>;

	return (
		<div className="flex flex-col gap-6">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink render={<Link to="/dashboard" search={{ page: 1, pageSize: 10 }} />}>
							Dashboard
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink render={<Link to="/moas" search={{ page: 1, limit: 10 }} />}>MOAs</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{moa.partnerName}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<PageHeader
				title={moa.partnerName}
				actions={
					isDirector(currentUser) ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setEditOpen(true)}
						>
							<Pencil className="mr-2 size-4" />
							Edit MOA
						</Button>
					) : null
				}
			/>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				{/* Left column — MOA Information */}
				<div className="lg:col-span-5">
					<PageCard>
						<div className="flex items-center justify-between border-b border-border px-6 py-3">
							<h3 className="text-sm font-medium">MOA Information</h3>
							{isDirector(currentUser) && (
								<Button
									variant="ghost"
									size="icon"
									className="size-8"
									onClick={() => setEditOpen(true)}
								>
									<Pencil className="size-4" />
								</Button>
							)}
						</div>
						<div className="px-6">
							<div className="flex flex-col gap-2 py-4">
								<span className="text-xs text-muted-foreground">Status</span>
								<StatusBadge status={moa.status} />
							</div>
							<Separator />
							<div className="flex flex-col gap-2 py-4">
								<span className="text-xs text-muted-foreground">Partner Organization</span>
								<span className="text-sm font-medium">{moa.partnerName}</span>
							</div>
							<Separator />
							<div className="flex flex-col gap-2 py-4">
								<span className="text-xs text-muted-foreground">Date Signed</span>
								<span className="text-sm font-medium">
									{format(new Date(moa.validFrom), "MMM d, yyyy")}
								</span>
							</div>
							<Separator />
							<div className="flex flex-col gap-2 py-4">
								<span className="text-xs text-muted-foreground">Expiry Date</span>
								<span className="text-sm font-medium">
									{format(new Date(moa.validUntil), "MMM d, yyyy")}
								</span>
							</div>
							{moa.storagePath && (
								<>
									<Separator />
									<div className="flex flex-col gap-2 py-4">
										<span className="text-xs text-muted-foreground">Document</span>
										<a
											href={moa.storagePath}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:underline"
										>
											<ExternalLink className="size-3.5" />
											View PDF
										</a>
									</div>
								</>
							)}
						</div>
					</PageCard>
				</div>

				{/* Right column — Linked Projects */}
				<div className="lg:col-span-7">
					<PageCard>
						<div className="border-b border-border px-6 py-3">
							<h3 className="text-sm font-medium">
								Linked Projects{" "}
								{!projectsLoading && (
									<span className="text-muted-foreground">
										({projects?.length ?? 0})
									</span>
								)}
							</h3>
						</div>
						<div className="flex flex-col gap-3 p-4">
							{projectsLoading ? (
								<div className="flex flex-col gap-3">
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
											<Skeleton className="h-8 w-16" />
										</div>
									))}
								</div>
							) : !projects || projects.length === 0 ? (
								<div className="flex flex-col items-center gap-2 py-8 text-center">
									<FolderOpen className="size-10 text-muted-foreground/50" />
									<p className="text-sm text-muted-foreground">
										No projects linked to this MOA yet.
									</p>
								</div>
							) : (
								projects.map((project: MoaLinkedProject) => (
									<div
										key={project.projectId}
										className="flex items-center justify-between rounded-lg border border-border p-4"
									>
										<div className="flex flex-col gap-1">
											<span className="text-sm font-medium">{project.title}</span>
											<div className="flex items-center gap-3 text-xs text-muted-foreground">
												<StatusBadge status={project.projectStatus} variant="outline" />
												{project.leaderName && (
													<span>Leader: {project.leaderName}</span>
												)}
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											render={
												<Link
													to="/projects/$projectId"
													params={{ projectId: project.projectId }}
												/>
											}
										>
											View
										</Button>
									</div>
								))
							)}
						</div>
					</PageCard>
				</div>
			</div>

			{isDirector(currentUser) && (
				<EditMoaModal
					open={editOpen}
					onOpenChange={setEditOpen}
					moaId={moa.moaId}
					partnerName={moa.partnerName}
					validFrom={moa.validFrom}
					validUntil={moa.validUntil}
				/>
			)}
		</div>
	);
}
