import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { Archive } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { PageHeader } from "@/components/custom/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthUser } from "@/lib/auth";
import { isDirector, isRETChair } from "@/lib/permissions";
import {
	archivedMoasQueryOptions,
	archivedProjectsQueryOptions,
	archivedProposalsQueryOptions,
} from "./functions";
import { ArchivedMoasTable } from "./components/archived-moas-table";
import { ArchivedProjectsTable } from "./components/archived-projects-table";
import { ArchivedProposalsTable } from "./components/archived-proposals-table";
import { useArchiveRestore } from "./hooks/use-archive-restore";

interface ArchivesPageProps {
	user?: AuthUser | null;
}

export function ArchivesPage({ user }: ArchivesPageProps) {
	const [activeTab, setActiveTab] = useState<"proposals" | "projects" | "moas">(
		"proposals",
	);
	const [proposalPage, setProposalPage] = useState(1);
	const [projectPage, setProjectPage] = useState(1);
	const [moaPage, setMoaPage] = useState(1);
	const [proposalSorting, setProposalSorting] = useState<SortingState>([]);
	const [projectSorting, setProjectSorting] = useState<SortingState>([]);
	const [moaSorting, setMoaSorting] = useState<SortingState>([]);
	const limit = 10;

	const proposalsQuery = useQuery(
		archivedProposalsQueryOptions({ page: proposalPage, limit }),
	);
	const projectsQuery = useQuery(
		archivedProjectsQueryOptions({ page: projectPage, limit }),
	);
	const moasQuery = useQuery(archivedMoasQueryOptions({ page: moaPage, limit }));
	const canManageMoas = isDirector(user) || isRETChair(user);
	const restore = useArchiveRestore();

	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title={
					<div className="flex flex-col gap-1">
						<div className="flex items-center gap-2.5">
							<Archive className="size-6 text-brand-primary" />
							<h1 className="text-2xl font-semibold text-heading">
								Compliance Archives
							</h1>
						</div>
						<p className="text-sm text-muted-foreground">
							Manage and recover archived proposals, projects, and partner MOAs.
						</p>
					</div>
				}
				className="bg-background"
			/>

			<Tabs
				value={activeTab}
				onValueChange={(value) => {
					if (value === "proposals" || value === "projects" || value === "moas") {
						setActiveTab(value);
					}
				}}
				className="w-full flex flex-col gap-6"
			>
				<TabsList
					variant="line"
					className="w-full justify-start border-b border-border px-0"
				>
					<TabsTrigger value="proposals" className="px-4 py-2.5 text-sm font-medium cursor-pointer">
						Proposals
					</TabsTrigger>
					<TabsTrigger value="projects" className="px-4 py-2.5 text-sm font-medium cursor-pointer">
						Projects
					</TabsTrigger>
					{canManageMoas && (
						<TabsTrigger value="moas" className="px-4 py-2.5 text-sm font-medium cursor-pointer">
							MOA Repository
						</TabsTrigger>
					)}
				</TabsList>

				<TabsContent value="proposals" className="mt-0">
					<ArchivedProposalsTable
						data={proposalsQuery.data?.items ?? []}
						total={proposalsQuery.data?.total ?? 0}
						isLoading={proposalsQuery.isLoading}
						page={proposalPage}
						onPageChange={setProposalPage}
						sorting={proposalSorting}
						onSortingChange={setProposalSorting}
						onRestore={(id, title) =>
							restore.handleRestoreClick(id, "proposal", title)
						}
					/>
				</TabsContent>

				<TabsContent value="projects" className="mt-0">
					<ArchivedProjectsTable
						data={projectsQuery.data?.items ?? []}
						total={projectsQuery.data?.total ?? 0}
						isLoading={projectsQuery.isLoading}
						page={projectPage}
						onPageChange={setProjectPage}
						sorting={projectSorting}
						onSortingChange={setProjectSorting}
						onRestore={(id, title) =>
							restore.handleRestoreClick(id, "project", title)
						}
					/>
				</TabsContent>

				{canManageMoas && (
					<TabsContent value="moas" className="mt-0">
						<ArchivedMoasTable
							data={moasQuery.data?.items ?? []}
							total={moasQuery.data?.total ?? 0}
							isLoading={moasQuery.isLoading}
							page={moaPage}
							onPageChange={setMoaPage}
							sorting={moaSorting}
							onSortingChange={setMoaSorting}
							onRestore={(id, title) => restore.handleRestoreClick(id, "moa", title)}
						/>
					</TabsContent>
				)}
			</Tabs>

			<ConfirmDialog
				open={restore.confirmOpen}
				onOpenChange={restore.setConfirmOpen}
				onConfirm={restore.handleConfirmRestore}
				title={`Restore ${restore.itemToRestore?.type}`}
				description={`Are you sure you want to restore the ${restore.itemToRestore?.type} "${restore.itemToRestore?.title}"? It will be returned to the active repository.`}
				confirmLabel="Restore"
				confirmVariant="default"
			/>
		</div>
	);
}
