import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { ListFilter, Plus } from "lucide-react";
import { useState } from "react";
import { BrandButton } from "@/components/custom/brand-button";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import { DataTablePage } from "@/components/custom/data-table-page";
import { MetricCard } from "@/components/custom/metric-card";
import { PageHeader } from "@/components/custom/page-header";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AuthUser } from "@/lib/auth";
import {
	type MoaItem,
	moaRepositoryQueryOptions,
} from "@/lib/dashboard.functions";
import { isAdminOrDirector } from "@/lib/permissions";
import { CreateMoaModal } from "./components/create-moa-modal";

interface MoaRepositoryPageProps {
	user?: AuthUser | null;
	page: number;
	limit: number;
	search?: string;
	status?: string;
	onPageChange: (page: number) => void;
	onSearchChange: (search: string) => void;
	onStatusChange: (status: string) => void;
}

export function MoaRepositoryPage({
	user,
	page,
	limit,
	search,
	status,
	onPageChange,
	onSearchChange,
	onStatusChange,
}: MoaRepositoryPageProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	const { data, isLoading } = useQuery(
		moaRepositoryQueryOptions({ page, limit, search, status }),
	);

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const metrics = data?.metrics ?? {
		totalMoas: 0,
		expiringWithin90Days: 0,
		activePartnerships: 0,
	};

	const columns: DataTableColumnDef<MoaItem>[] = [
		{
			id: "partner",
			accessorKey: "partnerOrganization",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Partner Organization" />
			),
			headerClassName:
				"w-[320px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-sm font-semibold text-foreground text-left",
			cell: ({ row }) => row.original.partnerOrganization,
		},
		{
			id: "dateSigned",
			accessorKey: "dateSigned",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Date Signed" className="justify-center" />
			),
			headerClassName:
				"w-[223px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => (
				<ClientOnly fallback="...">
					{format(new Date(row.original.dateSigned), "MMM dd, yyyy")}
				</ClientOnly>
			),
		},
		{
			id: "daysToExpiry",
			accessorKey: "daysToExpiry",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Days to Expiry" className="justify-center" />
			),
			headerClassName:
				"w-[255px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cellClassName: "px-4 py-3 text-center text-sm text-foreground",
			cell: ({ row }) => (
				<>
					{row.original.daysToExpiry}{" "}
					{typeof row.original.daysToExpiry === "number" ? "Days" : ""}
				</>
			),
		},
		{
			id: "status",
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" className="justify-center" />
			),
			headerClassName:
				"w-[129px] px-4 py-2 text-center text-sm font-medium text-muted-foreground",
			cell: ({ row }) => (
				<div className="flex justify-center">
					<StatusBadge status={row.original.status} />
				</div>
			),
		},
		createActionsColumn(),
	];

	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title={
					<h1 className="text-2xl font-semibold text-heading">
						Memoranda of Agreements
					</h1>
				}
				actions={
					isAdminOrDirector(user) ? (
						<BrandButton
							onClick={() => setIsCreateOpen(true)}
							className="flex items-center gap-1.5 px-[10px] py-2 shadow-sm hover:bg-brand-primary-hover"
						>
							<Plus className="size-4" />
							<span className="text-sm font-medium">Create MOA</span>
						</BrandButton>
					) : null
				}
				className="bg-background"
			/>

			<div className="flex items-center gap-6">
				<MetricCard
					label="Total MOAs"
					value={metrics.totalMoas}
					className="flex-1"
				/>
				<MetricCard
					label="Expiring within 90 days"
					value={String(metrics.expiringWithin90Days).padStart(2, "0")}
					className="flex-1"
				/>
				<MetricCard
					label="Active Partnerships"
					value={metrics.activePartnerships}
					className="flex-1"
				/>
			</div>

			<DataTablePage
				columns={columns}
				data={items}
				total={total}
				isLoading={isLoading}
				page={page}
				pageSize={limit}
				onPageChange={onPageChange}
				search={search}
				onSearch={onSearchChange}
				searchPlaceholder="Search MOAs"
				sorting={sorting}
				onSortingChange={setSorting}
				enableSorting
				filters={
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="outline"
									size="icon"
									className="h-9 w-9 border-border bg-background shadow-sm"
									aria-label="Filter MOAs"
								>
									<ListFilter className="size-4 text-foreground" />
								</Button>
							}
						/>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuRadioGroup
								value={status || "all"}
								onValueChange={(val) =>
									onStatusChange(val === "all" ? "" : val)
								}
							>
								<DropdownMenuRadioItem value="all">
									All Statuses
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="Valid">
									Valid
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="Renewal Needed">
									Renewal Needed
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="Expired">
									Expired
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				}
				activeFilters={{ search }}
				emptyMessage="No MOAs found."
				ariaLabel="Memoranda of Agreements"
			/>
			<CreateMoaModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
		</div>
	);
}
