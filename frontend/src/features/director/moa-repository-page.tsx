import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { format } from "date-fns";
import {
	AlertCircle,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	EllipsisVertical,
	Loader2,
	Plus,
	Search,
	SlidersHorizontal,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
} from "@/components/ui/pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { AuthUser } from "@/lib/auth";
import { moaRepositoryQueryOptions } from "@/lib/dashboard.functions";
import { AppShell } from "../layout/app-shell";

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

function MetricCard({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="flex h-[104px] flex-1 flex-col gap-4 overflow-hidden rounded-[12px] border border-[#ebebeb] bg-white p-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">
			<p className="text-[14px] leading-4 text-[#666]">{label}</p>
			<p className="text-[36px] font-semibold leading-9 text-[#11215a]">
				{value}
			</p>
		</div>
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

	return (
		<AppShell>
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
					<MetricCard label="Total MOAs" value={metrics.totalMoas} />
					<MetricCard
						label="Expiring within 90 days"
						value={String(metrics.expiringWithin90Days).padStart(2, "0")}
					/>
					<MetricCard
						label="Active Partnerships"
						value={metrics.activePartnerships}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="relative w-full max-w-[352px]">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
						<Input
							placeholder="Search MOAs"
							aria-label="Search MOAs"
							className="h-9 rounded-lg border-[#e5e5e5] bg-white pl-9 shadow-none placeholder:text-[#737373]"
							value={search}
							onChange={(e) => onSearchChange(e.target.value)}
						/>
					</div>
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
						<Table aria-label="Memoranda of Agreements">
							<TableHeader>
								<TableRow className="border-b border-[#ebebeb] hover:bg-transparent">
									<TableHead className="w-[320px] px-4 py-2 text-[14px] font-medium text-[#666]">
										Partner Organization
									</TableHead>
									<TableHead className="w-[223px] px-4 py-2 text-center text-[14px] font-medium text-[#666]">
										Date Signed
									</TableHead>
									<TableHead className="w-[255px] px-4 py-2 text-center text-[14px] font-medium text-[#666]">
										Days to Expiry
									</TableHead>
									<TableHead className="w-[129px] px-4 py-2 text-center text-[14px] font-medium text-[#666]">
										Status
									</TableHead>
									<TableHead className="w-[50px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading ? (
									<TableRow>
										<TableCell colSpan={5} className="h-24 text-center">
											<Loader2 className="mx-auto size-6 animate-spin text-[#11215a]" role="status" aria-label="Loading MOAs" />
										</TableCell>
									</TableRow>
								) : items.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="h-24 text-center text-muted-foreground"
										>
											No MOAs found.
										</TableCell>
									</TableRow>
								) : (
									items.map((moa) => (
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
												<Button variant="ghost" size="icon" className="size-8" aria-label="More actions for MOA">
													<EllipsisVertical className="size-4 text-[#737373]" />
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</div>

				<div className="flex items-center justify-between pt-4">
					<p className="text-[12px] text-[#666]">
						Showing <span className="font-bold">{items.length}</span> of{" "}
						<span className="font-bold">{total}</span> results
					</p>

					{totalPages > 1 && (
						<Pagination className="w-auto mx-0">
							<PaginationContent className="gap-1">
								<PaginationItem>
									<Button
										variant="ghost"
										size="sm"
										className="gap-1 pl-2.5 text-[14px] font-medium text-[#0a0a0a] hover:bg-transparent"
										onClick={() => onPageChange(page - 1)}
										disabled={page <= 1}
									>
										<ChevronLeft className="size-4" />
										<span>Previous</span>
									</Button>
								</PaginationItem>

								<PaginationItem>
									<PaginationLink
										isActive={page === 1}
										onClick={() => onPageChange(1)}
										className={
											page === 1
												? "border-[#e5e5e5] bg-white text-[14px] font-medium text-[#0a0a0a] shadow-sm"
												: "border-transparent text-[14px] font-medium text-[#0a0a0a] hover:bg-transparent"
										}
									>
										1
									</PaginationLink>
								</PaginationItem>

								{totalPages > 1 && (
									<PaginationItem>
										<PaginationLink
											isActive={page === 2}
											onClick={() => onPageChange(2)}
											className={
												page === 2
													? "border-[#e5e5e5] bg-white text-[14px] font-medium text-[#0a0a0a] shadow-sm"
													: "border-transparent text-[14px] font-medium text-[#0a0a0a] hover:bg-transparent"
											}
										>
											2
										</PaginationLink>
									</PaginationItem>
								)}

								{totalPages > 2 && (
									<PaginationItem>
										<PaginationLink
											isActive={page === 3}
											onClick={() => onPageChange(3)}
											className={
												page === 3
													? "border-[#e5e5e5] bg-white text-[14px] font-medium text-[#0a0a0a] shadow-sm"
													: "border-transparent text-[14px] font-medium text-[#0a0a0a] hover:bg-transparent"
											}
										>
											3
										</PaginationLink>
									</PaginationItem>
								)}

								{totalPages > 3 && (
									<PaginationItem>
										<PaginationEllipsis />
									</PaginationItem>
								)}

								<PaginationItem>
									<Button
										variant="ghost"
										size="sm"
										className="gap-1 pr-2.5 text-[14px] font-medium text-[#0a0a0a] hover:bg-transparent"
										onClick={() => onPageChange(page + 1)}
										disabled={page >= totalPages}
									>
										<span>Next</span>
										<ChevronRight className="size-4" />
									</Button>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					)}
				</div>
			</div>
		</AppShell>
	);
}
