import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { format } from "date-fns";
import {
	AlertCircle,
	CheckCircle2,
	EllipsisVertical,
	Plus,
	SlidersHorizontal,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { SearchInput } from "@/components/ui/search-input";
import { MetricCard } from "@/components/custom/metric-card";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AuthUser } from "@/lib/auth";
import { moaRepositoryQueryOptions } from "@/lib/dashboard.functions";

function MoaStatusBadge({ status }: { status: string }) {
	if (status === "Valid") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373] shadow-sm"
			>
				<CheckCircle2 className="size-3 text-green-500" />
				Valid
			</Badge>
		);
	}
	if (status === "Renewal Needed") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373] shadow-sm"
			>
				<AlertCircle className="size-3 text-orange-500" />
				Renewal Needed
			</Badge>
		);
	}
	if (status === "Expired" || status === "Terminated") {
		return (
			<Badge
				variant="secondary"
				className="flex w-fit items-center gap-1 border-[#e5e5e5] bg-white px-2 py-0.5 text-xs font-medium text-[#737373] shadow-sm"
			>
				<XCircle className="size-3 text-red-500" />
				{status}
			</Badge>
		);
	}

	return (
		<Badge variant="outline" className="text-[#737373]">
			{status}
		</Badge>
	);
}



interface MoaRepositoryPageProps {
	user?: AuthUser | null;
	page: number;
	limit: number;
	search?: string;
	status?: string;
	onPageChange: (page: number) => void;
	onSearchChange: (search: string) => void;
}

export function MoaRepositoryPage({
	user,
	page,
	limit,
	search,
	status,
	onPageChange,
	onSearchChange,
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

	const columns: DataTableColumn[] = [
		{ key: "partner", label: "Partner Organization", className: "w-[320px] px-4 py-2 text-[14px] font-medium text-[#666]" },
		{ key: "dateSigned", label: "Date Signed", className: "w-[223px] px-4 py-2 text-center text-[14px] font-medium text-[#666]" },
		{ key: "daysToExpiry", label: "Days to Expiry", className: "w-[255px] px-4 py-2 text-center text-[14px] font-medium text-[#666]" },
		{ key: "status", label: "Status", className: "w-[129px] px-4 py-2 text-center text-[14px] font-medium text-[#666]" },
		{ key: "actions", label: "", className: "w-[50px]" },
	];

	return (
		<div className="flex flex-col gap-8">
				<div className="flex items-center justify-between bg-white">
					<h1 className="text-[24px] font-semibold leading-[35px] text-[#11215a]">
						Memoranda of Agreements
					</h1>
					{user?.roleName === "Director" || user?.roleName === "Super Admin" ? (
						<Button className="flex items-center gap-1.5 rounded-[10px] bg-brand-primary px-[10px] py-2 text-[#fafafa] shadow-sm hover:bg-brand-primary-hover">
							<Plus className="size-4" />
							<span className="text-[14px] font-medium">Create MOA</span>
						</Button>
					) : null}
				</div>

				<div className="flex items-center gap-6">
					<MetricCard label="Total MOAs" value={metrics.totalMoas} className="flex-1" />
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
						value={search}
						onChange={onSearchChange}
						placeholder="Search MOAs"
						ariaLabel="Search MOAs"
						className="max-w-[352px]"
					/>
					<Button
						variant="outline"
						size="icon"
						className="h-9 w-9 border-[#e5e5e5] bg-white shadow-sm"
						aria-label="Filter MOAs"
					>
						<SlidersHorizontal className="size-4 text-[#0a0a0a]" />
					</Button>
				</div>

				<div className="overflow-hidden rounded-[12px] border border-[#ebebeb] bg-[#f9f9f9] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
					<div className="bg-white">
						<DataTable
							columns={columns}
							data={items}
							renderRow={(moa) => (
								<TableRow
									key={moa.id}
									className="border-b border-[#ebebeb] py-2 hover:bg-[#fcfcfc]"
								>
									<TableCell className="px-4 py-3 text-[14px] font-semibold text-[#0a0a0a]">
										{moa.partnerOrganization}
									</TableCell>
									<TableCell className="px-4 py-3 text-center text-[14px] text-[#0a0a0a]">
										<ClientOnly fallback="...">
											{format(new Date(moa.dateSigned), "MMM dd, yyyy")}
										</ClientOnly>
									</TableCell>
									<TableCell className="px-4 py-3 text-center text-[14px] text-[#0a0a0a]">
										{moa.daysToExpiry}{" "}
										{typeof moa.daysToExpiry === "number" ? "Days" : ""}
									</TableCell>
									<TableCell className="px-4 py-3">
										<div className="flex justify-center">
											<MoaStatusBadge status={moa.status} />
										</div>
									</TableCell>
									<TableCell className="px-4 py-3 text-right">
										<Button
											variant="ghost"
											size="icon"
											className="size-8"
											aria-label="More actions for MOA"
										>
											<EllipsisVertical className="size-4 text-[#737373]" />
										</Button>
									</TableCell>
								</TableRow>
							)}
							isLoading={isLoading}
							isEmpty={items.length === 0}
							emptyMessage="No MOAs found."
							colSpan={5}
							ariaLabel="Memoranda of Agreements"
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
	</div>
	);
}
