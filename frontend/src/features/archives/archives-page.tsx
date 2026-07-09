import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { Archive, EllipsisVertical, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/custom/confirm-dialog";
import { DataTablePage } from "@/components/custom/data-table-page";
import { PageHeader } from "@/components/custom/page-header";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	archivedMoasQueryOptions,
	archivedProjectsQueryOptions,
	archivedProposalsQueryOptions,
	restoreMoaFn,
	restoreProjectFn,
	restoreProposalFn,
} from "@/lib/archives.functions";
import type { AuthUser } from "@/lib/auth";
import { isDirector, isRETChair } from "@/lib/permissions";

interface ArchivesPageProps {
	user?: AuthUser | null;
}

export function ArchivesPage({ user }: ArchivesPageProps) {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<"proposals" | "projects" | "moas">(
		"proposals",
	);

	// Pagination & search state for each tab
	const [proposalPage, setProposalPage] = useState(1);
	const [projectPage, setProjectPage] = useState(1);
	const [moaPage, setMoaPage] = useState(1);

	const [proposalSorting, setProposalSorting] = useState<SortingState>([]);
	const [projectSorting, setProjectSorting] = useState<SortingState>([]);
	const [moaSorting, setMoaSorting] = useState<SortingState>([]);

	// Confirm Dialog state
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [itemToRestore, setItemToRestore] = useState<{
		id: string;
		type: "proposal" | "project" | "moa";
		title: string;
	} | null>(null);

	const limit = 10;

	// Queries
	const proposalsQuery = useQuery(
		archivedProposalsQueryOptions({ page: proposalPage, limit }),
	);
	const projectsQuery = useQuery(
		archivedProjectsQueryOptions({ page: projectPage, limit }),
	);
	const moasQuery = useQuery(
		archivedMoasQueryOptions({ page: moaPage, limit }),
	);

	const canManageMoas = isDirector(user) || isRETChair(user);

	// Mutations
	const restoreProposalMutation = useMutation({
		mutationFn: restoreProposalFn,
		onSuccess: () => {
			toast.success("Proposal restored successfully");
			queryClient.invalidateQueries({ queryKey: ["archives", "proposals"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard", "proposals"] });
		},
		onError: (err: any) => {
			toast.error(err.message || "Failed to restore proposal");
		},
	});

	const restoreProjectMutation = useMutation({
		mutationFn: restoreProjectFn,
		onSuccess: () => {
			toast.success("Project restored successfully");
			queryClient.invalidateQueries({ queryKey: ["archives", "projects"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] });
		},
		onError: (err: any) => {
			toast.error(err.message || "Failed to restore project");
		},
	});

	const restoreMoaMutation = useMutation({
		mutationFn: restoreMoaFn,
		onSuccess: () => {
			toast.success("MOA restored successfully");
			queryClient.invalidateQueries({ queryKey: ["archives", "moas"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard", "moas"] });
		},
		onError: (err: any) => {
			toast.error(err.message || "Failed to restore MOA");
		},
	});

	const handleRestoreClick = (
		id: string,
		type: "proposal" | "project" | "moa",
		title: string,
	) => {
		setItemToRestore({ id, type, title });
		setConfirmOpen(true);
	};

	const handleConfirmRestore = async () => {
		if (!itemToRestore) return;
		const { id, type } = itemToRestore;

		if (type === "proposal") {
			await restoreProposalMutation.mutateAsync({ data: id });
		} else if (type === "project") {
			await restoreProjectMutation.mutateAsync({ data: id });
		} else if (type === "moa") {
			await restoreMoaMutation.mutateAsync({ data: id });
		}
		setConfirmOpen(false);
		setItemToRestore(null);
	};

	// Column definitions
	const proposalColumns: DataTableColumnDef<any>[] = [
		{
			id: "title",
			accessorKey: "title",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Proposal Title" />
			),
			headerClassName:
				"w-[380px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-sm font-semibold text-foreground text-left",
			cell: ({ row }) => row.original.title,
		},
		{
			id: "extensionCategory",
			accessorKey: "extensionCategory",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Category"
					className="justify-center"
				/>
			),
			headerClassName:
				"w-[180px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => row.original.extensionCategory,
		},
		{
			id: "archivedAt",
			accessorKey: "archivedAt",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Archived Date"
					className="justify-center"
				/>
			),
			headerClassName:
				"w-[180px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => (
				<ClientOnly fallback="...">
					{row.original.archivedAt
						? format(new Date(row.original.archivedAt), "MMM dd, yyyy")
						: "-"}
				</ClientOnly>
			),
		},
		{
			id: "actions",
			headerClassName:
				"w-[100px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => {
				const proposal = row.original;
				return (
					<div className="flex items-center justify-end">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button variant="ghost" size="icon" className="size-8" />
								}
							>
								<EllipsisVertical className="size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={() =>
										handleRestoreClick(
											proposal.proposalId,
											"proposal",
											proposal.title,
										)
									}
									className="flex items-center gap-2 cursor-pointer"
								>
									<RotateCcw className="size-4 text-blue-500" />
									<span>Restore Proposal</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];

	const projectColumns: DataTableColumnDef<any>[] = [
		{
			id: "title",
			accessorKey: "title",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Project Title" />
			),
			headerClassName:
				"w-[380px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-sm font-semibold text-foreground text-left",
			cell: ({ row }) => row.original.title,
		},
		{
			id: "status",
			accessorKey: "projectStatus",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Last Status"
					className="justify-center"
				/>
			),
			headerClassName:
				"w-[180px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => <StatusBadge status={row.original.projectStatus} />,
		},
		{
			id: "archivedAt",
			accessorKey: "archivedAt",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Archived Date"
					className="justify-center"
				/>
			),
			headerClassName:
				"w-[180px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => (
				<ClientOnly fallback="...">
					{row.original.archivedAt
						? format(new Date(row.original.archivedAt), "MMM dd, yyyy")
						: "-"}
				</ClientOnly>
			),
		},
		{
			id: "actions",
			headerClassName:
				"w-[100px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => {
				const project = row.original;
				return (
					<div className="flex items-center justify-end">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button variant="ghost" size="icon" className="size-8" />
								}
							>
								<EllipsisVertical className="size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={() =>
										handleRestoreClick(
											project.projectId,
											"project",
											project.title,
										)
									}
									className="flex items-center gap-2 cursor-pointer"
								>
									<RotateCcw className="size-4 text-blue-500" />
									<span>Restore Project</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];

	const moaColumns: DataTableColumnDef<any>[] = [
		{
			id: "partner",
			accessorKey: "partnerId",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Partner ID / Name" />
			),
			headerClassName:
				"w-[380px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-sm font-semibold text-foreground text-left",
			cell: ({ row }) => row.original.partnerId || "Unknown Partner",
		},
		{
			id: "validity",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Validity Range"
					className="justify-center"
				/>
			),
			headerClassName:
				"w-[240px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => (
				<ClientOnly fallback="...">
					{format(new Date(row.original.validFrom), "MM/dd/yyyy")} -{" "}
					{format(new Date(row.original.validUntil), "MM/dd/yyyy")}
				</ClientOnly>
			),
		},
		{
			id: "archivedAt",
			accessorKey: "archivedAt",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Archived Date"
					className="justify-center"
				/>
			),
			headerClassName:
				"w-[180px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => (
				<ClientOnly fallback="...">
					{row.original.archivedAt
						? format(new Date(row.original.archivedAt), "MMM dd, yyyy")
						: "-"}
				</ClientOnly>
			),
		},
		{
			id: "actions",
			headerClassName:
				"w-[100px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => {
				const moa = row.original;
				return (
					<div className="flex items-center justify-end">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button variant="ghost" size="icon" className="size-8" />
								}
							>
								<EllipsisVertical className="size-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={() =>
										handleRestoreClick(moa.moaId, "moa", moa.partnerId || "MOA")
									}
									className="flex items-center gap-2 cursor-pointer"
								>
									<RotateCcw className="size-4 text-blue-500" />
									<span>Restore MOA</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];

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
				onValueChange={(v) => setActiveTab(v as any)}
				className="w-full flex flex-col gap-6"
			>
				<TabsList
					variant="line"
					className="w-full justify-start border-b border-border px-0"
				>
					<TabsTrigger
						value="proposals"
						className="px-4 py-2.5 text-sm font-medium cursor-pointer"
					>
						Proposals
					</TabsTrigger>
					<TabsTrigger
						value="projects"
						className="px-4 py-2.5 text-sm font-medium cursor-pointer"
					>
						Projects
					</TabsTrigger>
					{canManageMoas && (
						<TabsTrigger
							value="moas"
							className="px-4 py-2.5 text-sm font-medium cursor-pointer"
						>
							MOA Repository
						</TabsTrigger>
					)}
				</TabsList>

				<TabsContent value="proposals" className="mt-0">
					<DataTablePage
						columns={proposalColumns}
						data={proposalsQuery.data?.items ?? []}
						total={proposalsQuery.data?.total ?? 0}
						isLoading={proposalsQuery.isLoading}
						page={proposalPage}
						pageSize={limit}
						onPageChange={setProposalPage}
						searchPlaceholder="Search archived proposals..."
						sorting={proposalSorting}
						onSortingChange={setProposalSorting}
						enableSorting
					/>
				</TabsContent>

				<TabsContent value="projects" className="mt-0">
					<DataTablePage
						columns={projectColumns}
						data={projectsQuery.data?.items ?? []}
						total={projectsQuery.data?.total ?? 0}
						isLoading={projectsQuery.isLoading}
						page={projectPage}
						pageSize={limit}
						onPageChange={setProjectPage}
						searchPlaceholder="Search archived projects..."
						sorting={projectSorting}
						onSortingChange={setProjectSorting}
						enableSorting
					/>
				</TabsContent>

				{canManageMoas && (
					<TabsContent value="moas" className="mt-0">
						<DataTablePage
							columns={moaColumns}
							data={moasQuery.data?.items ?? []}
							total={moasQuery.data?.total ?? 0}
							isLoading={moasQuery.isLoading}
							page={moaPage}
							pageSize={limit}
							onPageChange={setMoaPage}
							searchPlaceholder="Search archived MOAs..."
							sorting={moaSorting}
							onSortingChange={setMoaSorting}
							enableSorting
						/>
					</TabsContent>
				)}
			</Tabs>

			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				onConfirm={handleConfirmRestore}
				title={`Restore ${itemToRestore?.type}`}
				description={`Are you sure you want to restore the ${itemToRestore?.type} "${itemToRestore?.title}"? It will be returned to the active repository.`}
				confirmLabel="Restore"
				confirmVariant="default"
			/>
		</div>
	);
}
