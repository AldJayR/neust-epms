import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { format } from "date-fns";
import { EllipsisVertical, ListFilter, Plus } from "lucide-react";
import { MetricCard } from "@/components/custom/metric-card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchInput } from "@/components/ui/search-input";
import type { AuthUser } from "@/lib/auth";
import {
	type MoaItem,
	moaRepositoryQueryOptions,
} from "@/lib/dashboard.functions";
import { isAdminOrDirector } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui/status-badge";

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

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const metrics = data?.metrics ?? {
		totalMoas: 0,
		expiringWithin90Days: 0,
		activePartnerships: 0,
	};
	const totalPages = Math.ceil(total / limit);
	const showTableHeader =
		items.length > 0 ||
		(search ?? "").trim().length > 0 ||
		(status ?? "").trim().length > 0;

	const columns: DataTableColumnDef<MoaItem>[] = [
		{
			id: "partner",
			header: "Partner Organization",
			headerClassName:
				"w-[320px] px-4 py-2 text-[14px] font-medium text-[#666]",
			cellClassName:
				"px-4 py-3 text-[14px] font-semibold text-[#0a0a0a] text-left",
			cell: ({ row }) => row.original.partnerOrganization,
		},
		{
			id: "dateSigned",
			header: () => <div className="text-center">Date Signed</div>,
			headerClassName:
				"w-[223px] px-4 py-2 text-center text-[14px] font-medium text-[#666]",
			cellClassName: "px-4 py-3 text-center text-[14px] text-[#0a0a0a]",
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
				"w-[255px] px-4 py-2 text-center text-[14px] font-medium text-[#666]",
			cellClassName: "px-4 py-3 text-center text-[14px] text-[#0a0a0a]",
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
				"w-[129px] px-4 py-2 text-center text-[14px] font-medium text-[#666]",
			cell: ({ row }) => (
				<div className="flex justify-center">
					<StatusBadge status={row.original.status} />
				</div>
			),
		},
		{
			id: "actions",
			header: "",
			headerClassName: "w-[50px]",
			cellClassName: "px-4 py-3 text-right",
			cell: () => (
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					aria-label="More actions for MOA"
				>
					<EllipsisVertical className="size-4 text-[#737373]" />
				</Button>
			),
		},
	];

	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between bg-white">
				<h1 className="text-[24px] font-semibold leading-[35px] text-[#11215a]">
					Memoranda of Agreements
				</h1>
				{isAdminOrDirector(user) ? (
					<Button className="flex items-center gap-1.5 rounded-[10px] bg-brand-primary px-[10px] py-2 text-[#fafafa] shadow-sm hover:bg-brand-primary-hover">
						<Plus className="size-4" />
						<span className="text-[14px] font-medium">Create MOA</span>
					</Button>
				) : null}
			</div>

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

			<div className="flex items-center justify-between">
				<SearchInput
					value={search ?? ""}
					onChange={onSearchChange}
					placeholder="Search MOAs"
					ariaLabel="Search MOAs"
					className="max-w-[352px]"
				/>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="outline"
								size="icon"
								className="h-9 w-9 border-[#e5e5e5] bg-white shadow-sm"
								aria-label="Filter MOAs"
							>
								<ListFilter className="size-4 text-[#0a0a0a]" />
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
			</div>

			<div className="overflow-hidden rounded-[12px] border border-[#ebebeb] bg-[#f9f9f9] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
				<div className="bg-white">
					<DataTable
						columns={columns}
						data={items}
						isLoading={isLoading}
						emptyMessage="No MOAs found."
						ariaLabel="Memoranda of Agreements"
						showHeader={showTableHeader}
					/>
				</div>
			</div>

			<PaginationBar
				page={page}
				totalPages={totalPages}
				onPageChange={onPageChange}
				total={total}
				limit={limit}
				isLoading={isLoading}
			/>
		</div>
	);
}
