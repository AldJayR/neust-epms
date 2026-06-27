import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { format } from "date-fns";
import { ListFilter, Plus } from "lucide-react";
import { MetricCard } from "@/components/custom/metric-card";
import { DataTablePage } from "@/components/custom/data-table-page";
import { BrandButton } from "@/components/custom/brand-button";
import { Button } from "@/components/ui/button";
import { type DataTableColumnDef } from "@/components/ui/data-table";
import { createActionsColumn } from "@/components/custom/data-table-columns";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/lib/auth";
import {
	type MoaItem,
	moaRepositoryQueryOptions,
} from "@/lib/dashboard.functions";
import { isAdminOrDirector } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/custom/page-header";

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
	const { data, isLoading } = useQuery(
		moaRepositoryQueryOptions({ page, limit, search, status }),
	);

	const items = data!.items;
	const total = data!.total;
	const metrics = data!.metrics;

	const columns: DataTableColumnDef<MoaItem>[] = [
		{
			id: "partner",
			header: "Partner Organization",
			headerClassName:
				"w-[320px] px-4 py-2 text-sm font-medium text-muted-foreground",
			cellClassName:
				"px-4 py-3 text-sm font-semibold text-foreground text-left",
			cell: ({ row }) => row.original.partnerOrganization,
		},
		{
			id: "dateSigned",
			header: () => <div className="text-center">Date Signed</div>,
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
			header: () => <div className="text-center">Days to Expiry</div>,
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
			header: () => <div className="text-center">Status</div>,
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
					<h1 className="text-xl font-semibold leading-[35px] text-heading">
						Memoranda of Agreements
					</h1>
				}
				actions={
					isAdminOrDirector(user) ? (
						<BrandButton className="flex items-center gap-1.5 px-[10px] py-2 shadow-sm hover:bg-brand-primary-hover">
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
								onValueChange={(val) => onStatusChange(val === "all" ? "" : val)}
							>
								<DropdownMenuRadioItem value="all">
									All Statuses
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="Valid">Valid</DropdownMenuRadioItem>
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
				cardClassName="bg-muted"
			/>
		</div>
	);
}
